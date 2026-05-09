import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChefHat, Plus, Send, Trash2, Loader2, LogOut, CalendarDays, UtensilsCrossed, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listThreads, createThread, deleteThread, getThreadMessages } from "@/lib/threads.functions";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "Chat — PrepPal" }] }),
});

type Mode = "plan" | "recipe";

const SUGGESTIONS: Record<Mode, string[]> = {
  plan: [
    "Build a 7-day high-protein plan, ~2200 kcal, no pork, $80 budget.",
    "Vegetarian Mediterranean week for 2, fast lunches under 15 min.",
    "Cutting plan: 1800 kcal, 180g protein, 5 dinners I can prep on Sunday.",
  ],
  recipe: [
    "Meal-prep recipe with chicken thighs, sweet potato, and broccoli.",
    "High-protein vegan bowl I can make 4 servings of.",
    "Use up: salmon, rice, cucumber, ginger.",
  ],
};

function ChatPage() {
  const navigate = useNavigate();
  const { user, loading, signOut, session } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("plan");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreads(),
    enabled: !!user,
  });

  // Load messages whenever active thread changes
  useEffect(() => {
    if (!activeId) {
      setInitialMessages([]);
      return;
    }
    setLoadingMessages(true);
    getThreadMessages({ data: { threadId: activeId } })
      .then((rows) => {
        setInitialMessages(
          rows.map((r) => ({ id: r.id, role: r.role, parts: r.parts as UIMessage["parts"] }) as UIMessage),
        );
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        }),
        body: () => ({ mode, threadId: activeId }),
      }),
    [session?.access_token, mode, activeId],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeId ?? "empty",
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  const isLoading = status === "submitted" || status === "streaming";
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  async function ensureThread(): Promise<string> {
    if (activeId) return activeId;
    const t = await createThread({ data: { mode } });
    qc.invalidateQueries({ queryKey: ["threads"] });
    setActiveId(t.id);
    return t.id;
  }

  async function send(text: string) {
    if (!text.trim() || isLoading) return;
    const id = await ensureThread();
    setInput("");
    await sendMessage({ text }, { body: { mode, threadId: id } });
    setTimeout(() => qc.invalidateQueries({ queryKey: ["threads"] }), 800);
  }

  async function newChat() {
    setActiveId(null);
    setMessages([]);
  }

  async function removeThread(id: string) {
    await deleteThread({ data: { id } });
    if (activeId === id) newChat();
    qc.invalidateQueries({ queryKey: ["threads"] });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="h-4 w-4" />
          </div>
          <span className="font-semibold">PrepPal</span>
        </div>
        <div className="px-3">
          <Button onClick={newChat} className="w-full" variant="default">
            <Plus className="mr-2 h-4 w-4" /> New chat
          </Button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent</div>
          {threadsQ.data?.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No chats yet.</p>
          )}
          {threadsQ.data?.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                "group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                activeId === t.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <span className="truncate">{t.title}</span>
              <Trash2
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeThread(t.id);
                }}
                className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              />
            </button>
          ))}
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            <ModeBtn active={mode === "plan"} onClick={() => setMode("plan")} icon={<CalendarDays className="h-3.5 w-3.5" />}>
              Weekly plan
            </ModeBtn>
            <ModeBtn active={mode === "recipe"} onClick={() => setMode("recipe")} icon={<UtensilsCrossed className="h-3.5 w-3.5" />}>
              Recipe
            </ModeBtn>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="md:hidden">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {loadingMessages ? (
              <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <Empty mode={mode} onPick={send} />
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <Bubble key={m.id} message={m} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <Bubble message={{ id: "typing", role: "assistant", parts: [{ type: "text", text: "…" }] } as UIMessage} typing />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-card/50 px-4 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-ring"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              autoFocus
              placeholder={mode === "plan" ? "Tell me about your goals, diet, time…" : "What ingredients or craving?"}
              className="min-h-[48px] max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-10 w-10 shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Estimates only. Always check with a professional for medical or dietary needs.
          </p>
        </div>
      </main>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Empty({ mode, onPick }: { mode: Mode; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">
        {mode === "plan" ? "Plan your week" : "Cook something great"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {mode === "plan"
          ? "Tell me your goals, diet, and how much time you have. I'll build a meal plan + grocery list."
          : "Share ingredients or a craving. I'll generate a meal-prep-friendly recipe with storage tips."}
      </p>
      <div className="mt-8 grid w-full max-w-xl gap-2">
        {SUGGESTIONS[mode].map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground/80 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-soft)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, typing }: { message: UIMessage; typing?: boolean }) {
  const isUser = message.role === "user";
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-hero)] text-primary-foreground">
          <ChefHat className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-soft)]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border border-border",
        )}
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <Dot /><Dot delay={0.15} /><Dot delay={0.3} />
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}