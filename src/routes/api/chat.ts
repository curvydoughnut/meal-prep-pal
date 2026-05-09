import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createAnthropic } from "@ai-sdk/anthropic";

type Duration = "quick" | "few-days" | "week";

const DURATION_HINT: Record<Duration, string> = {
  quick: "The user wants something they can cook in about 30 minutes. Keep prep + cook ≤ 30 min, minimal equipment, single serving or two servings.",
  "few-days": "The user wants meal-prep that lasts 3–4 days. Provide ~4 servings, batch-friendly steps, and clear refrigerator storage instructions (containers, days).",
  week: "The user wants a meal-prep that lasts a full week (5–7 days). Provide ~6–7 servings, batch-cook strategy, freezer + fridge storage tips, and reheating instructions.",
};

const CONVERSATION_RULES = `
You are a friendly cook who CHATS with the user like a real person AND produces real recipes/plans when asked.
- ALWAYS engage conversationally. If the user asks a question (e.g. "what goes well with salmon?", "is this enough protein?", "can I sub butter for oil?"), ANSWER it directly in plain Markdown — no tools, no recipe, just a real answer.
- If the user offers a suggestion or opinion ("I think we should add lemon", "what about Thai-style instead?"), acknowledge it, react to it ("ooh good call" / "hmm, that might clash because…"), and then either incorporate it or explain trade-offs. Don't ignore it and don't immediately dump a new recipe.
- Brainstorming, swaps, substitutions, technique questions, nutrition questions, equipment questions → just chat. Only generate a full recipe/plan when the user clearly asks for one ("give me a recipe", "make me a plan", "build it", clicking a suggestion card, etc.).
- If the user asks for ANY meal, dish, or recipe ("give me a pasta recipe", "I want tacos", "something with chicken", etc.), GENERATE IMMEDIATELY — do NOT ask clarifying questions first. Assume sensible defaults: 2 servings and a modest budget (~$15–20) unless the user specified otherwise. Mention the assumed servings/budget briefly in the intro so they can adjust.
- Follow-ups like "swap chicken for tofu" or "make it spicier" — adjust the recipe and re-emit the full updated recipe (and re-run the image/shopping tools if the dish or list materially changes).
- Keep prose concise and warm; use Markdown structure, not walls of text. Sound like a friend in the kitchen, not a form.

CRITICAL — every recipe response MUST include ALL THREE in the same reply, no exceptions:
  (a) Call \`generateMealImage\` once with a vivid description of the finished dish.
  (b) The FULL ingredients list with quantities.
  (c) The FULL numbered step-by-step cooking instructions.
Never send just an image. Never send just ingredients. Never send just steps. All three together, every single time the user asks for a meal.`;

const SYSTEMS: Record<string, (d: Duration) => string> = {
  plan: (d) => `You are PrepPal, a friendly AI meal-prep coach who chats with the user and builds practical weekly meal plans.
${DURATION_HINT[d]}
${CONVERSATION_RULES}

When generating a plan, do ALL of the following in one response:
1. Call \`generateMealImage\` with a short visual description of the hero dish.
2. Call \`setShoppingList\` with the FULL grocery list grouped by aisle, EXCLUDING pantry items the user already has.
3. AFTER the tool calls, write the full plan in Markdown:
   - Short intro
   - Day-by-day meals with ingredients per meal and calorie/macro estimates when relevant
   - Quick prep instructions for batch cooking
   - Note which pantry items you reused
   - Storage & reheating tips matched to the chosen duration
   (Do NOT repeat the shopping list in markdown — the UI renders it from \`setShoppingList\`. But every meal must list its ingredients and steps.)`,

  recipe: (d) => `You are PrepPal, a creative AI recipe generator focused on meal-prep friendly dishes who also chats with the user.
${DURATION_HINT[d]}
${CONVERSATION_RULES}

When generating a recipe, do ALL of the following in one response:
1. Call \`generateMealImage\` with a vivid 1–2 sentence visual description of the finished dish.
2. If the user needs to buy ingredients, call \`setShoppingList\` with what they need (grouped by aisle), excluding pantry items.
3. AFTER the tool calls, write the FULL recipe in this exact Markdown structure (this is required — never skip it):
## {Catchy dish name}
**Servings:** X · **Total time:** X min

### Ingredients
- bullet list with quantities (mark pantry items with "(have)")

### Step-by-step
1. numbered cooking steps, concise and clear — this section is REQUIRED and must always appear directly after the Ingredients section. Never end a recipe at the ingredients list.

### Storage & reheating
- Tips matched to the requested duration`,
};

async function generateMealImageBase64(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: `Photorealistic, appetizing food photography, top-down or 3/4 angle, soft natural lighting, shallow depth of field, on a clean rustic surface. Subject: ${prompt}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("image gen failed", res.status, await res.text());
      return null;
    }
    const json = await res.json() as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    };
    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url ?? null;
  } catch (e) {
    console.error("image gen error", e);
    return null;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          mode?: "plan" | "recipe";
          duration?: Duration;
          pantry?: string[];
        };
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return new Response("Missing ANTHROPIC_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey);
        const anthropic = createAnthropic({ apiKey: anthropicKey });
        // Claude powers all chat replies — detailed, conversational answers for recipes & variations.
        const model = anthropic("claude-sonnet-4-5");
        const mode = body.mode === "recipe" ? "recipe" : "plan";
        const duration: Duration = body.duration ?? "few-days";
        const pantry = Array.isArray(body.pantry) ? body.pantry.filter(Boolean) : [];
        const pantryNote = pantry.length
          ? `\n\nPantry context — the user ALREADY HAS these ingredients on hand. Do not add them to the shopping list and reduce quantities accordingly:\n- ${pantry.join("\n- ")}`
          : "\n\nPantry context: the user has not listed any pantry items.";

        const tools = {
          generateMealImage: tool({
            description: "Generate a photorealistic image of the finished meal/dish. Call this once at the start of every response.",
            inputSchema: z.object({
              prompt: z.string().describe("A vivid 1–2 sentence visual description of the finished dish."),
            }),
            execute: async ({ prompt }) => {
              const dataUrl = await generateMealImageBase64(apiKey, prompt);
              if (!dataUrl) return { success: false as const, error: "Image generation failed." };
              return { success: true as const, image: dataUrl, prompt };
            },
          }),
          setShoppingList: tool({
            description: "Emit the structured shopping list the user still needs to buy, grouped by aisle. Exclude pantry items.",
            inputSchema: z.object({
              title: z.string().describe("Short title, e.g. 'Weekly grocery list'."),
              groups: z.array(
                z.object({
                  aisle: z.string().describe("Aisle name: Produce, Protein, Pantry, Dairy, Frozen, Other."),
                  items: z.array(
                    z.object({
                      name: z.string(),
                      qty: z.string().optional().describe("Quantity, e.g. '2 lbs' or '1 bunch'."),
                      note: z.string().optional(),
                    }),
                  ),
                }),
              ),
            }),
            execute: async (input) => ({ success: true as const, ...input }),
          }),
        };

        const result = streamText({
          model,
          system: SYSTEMS[mode](duration) + pantryNote,
          tools,
          stopWhen: stepCountIs(50),
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
