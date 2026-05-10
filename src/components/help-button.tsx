import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { HelpCircle, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How do I create a weekly plan?",
  "Where do I filter recipes by diet?",
  "How does the grocery notebook work?",
];

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: "preppal-help",
    transport: new DefaultChatTransport({ api: "/api/help" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) {
      // Focus input on open
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || isLoading) return;
    void sendMessage({ text: value });
    setInput("");
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:scale-105 active:scale-95",
          open && "rotate-90",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-24 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
        style={{ height: "min(540px, calc(100vh - 8rem))" }}
        role="dialog"
        aria-label="PrepPal help assistant"
      >
        <header className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Need help?</p>
            <p className="text-xs text-muted-foreground">Ask the PrepPal assistant</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Hi! I can help you find your way around PrepPal. Try one of these:
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed",
                    isUser
                      ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {text || (isUser ? "" : <span className="text-muted-foreground">…</span>)}
                </div>
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "240ms" }} />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2 border-t border-border bg-background p-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="Ask a question…"
            className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}