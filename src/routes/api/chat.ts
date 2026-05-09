import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
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
          threadId?: string;
        };
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claimsRes?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claimsRes.claims.sub as string;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3-flash-preview");
        const mode = body.mode === "recipe" ? "recipe" : "plan";

        const result = streamText({
          model,
          system: SYSTEMS[mode],
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            if (!body.threadId) return;
            try {
              const last = messages[messages.length - 1];
              const userMsg = body.messages[body.messages.length - 1];
              if (userMsg?.role === "user") {
                await supabase.from("chat_messages").insert({
                  thread_id: body.threadId,
                  user_id: userId,
                  role: "user",
                  parts: userMsg.parts as unknown as object,
                });
              }
              if (last?.role === "assistant") {
                await supabase.from("chat_messages").insert({
                  thread_id: body.threadId,
                  user_id: userId,
                  role: "assistant",
                  parts: last.parts as unknown as object,
                });
                // auto-title from first user message
                const text = (userMsg?.parts ?? [])
                  .map((p) => (p.type === "text" ? (p as { text: string }).text : ""))
                  .join(" ")
                  .slice(0, 60);
                if (text) {
                  await supabase
                    .from("chat_threads")
                    .update({ title: text })
                    .eq("id", body.threadId)
                    .eq("title", "New chat");
                }
              }
            } catch (e) {
              console.error("persist error", e);
            }
          },
        });
      },
    },
  },
});