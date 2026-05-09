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

const SYSTEMS: Record<string, (d: Duration) => string> = {
  plan: (d) => `You are PrepPal, a friendly AI meal-prep coach. Build practical weekly meal plans tailored to the user's diet, time, budget, and goals.
${DURATION_HINT[d]}

ALWAYS call the \`generateMealImage\` tool FIRST with a short visual description of the hero dish before writing the plan.

Then respond in clean Markdown with:
- A short intro
- Day-by-day meals (with calorie/macro estimates when relevant)
- A consolidated grocery list grouped by aisle (produce, protein, pantry, dairy)
- Prep & storage tips appropriate for the chosen duration`,

  recipe: (d) => `You are PrepPal, a creative AI recipe generator focused on meal-prep friendly dishes.
${DURATION_HINT[d]}

ALWAYS call the \`generateMealImage\` tool FIRST with a short, vivid visual description of the finished dish (plating, colors, lighting) before writing anything else.

Then respond in clean Markdown with this exact structure:
## {Catchy dish name}
**Servings:** X · **Total time:** X min

### Ingredients
- bullet list with quantities

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
        };
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
        const mode = body.mode === "recipe" ? "recipe" : "plan";
        const duration: Duration = body.duration ?? "few-days";

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
        };

        const result = streamText({
          model,
          system: SYSTEMS[mode](duration),
          tools,
          stopWhen: stepCountIs(50),
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
