import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChefHat, Salad, Sparkles, Refrigerator, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/recipe-ideas")({
  component: RecipeIdeasPage,
  head: () => ({
    meta: [
      { title: "Recipe Ideas — PrepPal" },
      { name: "description", content: "Turn what's already in your fridge into meal-prep-ready dishes with step-by-step recipes." },
      { property: "og:title", content: "Recipe Ideas — PrepPal" },
      { property: "og:description", content: "Turn what's already in your fridge into meal-prep-ready dishes with step-by-step recipes." },
    ],
  }),
});

function RecipeIdeasPage() {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-warm)]">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PrepPal</span>
        </Link>
        <Button asChild><Link to="/chat">Open app</Link></Button>
      </header>

      <section className="container mx-auto max-w-3xl px-6 pb-20 pt-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Salad className="h-3.5 w-3.5 text-primary" /> Recipe ideas
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">From fridge to fork — fast.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          List what's in your pantry and PrepPal turns it into a complete recipe with ingredients, portions, and
          step-by-step instructions you can actually follow.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Refrigerator, title: "Use what you have", desc: "Less waste, fewer trips to the store." },
            { icon: Sparkles, title: "Step-by-step", desc: "Clear instructions, prep tips, and timings." },
            { icon: Clock, title: "Prep-ready", desc: "Recipes that hold up in the fridge for days." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold">Try a prompt</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            "Use up: salmon, rice, cucumber, and ginger — meal-prep friendly."
          </p>
          <Button asChild className="mt-6"><Link to="/chat">Generate a recipe <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </div>
  );
}