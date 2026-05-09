import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChefHat, BookOpen, Star, Trash2, Plus, ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listRecipes,
  saveRecipe,
  deleteRecipe,
  updateRecipe,
  toggleFavorite,
  subscribe,
  type Recipe,
} from "@/lib/threads-store";

export const Route = createFileRoute("/recipes")({
  component: RecipesPage,
  head: () => ({ meta: [{ title: "Recipe Book — PrepPal" }] }),
});

const EMPTY: Recipe[] = [];
function useRecipes() {
  return useSyncExternalStore(subscribe, listRecipes, () => EMPTY);
}

function RecipesPage() {
  const recipes = useRecipes();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { favorites, groups, letters } = useMemo(() => {
    const favs = recipes.filter((r) => r.favorite).sort((a, b) => a.title.localeCompare(b.title));
    const rest = recipes.filter((r) => !r.favorite);
    const map = new Map<string, Recipe[]>();
    for (const r of rest) {
      const ch = (r.title.trim()[0] || "#").toUpperCase();
      const letter = /[A-Z]/.test(ch) ? ch : "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(r);
    }
    const lts = [...map.keys()].sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
    for (const l of lts) map.get(l)!.sort((a, b) => a.title.localeCompare(b.title));
    return { favorites: favs, groups: map, letters: lts };
  }, [recipes]);

  const active = recipes.find((r) => r.id === activeId) ?? null;

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-80 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-semibold">Recipe book</span>
          </div>
          <Link to="/chat" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Chat
          </Link>
        </div>
        <div className="px-3 pb-2">
          <Button onClick={() => { setAdding(true); setActiveId(null); }} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add recipe
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {favorites.length > 0 && (
            <Section label="Favorites" icon={<Star className="h-3 w-3 fill-current" />}>
              {favorites.map((r) => (
                <RecipeRow key={r.id} r={r} active={r.id === activeId} onClick={() => { setActiveId(r.id); setAdding(false); }} />
              ))}
            </Section>
          )}
          {letters.length === 0 && favorites.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No recipes yet. Save one from the chat or add manually.
            </p>
          )}
          {letters.map((l) => (
            <Section key={l} label={l}>
              {groups.get(l)!.map((r) => (
                <RecipeRow key={r.id} r={r} active={r.id === activeId} onClick={() => { setActiveId(r.id); setAdding(false); }} />
              ))}
            </Section>
          ))}
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        {adding ? (
          <RecipeEditor
            onCancel={() => setAdding(false)}
            onSave={(data) => {
              const r = saveRecipe(data);
              setAdding(false);
              setActiveId(r.id);
            }}
          />
        ) : active ? (
          <RecipeView recipe={active} onClose={() => setActiveId(null)} />
        ) : (
          <EmptyState onAdd={() => setAdding(true)} />
        )}
      </main>
    </div>
  );
}

function Section({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function RecipeRow({ r, active, onClick }: { r: Recipe; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60",
      )}
    >
      {r.image ? (
        <img src={r.image} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ChefHat className="h-3.5 w-3.5" />
        </div>
      )}
      <span className="flex-1 truncate">{r.title}</span>
      {r.favorite && <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-glow)]">
        <BookOpen className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Your recipe book</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Save the recipes you cook from chat — favorites stay on top, the rest sort A–Z.
      </p>
      <Button onClick={onAdd} className="mt-2">
        <Plus className="mr-2 h-4 w-4" /> Add a recipe
      </Button>
    </div>
  );
}

function RecipeView({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <RecipeEditor
        initial={recipe}
        onCancel={() => setEditing(false)}
        onSave={(data) => {
          updateRecipe(recipe.id, data);
          setEditing(false);
        }}
      />
    );
  }
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => toggleFavorite(recipe.id)} title="Favorite">
            <Star className={cn("h-5 w-5", recipe.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">{recipe.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Delete this recipe?")) {
                deleteRecipe(recipe.id);
                onClose();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto max-w-3xl px-6 py-8">
          {recipe.image && (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="mb-6 w-full rounded-xl border border-border object-cover"
            />
          )}
          <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{recipe.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </>
  );
}

function RecipeEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Recipe;
  onSave: (data: { title: string; content: string; image?: string; favorite: boolean }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {initial ? "Edit recipe" : "New recipe"}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || !content.trim()}
            onClick={() => onSave({ title, content, image: initial?.image, favorite })}
          >
            Save
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recipe title"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 accent-primary" />
            Mark as favorite
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Ingredients, steps, notes (Markdown supported)…"}
            className="min-h-[400px]"
          />
        </div>
      </div>
    </>
  );
}