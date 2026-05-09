import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChefHat, Plus, Send, Trash2, Loader2, CalendarDays, UtensilsCrossed, Sparkles, Timer, CalendarRange, Calendar, ShoppingBasket, X, Package, BookOpen, BookmarkPlus, BookmarkCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listThreads,
  createThread,
  deleteThread,
  getMessages,
  setMessages as persistMessages,
  subscribe,
  getPantry,
  addPantryItem,
  removePantryItem,
  isChecked,
  toggleChecked,
  saveRecipe,
  deleteRecipe,
  toggleFavorite,
  findRecipeBySource,
  type Mode,
  type ThreadMeta,
} from "@/lib/threads-store";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "Chat — PrepPal" }] }),
});

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

type Duration = "quick" | "few-days" | "week";
const DURATION_LABELS: Record<Duration, { label: string; icon: React.ReactNode }> = {
  quick: { label: "30 min", icon: <Timer className="h-3.5 w-3.5" /> },
  "few-days": { label: "Few days", icon: <CalendarRange className="h-3.5 w-3.5" /> },
  week: { label: "A week", icon: <Calendar className="h-3.5 w-3.5" /> },
};

const EMPTY_THREADS: ThreadMeta[] = [];
const EMPTY_PANTRY: string[] = [];

function useThreads() {
  return useSyncExternalStore(subscribe, listThreads, () => EMPTY_THREADS);
}

function usePantry() {
  return useSyncExternalStore(subscribe, getPantry, () => EMPTY_PANTRY);
}

