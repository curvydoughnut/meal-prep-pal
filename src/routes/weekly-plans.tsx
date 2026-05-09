import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChefHat, ListChecks, Calendar, Target, Wallet, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/weekly-plans")({
  component: WeeklyPlansPage,
  head: () => ({
    meta: [
      { title: "Weekly Plans — PrepPal" },
      { name: "description", content: "AI-built 7-day meal plans tailored to your macros, budget, and schedule." },
      { property: "og:title", content: "Weekly Plans — PrepPal" },
      { property: "og:description", content: "AI-built 7-day meal plans tailored to your macros, budget, and schedule." },
    ],
  }),
});

function WeeklyPlansPage() {
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
          <ListChecks className="h-3.5 w-3.5 text-primary" /> Weekly plans
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">A full week of meals, planned for you.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tell PrepPal your goals, diet, and budget — get a 7-day plan with breakfasts, lunches, dinners, and snacks
          built around what you actually eat.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Hit your macros", desc: "Calorie + protein targets per day, every day." },
            { icon: Wallet, title: "Stay on budget", desc: "Plans that respect your weekly grocery spend." },
            { icon: Calendar, title: "Match your time", desc: "Quick weeknight dinners or one big prep day." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Share your goal, diet, and number of days.</li>
            <li>2. PrepPal builds the menu and portions for the week.</li>
            <li>3. Open any meal in the Recipe tab for full instructions.</li>
          </ol>
          <Button asChild className="mt-6"><Link to="/chat">Build my plan <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </div>
  );
}