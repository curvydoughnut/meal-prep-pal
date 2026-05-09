import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat, Salad, ArrowRight, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import highProtein from "@/assets/recipes/high-protein-bowl.jpg";
import veganBowl from "@/assets/recipes/vegan-bowl.jpg";
import ketoSalmon from "@/assets/recipes/keto-salmon.jpg";
import mediterranean from "@/assets/recipes/mediterranean.jpg";
import glutenFree from "@/assets/recipes/gluten-free-zoodles.jpg";
import vegetarian from "@/assets/recipes/vegetarian-oats.jpg";
import paleo from "@/assets/recipes/paleo-steak.jpg";
import pescatarian from "@/assets/recipes/pescatarian-poke.jpg";

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

type Diet = "All" | "High-protein" | "Vegan" | "Vegetarian" | "Keto" | "Mediterranean" | "Gluten-free" | "Paleo" | "Pescatarian";

type Recipe = {
  title: string;
  diet: Exclude<Diet, "All">;
  desc: string;
  time: string;
  kcal: string;
  image: string;
  prompt: string;
};

const RECIPES: Recipe[] = [
  { title: "Grilled Chicken Power Bowl", diet: "High-protein", desc: "Grilled chicken, brown rice, roasted broccoli & sweet potato.", time: "30 min", kcal: "520 kcal", image: highProtein, prompt: "Step-by-step recipe for a high-protein grilled chicken meal-prep bowl with brown rice, broccoli, and sweet potato — 4 servings." },
  { title: "Rainbow Vegan Buddha Bowl", diet: "Vegan", desc: "Quinoa, chickpeas, kale, avocado, tahini drizzle.", time: "25 min", kcal: "480 kcal", image: veganBowl, prompt: "Step-by-step vegan buddha bowl recipe with quinoa, chickpeas, kale, avocado, and tahini dressing — 4 servings." },
  { title: "Lemon Pepper Salmon", diet: "Keto", desc: "Pan-seared salmon with buttery asparagus.", time: "20 min", kcal: "430 kcal", image: ketoSalmon, prompt: "Step-by-step keto salmon recipe with buttery asparagus and lemon — 2 servings." },
  { title: "Mediterranean Mezze Plate", diet: "Mediterranean", desc: "Hummus, falafel, cucumber, tomatoes, olives, pita.", time: "20 min", kcal: "560 kcal", image: mediterranean, prompt: "Step-by-step Mediterranean mezze plate recipe with hummus, baked falafel, cucumber, cherry tomatoes, olives and pita — 4 servings." },
  { title: "Turkey Meatball Zoodles", diet: "Gluten-free", desc: "Zucchini noodles, lean turkey meatballs, basil tomato sauce.", time: "35 min", kcal: "410 kcal", image: glutenFree, prompt: "Step-by-step gluten-free turkey meatball zoodles recipe with tomato basil sauce — 4 servings." },
  { title: "Berry Almond Oats", diet: "Vegetarian", desc: "Creamy oats, mixed berries, banana, almonds, honey.", time: "10 min", kcal: "380 kcal", image: vegetarian, prompt: "Step-by-step vegetarian breakfast oatmeal recipe with berries, banana, almonds and honey — 1 serving." },
  { title: "Herb Steak & Sweet Potato", diet: "Paleo", desc: "Seared steak strips, roasted sweet potato, sautéed spinach.", time: "30 min", kcal: "590 kcal", image: paleo, prompt: "Step-by-step paleo herb steak recipe with roasted sweet potato cubes and sautéed spinach — 2 servings." },
  { title: "Mango Shrimp Poke Bowl", diet: "Pescatarian", desc: "Shrimp, sushi rice, mango, edamame, cucumber, sesame.", time: "25 min", kcal: "510 kcal", image: pescatarian, prompt: "Step-by-step pescatarian shrimp poke bowl recipe with sushi rice, mango, edamame, cucumber, avocado, and sesame — 2 servings." },
];

const DIETS: Diet[] = ["All", "High-protein", "Vegan", "Vegetarian", "Keto", "Mediterranean", "Gluten-free", "Paleo", "Pescatarian"];

function RecipeIdeasPage() {
  const [filter, setFilter] = useState<Diet>("All");
  const visible = useMemo(
    () => (filter === "All" ? RECIPES : RECIPES.filter((r) => r.diet === filter)),
    [filter],
  );

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

      <section className="container mx-auto max-w-6xl px-6 pb-20 pt-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Salad className="h-3.5 w-3.5 text-primary" /> Recipe ideas
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">A recipe for every diet.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Browse curated meal-prep ideas across high-protein, vegan, keto, Mediterranean and more. Tap any recipe
          to get full step-by-step instructions, ingredients, and portions in chat.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                filter === d
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <Link
              key={r.title}
              to="/chat"
              search={{ prompt: r.prompt }}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={r.image}
                  alt={r.title}
                  width={768}
                  height={768}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
                  {r.diet}
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{r.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.desc}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.time}</span>
                  <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> {r.kcal}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Get recipe <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold">Don't see what you want?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tell PrepPal what's in your fridge, your dietary needs, and how many servings — get a custom recipe in seconds.
          </p>
          <Button asChild className="mt-5"><Link to="/chat">Generate a custom recipe <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </div>
  );
}