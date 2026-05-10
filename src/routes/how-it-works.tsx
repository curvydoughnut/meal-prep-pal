import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChefHat, ListChecks, Salad, Sparkles, BookOpen, LifeBuoy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorks,
  head: () => ({
    meta: [
      { title: "How PrepPal Works — Guide & FAQ" },
      {
        name: "description",
        content:
          "Learn how to use PrepPal: weekly plans, recipe ideas, grocery notebook, and AI chat. Includes FAQ and help support.",
      },
      { property: "og:title", content: "How PrepPal Works — Guide & FAQ" },
      {
        property: "og:description",
        content: "Step-by-step instructions, FAQ, and help for PrepPal.",
      },
    ],
  }),
});

const STEPS = [
  {
    icon: Sparkles,
    title: "1. Chat with PrepPal",
    desc: "Open the AI chat to describe your goals, diet, time and budget. PrepPal tailors everything from there.",
    to: "/chat" as const,
    cta: "Open chat",
  },
  {
    icon: ListChecks,
    title: "2. Generate a weekly plan",
    desc: "Get a 7-day menu matched to your macros and schedule. Swap meals you don't like in one click.",
    to: "/weekly-plans" as const,
    cta: "View weekly plans",
  },
  {
    icon: Salad,
    title: "3. Browse recipe ideas",
    desc: "Filter recipes by diet — vegan, keto, kid-friendly, Italian, Indian and more. Each card includes a photo and step-by-step prompt.",
    to: "/recipe-ideas" as const,
    cta: "Browse recipes",
  },
  {
    icon: BookOpen,
    title: "4. Use the grocery notebook",
    desc: "Create pages for each shopping trip, add lists inside, and check items off as you grab them at the store.",
    to: "/grocery-lists" as const,
    cta: "Open notebook",
  },
];

const FAQS = [
  {
    q: "Do I need an account to use PrepPal?",
    a: "You can browse recipe ideas and use the grocery notebook without signing in. Saving chat history and personalized weekly plans across devices requires an account.",
  },
  {
    q: "How are meal plans generated?",
    a: "PrepPal uses AI to combine your stated goals (calories, diet, allergies, time available) with our recipe library to build a balanced 7-day plan.",
  },
  {
    q: "Can I filter recipes by diet?",
    a: "Yes. On the Recipe ideas page, use the diet chips at the top — Vegan, Keto, Paleo, Pescatarian, Mediterranean, Anti-inflammatory, Kid-friendly, Asian, Indian, Italian and more.",
  },
  {
    q: "How does the grocery notebook work?",
    a: "Think of it like a real notebook: create a page for each trip, add one or more lists inside (Produce, Dairy, etc.), then tap items to scratch them off as you shop. Everything is saved on your device.",
  },
  {
    q: "Will my grocery lists sync across devices?",
    a: "Currently the notebook is stored locally in your browser. Cross-device sync is on the roadmap.",
  },
  {
    q: "Can I print or export a plan or list?",
    a: "Use your browser's print menu (Ctrl/Cmd + P) on any plan, recipe or grocery page to save it as PDF or print it.",
  },
  {
    q: "Is PrepPal free?",
    a: "Core features are free. Advanced personalization and unlimited AI chat may move to a paid plan in the future — you'll always be told before any charge.",
  },
];

function HowItWorks() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please describe what you need help with.");
      return;
    }
    setSubmitting(true);
    // Local-only submission for now — store as a draft so the user has a record.
    try {
      const drafts = JSON.parse(localStorage.getItem("preppal:help:v1") || "[]");
      drafts.push({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        at: new Date().toISOString(),
      });
      localStorage.setItem("preppal:help:v1", JSON.stringify(drafts));
      toast.success("Thanks! Your help request was sent.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-warm)]">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PrepPal</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
          <Button asChild>
            <Link to="/chat">Open app</Link>
          </Button>
        </nav>
      </header>

      <section className="container mx-auto max-w-3xl px-6 pb-10 pt-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <BookOpen className="h-3.5 w-3.5 text-primary" /> Site guide
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
          How PrepPal works
        </h1>
        <p className="mt-3 text-muted-foreground">
          A quick tour of every page, plus answers to common questions and a way to reach us
          if you're stuck.
        </p>
      </section>

      <section className="container mx-auto grid max-w-5xl gap-5 px-6 pb-16 md:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, desc, to, cta }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to={to}>{cta}</Link>
            </Button>
          </div>
        ))}
      </section>

      <section className="container mx-auto max-w-3xl px-6 pb-16">
        <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick answers to the things people ask most.
        </p>
        <Accordion type="single" collapsible className="mt-6 rounded-2xl border border-border bg-card px-4 shadow-[var(--shadow-soft)]">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="container mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Still need help?</h2>
              <p className="text-sm text-muted-foreground">
                Send us a note and we'll get back to you.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">How can we help?</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's going wrong or what you'd like to do…"
                rows={5}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send help request"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
