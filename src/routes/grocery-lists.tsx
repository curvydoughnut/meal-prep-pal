import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChefHat, BookOpen, Plus, Trash2, ListPlus, X, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listPages,
  getPage,
  subscribe,
  createPage,
  renamePage,
  deletePage,
  addList,
  renameList,
  deleteList,
  addItem,
  toggleItem,
  deleteItem,
  clearChecked,
  type GroceryPage,
} from "@/lib/grocery-store";

export const Route = createFileRoute("/grocery-lists")({
  component: GroceryListsPage,
  head: () => ({
    meta: [
      { title: "Grocery Notebook — PrepPal" },
      { name: "description", content: "A digital grocery notebook: create pages, add lists, and check items off as you shop." },
      { property: "og:title", content: "Grocery Notebook — PrepPal" },
      { property: "og:description", content: "A digital grocery notebook: create pages, add lists, and check items off as you shop." },
    ],
  }),
});

const EMPTY_PAGES: GroceryPage[] = [];

function usePages() {
  return useSyncExternalStore(subscribe, listPages, () => EMPTY_PAGES);
}

function GroceryListsPage() {
  const pages = usePages();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Pick the most recent page when none selected, or after deletion.
  useEffect(() => {
    if (!activeId && pages.length) setActiveId(pages[0].id);
    else if (activeId && !pages.find((p) => p.id === activeId))
      setActiveId(pages[0]?.id ?? null);
  }, [pages, activeId]);

  const active = useMemo(() => (activeId ? getPage(activeId) : undefined), [activeId, pages]);

  function handleNewPage() {
    const p = createPage(`Page ${pages.length + 1}`);
    setActiveId(p.id);
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-warm)]">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PrepPal</span>
        </Link>
        <Button asChild variant="outline"><Link to="/chat">Open app</Link></Button>
      </header>

      <section className="container mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <NotebookPen className="h-3.5 w-3.5 text-primary" /> Grocery notebook
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Your shopping notebook</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Create a page for each shop or week, add lists inside, and tap items to scratch them off as you go.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <PageSidebar
            pages={pages}
            activeId={activeId}
            onSelect={setActiveId}
            onNew={handleNewPage}
            onDelete={(id) => deletePage(id)}
          />
          {active ? (
            <PageView page={active} />
          ) : (
            <EmptyState onCreate={handleNewPage} />
          )}
        </div>
      </section>
    </div>
  );
}

function PageSidebar({
  pages,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  pages: GroceryPage[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="rounded-2xl border border-border bg-card/80 p-3 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <Button onClick={onNew} className="w-full rounded-xl">
        <Plus className="mr-1 h-4 w-4" /> New page
      </Button>
      <div className="mt-3 space-y-1">
        {pages.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No pages yet.</p>
        )}
        {pages.map((p) => {
          const total = p.lists.reduce((n, l) => n + l.items.length, 0);
          const done = p.lists.reduce((n, l) => n + l.items.filter((i) => i.checked).length, 0);
          return (
            <div
              key={p.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                activeId === p.id ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              <button
                onClick={() => onSelect(p.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-sm font-medium">{p.title}</span>
                {total > 0 && (
                  <span className="text-xs text-muted-foreground">{done}/{total}</span>
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete page "${p.title}"?`)) onDelete(p.id);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete page"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
      <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/60" />
      <h2 className="text-lg font-semibold">Open a fresh page</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Pages are like tabs in a notebook. Each page can hold multiple lists — produce, pantry, weekend prep, anything.
      </p>
      <Button onClick={onCreate} className="mt-4">
        <Plus className="mr-1 h-4 w-4" /> Create your first page
      </Button>
    </div>
  );
}

function PageView({ page }: { page: GroceryPage }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Input
          value={page.title}
          onChange={(e) => renamePage(page.id, e.target.value)}
          className="h-10 border-0 bg-transparent px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0"
        />
        <Button onClick={() => addList(page.id)} variant="outline" size="sm" className="shrink-0">
          <ListPlus className="mr-1 h-4 w-4" /> Add list
        </Button>
      </div>

      {page.lists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
          No lists yet. Add one to start writing things down.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {page.lists.map((l) => (
            <ListCard key={l.id} pageId={page.id} list={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListCard({
  pageId,
  list,
}: {
  pageId: string;
  list: GroceryPage["lists"][number];
}) {
  const [draft, setDraft] = useState("");
  const remaining = list.items.filter((i) => !i.checked).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    addItem(pageId, list.id, draft);
    setDraft("");
  }

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={list.title}
          onChange={(e) => renameList(pageId, list.id, e.target.value)}
          className="h-8 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{remaining} left</span>
        <button
          onClick={() => {
            if (confirm(`Delete list "${list.title}"?`)) deleteList(pageId, list.id);
          }}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Delete list"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ul className="space-y-1">
        {list.items.map((it) => (
          <li
            key={it.id}
            className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-secondary/60"
          >
            <input
              type="checkbox"
              checked={it.checked}
              onChange={() => toggleItem(pageId, list.id, it.id)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <span
              onClick={() => toggleItem(pageId, list.id, it.id)}
              className={cn(
                "flex-1 cursor-pointer text-sm",
                it.checked && "text-muted-foreground line-through",
              )}
            >
              {it.text}
            </span>
            <button
              onClick={() => deleteItem(pageId, list.id, it.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove item"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add item…"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>Add</Button>
      </form>

      {list.items.some((i) => i.checked) && (
        <button
          onClick={() => clearChecked(pageId, list.id)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear checked
        </button>
      )}
    </div>
  );
}