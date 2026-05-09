import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChefHat, ShoppingBasket, Sparkles, MapPin, CheckCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/grocery-lists")({
  component: GroceryListsPage,
  head: () => ({
    meta: [
      { title: "Smart Grocery Lists — PrepPal" },
      { name: "description", content: "Auto-generated grocery lists grouped by aisle so you shop the whole week in one trip." },
      { property: "og:title", content: "Smart Grocery Lists — PrepPal" },
      { property: "og:description", content: "Auto-generated grocery lists grouped by aisle so you shop the whole week in one trip." },
    ],
  }),
});

function GroceryListsPage() {
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
          <ShoppingBasket className="h-3.5 w-3.5 text-primary" /> Smart grocery lists
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">One list. One trip. Done.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Every plan and recipe builds a grocery list grouped by aisle, with quantities combined so you never
          double-buy. Check items off as you shop.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Grouped by aisle", desc: "Produce, proteins, pantry, dairy — sorted for you." },
            { icon: Sparkles, title: "Quantities combined", desc: "Buy exactly what you need, no more, no less." },
            { icon: CheckCheck, title: "Check as you go", desc: "Tap items off your list while you shop." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold">Where to find it</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Whenever you ask for a plan or recipe, scroll the response for the auto-generated grocery list panel.
          </p>
          <Button asChild className="mt-6"><Link to="/chat">Get my list <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </div>
  );
}