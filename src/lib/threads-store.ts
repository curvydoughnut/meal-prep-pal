// Local-only thread + message store (no auth, no backend)
import type { UIMessage } from "ai";

export type Mode = "plan" | "recipe";
export type ThreadMeta = { id: string; title: string; mode: Mode; updated_at: string };
export type Recipe = {
  id: string;
  title: string;
  content: string;
  image?: string;
  favorite: boolean;
  saved_at: string;
  source?: { threadId: string; messageId: string };
};
type Stored = {
  threads: ThreadMeta[];
  messages: Record<string, UIMessage[]>;
  pantry: string[];
  /** keyed by `${threadId}:${itemKey}` */
  checked: Record<string, boolean>;
  recipes: Recipe[];
};

const KEY = "preppal:store:v1";

let cache: Stored | null = null;

function read(): Stored {
  if (cache) return cache;
  if (typeof window === "undefined") return { threads: [], messages: {}, pantry: [], checked: {}, recipes: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      cache = { threads: [], messages: {}, pantry: [], checked: {}, recipes: [] };
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<Stored>;
    cache = {
      threads: parsed.threads ?? [],
      messages: parsed.messages ?? {},
      pantry: parsed.pantry ?? [],
      checked: parsed.checked ?? {},
      recipes: parsed.recipes ?? [],
    };
    return cache;
  } catch {
    cache = { threads: [], messages: {}, pantry: [], checked: {}, recipes: [] };
    return cache;
  }
}

function write(s: Stored) {
  if (typeof window === "undefined") return;
  cache = s;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("preppal:store"));
}

// Memoized snapshots so useSyncExternalStore sees stable references.
let threadsSnap: ThreadMeta[] = [];
let threadsSnapKey = "";
let pantrySnap: string[] = [];
let pantrySnapRef: string[] | null = null;

export function listThreads(): ThreadMeta[] {
  const raw = read().threads;
  const sorted = [...raw].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const key = sorted.map((t) => `${t.id}:${t.updated_at}:${t.title}`).join("|");
  if (key !== threadsSnapKey) {
    threadsSnap = sorted;
    threadsSnapKey = key;
  }
  return threadsSnap;
}

export function createThread(mode: Mode, title = "New chat"): ThreadMeta {
  const t: ThreadMeta = {
    id: crypto.randomUUID(),
    title,
    mode,
    updated_at: new Date().toISOString(),
  };
  const s = read();
  s.threads.push(t);
  s.messages[t.id] = [];
  write(s);
  return t;
}

export function ensureThreadWithId(id: string, mode: Mode, title = "New chat"): ThreadMeta {
  const s = read();
  const existing = s.threads.find((t) => t.id === id);
  if (existing) return existing;
  const t: ThreadMeta = { id, title, mode, updated_at: new Date().toISOString() };
  s.threads.push(t);
  s.messages[id] = s.messages[id] ?? [];
  write(s);
  return t;
}

export function deleteThread(id: string) {
  const s = read();
  write({
    ...s,
    threads: s.threads.filter((t) => t.id !== id),
    messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== id)),
  });
}

export function renameThread(id: string, title: string) {
  const s = read();
  const t = s.threads.find((x) => x.id === id);
  if (t) {
    t.title = title;
    t.updated_at = new Date().toISOString();
  }
  write(s);
}

export function getMessages(threadId: string): UIMessage[] {
  return read().messages[threadId] ?? [];
}

export function setMessages(threadId: string, msgs: UIMessage[]) {
  const s = read();
  s.messages[threadId] = msgs;
  const t = s.threads.find((x) => x.id === threadId);
  if (t) t.updated_at = new Date().toISOString();
  write(s);
}

export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("preppal:store", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("preppal:store", cb);
    window.removeEventListener("storage", cb);
  };
}

// ---------- Pantry ----------
export function getPantry(): string[] {
  const raw = read().pantry;
  if (pantrySnapRef !== raw) {
    pantrySnap = raw;
    pantrySnapRef = raw;
  }
  return pantrySnap;
}

export function setPantry(items: string[]) {
  const s = read();
  s.pantry = items;
  write(s);
}

export function addPantryItem(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const s = read();
  if (!s.pantry.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
    s.pantry = [...s.pantry, trimmed];
    write(s);
  }
}

export function removePantryItem(name: string) {
  const s = read();
  s.pantry = s.pantry.filter((x) => x !== name);
  write(s);
}

// ---------- Shopping list checks ----------
export function isChecked(threadId: string, key: string): boolean {
  return !!read().checked[`${threadId}:${key}`];
}

export function toggleChecked(threadId: string, key: string) {
  const s = read();
  const k = `${threadId}:${key}`;
  if (s.checked[k]) delete s.checked[k];
  else s.checked[k] = true;
  write(s);
}

// ---------- Recipe book ----------
let recipesSnap: Recipe[] = [];
let recipesSnapRef: Recipe[] | null = null;

export function listRecipes(): Recipe[] {
  const raw = read().recipes;
  if (recipesSnapRef !== raw) {
    recipesSnap = raw;
    recipesSnapRef = raw;
  }
  return recipesSnap;
}

export function findRecipeBySource(threadId: string, messageId: string): Recipe | undefined {
  return read().recipes.find(
    (r) => r.source?.threadId === threadId && r.source?.messageId === messageId,
  );
}

export function saveRecipe(input: Omit<Recipe, "id" | "favorite" | "saved_at"> & { favorite?: boolean }): Recipe {
  const s = read();
  const r: Recipe = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Untitled recipe",
    content: input.content,
    image: input.image,
    favorite: input.favorite ?? false,
    saved_at: new Date().toISOString(),
    source: input.source,
  };
  s.recipes = [r, ...s.recipes];
  write(s);
  return r;
}

export function deleteRecipe(id: string) {
  const s = read();
  s.recipes = s.recipes.filter((r) => r.id !== id);
  write(s);
}

export function updateRecipe(id: string, patch: Partial<Pick<Recipe, "title" | "content" | "image" | "favorite">>) {
  const s = read();
  s.recipes = s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(s);
}

export function toggleFavorite(id: string) {
  const s = read();
  s.recipes = s.recipes.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r));
  write(s);
}
