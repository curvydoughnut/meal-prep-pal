import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEMS: Record<string, string> = {
  plan: `You are a friendly AI meal-prep coach. Build practical weekly meal plans tailored to the user's diet, time, budget, and goals. When you produce a plan, structure it clearly with:
- A short intro
- Day-by-day meals (Mon–Sun) with calories/macros estimates when relevant
- A consolidated grocery shopping list grouped by aisle (produce, protein, pantry, dairy)
- Quick prep tips
Use Markdown with headings, bold, and bullet lists. Ask one clarifying question only if essential.`,
  recipe: `You are a creative AI recipe generator focused on meal-prep friendly dishes. Given ingredients, dietary preferences, or a craving, return:
- A catchy recipe title
- Servings and total time
- Ingredient list with quantities
- Numbered step-by-step instructions
- Storage & reheating tips for meal prep
Use clean Markdown.`,
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          mode?: "plan" | "recipe";
        };
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
        const mode = body.mode === "recipe" ? "recipe" : "plan";

        const result = streamText({
          model,
          system: SYSTEMS[mode],
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