function ChatPage() {
  const threads = useThreads();
  const pantry = usePantry();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("plan");
  const [duration, setDuration] = useState<Duration>("few-days");
  const [pantryOpen, setPantryOpen] = useState(false);

  const initialMessages = useMemo<UIMessage[]>(
    () => (activeId ? getMessages(activeId) : []),
    [activeId],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: () => ({ mode, duration, pantry: getPantry() }) }),
    [mode, duration],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: activeId ?? "empty",
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  // Persist messages whenever they change (and not actively streaming half-state)
  useEffect(() => {
    if (!activeId) return;
    persistMessages(activeId, messages);
  }, [messages, activeId]);

  const isLoading = status === "submitted" || status === "streaming";
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  function ensureThread(text: string): string {
    if (activeId) return activeId;
    const title = text.slice(0, 60) || "New chat";
    const t = createThread(mode, title);
    setActiveId(t.id);
    return t.id;
  }

  async function send(text: string) {
    if (!text.trim() || isLoading) return;
    ensureThread(text);
    setInput("");
    await sendMessage({ text }, { body: { mode, duration, pantry: getPantry() } });
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
  }

  function removeThread(id: string) {
    deleteThread(id);
    if (activeId === id) newChat();
  }

  return (
    <div className="flex h-screen bg-background">
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
        <div className="mt-2 px-3">
          <Link
            to="/recipes"
            className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent"
          >
            <BookOpen className="h-4 w-4" /> My recipe book
          </Link>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent</div>
          {threads.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No chats yet.</p>
          )}
          {threads.map((t) => (
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
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <ModeBtn active={mode === "plan"} onClick={() => setMode("plan")} icon={<CalendarDays className="h-3.5 w-3.5" />}>
                Weekly plan
              </ModeBtn>
              <ModeBtn active={mode === "recipe"} onClick={() => setMode("recipe")} icon={<UtensilsCrossed className="h-3.5 w-3.5" />}>
                Recipe
              </ModeBtn>
            </div>
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              {(Object.keys(DURATION_LABELS) as Duration[]).map((d) => (
                <ModeBtn key={d} active={duration === d} onClick={() => setDuration(d)} icon={DURATION_LABELS[d].icon}>
                  {DURATION_LABELS[d].label}
                </ModeBtn>
              ))}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPantryOpen((v) => !v)} className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Pantry
            <span className="rounded-full bg-muted px-1.5 text-xs">{pantry.length}</span>
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {messages.length === 0 ? (
              <Empty mode={mode} onPick={send} />
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <Bubble key={m.id} message={m} threadId={activeId} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <Bubble message={{ id: "typing", role: "assistant", parts: [{ type: "text", text: "…" }] } as UIMessage} typing threadId={activeId} />
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
      {pantryOpen && (
        <PantryPanel pantry={pantry} onClose={() => setPantryOpen(false)} />
      )}
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

function Bubble({ message, typing, threadId }: { message: UIMessage; typing?: boolean; threadId: string | null }) {
  const isUser = message.role === "user";
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  type ShopGroup = { aisle: string; items: { name: string; qty?: string; note?: string }[] };
  type ToolPart = {
    type: string;
    state?: string;
    output?: {
      success?: boolean;
      image?: string;
      prompt?: string;
      title?: string;
      groups?: ShopGroup[];
    };
  };
  const toolParts = message.parts as unknown as ToolPart[];
  const imagePart = toolParts.find(
    (p) => p.type === "tool-generateMealImage" && p.state === "output-available" && p.output?.success,
  );
  const imageLoading = !!toolParts.find(
    (p) => p.type === "tool-generateMealImage" && (p.state === "input-streaming" || p.state === "input-available"),
  );
  const shoppingPart = toolParts.find(
    (p) => p.type === "tool-setShoppingList" && p.state === "output-available" && p.output?.groups,
  );
  // re-render when recipe-book changes so the saved icon stays in sync
  useSyncExternalStore(subscribe, () => (threadId ? !!findRecipeBySource(threadId, message.id) : false), () => false);
  const saved = !isUser && threadId ? findRecipeBySource(threadId, message.id) : undefined;
  const canSave = !isUser && !typing && !!text.trim() && !!threadId;
  function deriveTitle(md: string): string {
    const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const h = l.replace(/^#+\s*/, "").replace(/^\*\*(.+)\*\*$/, "$1");
      if (h && !/^[-*•]/.test(h)) return h.slice(0, 80);
    }
    return "Saved recipe";
  }
  function handleSave() {
    if (!threadId) return;
    if (saved) {
      deleteRecipe(saved.id);
      return;
    }
    saveRecipe({
      title: deriveTitle(text),
      content: text,
      image: imagePart?.output?.image,
      source: { threadId, messageId: message.id },
    });
  }
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
          <div className="space-y-3">
            {imageLoading && !imagePart?.output?.image && (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Plating your dish…
              </div>
            )}
            {imagePart?.output?.image && (
              <img
                src={imagePart.output.image}
                alt={imagePart.output.prompt ?? "Generated meal"}
                className="w-full rounded-xl border border-border object-cover"
              />
            )}
            {text && (
              <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            )}
            {shoppingPart?.output?.groups && threadId && (
              <ShoppingList
                threadId={threadId}
                messageId={message.id}
                title={shoppingPart.output.title ?? "Shopping list"}
                groups={shoppingPart.output.groups}
              />
            )}
            {canSave && (
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    saved
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                  {saved ? "Saved" : "Save to recipe book"}
                </button>
                {saved && (
                  <button
                    type="button"
                    onClick={() => toggleFavorite(saved.id)}
                    title={saved.favorite ? "Unfavorite" : "Favorite"}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                  >
                    <Star className={cn("h-3.5 w-3.5", saved.favorite && "fill-yellow-400 text-yellow-400")} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingList({
  threadId,
  messageId,
  title,
  groups,
}: {
  threadId: string;
  messageId: string;
  title: string;
  groups: { aisle: string; items: { name: string; qty?: string; note?: string }[] }[];
}) {
  // re-render on store changes
  useSyncExternalStore(subscribe, () => getPantry().length, () => 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce(
    (n, g) => n + g.items.filter((i) => isChecked(threadId, `${messageId}:${g.aisle}:${i.name}`)).length,
    0,
  );
  return (
    <div className="not-prose mt-2 rounded-xl border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBasket className="h-4 w-4 text-primary" />
          <span className="font-semibold">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
      </div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.aisle}>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.aisle}
            </div>
            <ul className="space-y-1">
              {g.items.map((it) => {
                const key = `${messageId}:${g.aisle}:${it.name}`;
                const checked = isChecked(threadId, key);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecked(threadId, key)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                      />
                      <span className={cn("flex-1 text-sm", checked && "text-muted-foreground line-through")}>
                        {it.qty ? <span className="font-medium">{it.qty} </span> : null}
                        {it.name}
                        {it.note ? <span className="ml-1 text-xs text-muted-foreground">({it.note})</span> : null}
                      </span>
                      <button
                        type="button"
                        title="Add to pantry"
                        onClick={(e) => {
                          e.preventDefault();
                          addPantryItem(it.name);
                        }}
                        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      >
                        <Package className="h-3.5 w-3.5" />
                      </button>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PantryPanel({ pantry, onClose }: { pantry: string[]; onClose: () => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach(addPantryItem);
    setDraft("");
  }
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="font-semibold">My pantry</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="border-b border-border p-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Items you already have. The AI will skip these in your shopping list.
        </p>
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. olive oil, rice, eggs"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" onClick={add} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {pantry.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            Your pantry is empty.
          </p>
        ) : (
          <ul className="space-y-1">
            {pantry.map((item) => (
              <li
                key={item}
                className="group flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => removePantryItem(item)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
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
