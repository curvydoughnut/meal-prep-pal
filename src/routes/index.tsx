import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChefHat, Sparkles, ListChecks, Salad } from "lucide-react";
import heroImg from "@/assets/hero-mealprep.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "PrepPal — AI Meal Prep Coach" },
      { name: "description", content: "Generate weekly meal plans, grocery lists, and prep-friendly recipes with AI." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-warm)]">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PrepPal</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild><Link to="/chat">Open app</Link></Button>
        </nav>
      </header>

      <section className="container mx-auto grid gap-12 px-6 pb-20 pt-10 md:grid-cols-2 md:items-center md:pt-16">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered meal prep
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Eat better, all week.
            <span className="block bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Without the planning.</span>
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Tell PrepPal your goals, diet, and time. Get a tailored weekly plan, grocery list, and prep-friendly recipes — generated in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild className="shadow-[var(--shadow-glow)]">
              <Link to="/chat">Start cooking smarter</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              How it works
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-[image:var(--gradient-hero)] opacity-20 blur-3xl" />
          <img
            src={heroImg}
            alt="Colorful meal prep containers with healthy food"
            width={1536}
            height={1024}
            className="relative rounded-[1.5rem] border border-border shadow-[var(--shadow-soft)]"
          />
        </div>
      </section>

      <section id="features" className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
        {([
          { icon: ListChecks, title: "Weekly plans", desc: "7-day menus matched to your macros, budget and time.", to: "/weekly-plans" as const },
          { icon: Salad, title: "Recipe ideas", desc: "Turn what's in your fridge into a meal-prep-ready dish.", to: "/recipe-ideas" as const },
          { icon: Sparkles, title: "Smart grocery lists", desc: "Auto-generated, grouped by aisle so you shop in one trip.", to: "/grocery-lists" as const },
        ]).map(({ icon: Icon, title, desc, to }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary transition-transform group-hover:scale-105">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
