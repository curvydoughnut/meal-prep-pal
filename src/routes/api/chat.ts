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
You are a CONVERSATIONAL assistant first. Talk like a friendly human cook.
- If the user is greeting, asking a question, giving feedback, or chatting, just reply in plain Markdown — DO NOT call any tools.
- If the request is vague (no protein/diet/time/servings/budget/equipment), ask 1–2 short clarifying questions BEFORE generating a plan or recipe. Do not call tools yet.
- Only generate a full plan/recipe (and call tools) once you have enough to make something the user will actually want.
- Acknowledge follow-ups naturally: "swap chicken for tofu", "make it spicier", "I don't have a blender" — adjust and explain, re-running tools only if the dish or shopping list materially changes.
- Keep replies concise. Use Markdown for structure, not walls of text.`;

const SYSTEMS: Record<string, (d: Duration) => string> = {
  plan: (d) => `You are PrepPal, a friendly AI meal-prep coach who chats with the user and builds practical weekly meal plans.
${DURATION_HINT[d]}
${CONVERSATION_RULES}

When (and only when) you are actually generating a plan:
1. First call \`generateMealImage\` with a short visual description of the hero dish.
2. Then call \`setShoppingList\` with the FULL grocery list grouped by aisle, EXCLUDING pantry items the user already has. Quantities reflect what they still need to buy.
3. Then respond in clean Markdown:
   - Short intro
   - Day-by-day meals (with calorie/macro estimates when relevant)
   - Note which pantry items you reused
   - Prep & storage tips matched to the chosen duration
   (Do NOT repeat the full shopping list in markdown — the UI renders it from \`setShoppingList\`.)`,

  recipe: (d) => `You are PrepPal, a creative AI recipe generator focused on meal-prep friendly dishes who also chats with the user.
${DURATION_HINT[d]}
${CONVERSATION_RULES}

When (and only when) you are actually generating a recipe:
1. First call \`generateMealImage\` with a vivid 1–2 sentence visual description of the finished dish.
2. If the user is missing ingredients, call \`setShoppingList\` with what they need to buy (grouped by aisle), excluding pantry items.
3. Then respond in this exact Markdown structure:
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
