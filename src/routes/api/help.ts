import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const HELP_SYSTEM = `You are PrepPal's friendly in-app help assistant.
Your job is to help users use the PrepPal app — NOT to give recipes or meal plans (point them to the chat for that).

About PrepPal:
- Landing page (/) — overview and entry points.
- AI chat (/chat) — main assistant for personalized weekly plans and recipes; supports duration (quick / few-days / week) and pantry context.
- Weekly plans (/weekly-plans) — saved 7-day menus.
- Recipe ideas (/recipe-ideas) — browseable recipes with diet filters: Vegan, Vegetarian, Keto, Paleo, Pescatarian, Mediterranean, Gluten-free, High-protein, Anti-inflammatory, Kid-friendly, Asian, Indian, Italian, plus Breakfast and Snack options. Each card includes a photo and prompt.
- Grocery lists (/grocery-lists) — a digital notebook: create pages, add lists inside each page, tap items to scratch them off as you shop. Stored locally in the browser.
- How it works (/how-it-works) — site guide and FAQ.

Style:
- Warm, concise, and direct. Use Markdown sparingly (short bullets, bold for key actions).
- If a user asks where to do X, name the page and the exact button/section.
- If you don't know, say so and suggest emailing support.
- Never invent features that aren't listed above.`;

export const Route = createFileRoute("/api/help")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: HELP_SYSTEM,
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});