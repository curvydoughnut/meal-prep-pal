import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type Duration = "quick" | "few-days" | "week";

const DURATION_HINT: Record<Duration, string> = {
  quick: "The user wants something they can cook in about 30 minutes. Keep prep + cook ≤ 30 min, minimal equipment, single serving or two servings.",
  "few-days": "The user wants meal-prep that lasts 3–4 days. Provide ~4 servings, batch-friendly steps, and clear refrigerator storage instructions (containers, days).",
  week: "The user wants a meal-prep that lasts a full week (5–7 days). Provide ~6–7 servings, batch-cook strategy, freezer + fridge storage tips, and reheating instructions.",
};

const CONVERSATION_RULES = `
You are a friendly cook who CHATS with the user AND produces real recipes/plans.
- If the user is just greeting or asking a small question, reply briefly in Markdown — no tools.
- If the user asks for a meal, recipe, or plan, FIRST check whether they've told you (a) their budget and (b) how many people it should serve.
  • If EITHER is missing, do NOT generate yet and do NOT call any tools. Reply with a short, friendly message asking ONLY for the missing piece(s) — budget (e.g. "around $20?") and/or servings ("just you, or feeding how many?"). Keep it to 1–2 sentences, no recipe, no image.
  • Once both budget and servings are known (from this message or earlier in the conversation), GENERATE the full recipe/plan immediately — do not ask more clarifying questions, just make reasonable defaults for anything else and mention them.
- Follow-ups like "swap chicken for tofu" or "make it spicier" — adjust the recipe and re-emit the full updated recipe (and re-run the image/shopping tools if the dish or list materially changes).
- Keep prose concise; use Markdown structure, not walls of text.

CRITICAL: Whenever you DO generate a recipe or plan, you MUST do BOTH:
  (a) call the image tool, AND
  (b) write out the full recipe/plan text in Markdown in the same response — including the FULL ingredients list AND the full numbered step-by-step instructions.
An image alone is NEVER a complete answer. A bare ingredients list is NEVER a complete answer. The user always wants ingredients + step-by-step recipe together.`;

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
1. numbered steps, concise and clear

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

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
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
