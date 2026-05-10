// Local-only grocery notebook store (no backend, no auth)

export type GroceryItem = { id: string; text: string; checked: boolean };
export type GroceryList = { id: string; title: string; items: GroceryItem[] };
export type GroceryPage = {
  id: string;
  title: string;
  lists: GroceryList[];
  created_at: string;
  updated_at: string;
};

type Stored = { pages: GroceryPage[] };

const KEY = "preppal:grocery:v1";
const EVENT = "preppal:grocery";

let cache: Stored | null = null;

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function read(): Stored {
  if (cache) return cache;
  if (typeof window === "undefined") return { pages: [] };
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Stored) : { pages: [] };
  } catch {
    cache = { pages: [] };
  }
  return cache;
}

function write(s: Stored) {
  if (typeof window === "undefined") return;
  cache = s;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVENT));
}

let pagesSnap: GroceryPage[] = [];
function refreshSnap() {
  pagesSnap = [...read().pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
refreshSnap();

export function listPages(): GroceryPage[] {
  return pagesSnap;
}

export function getPage(id: string): GroceryPage | undefined {
  return read().pages.find((p) => p.id === id);
}

export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    refreshSnap();
    cb();
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function update(mut: (s: Stored) => void) {
  const s = read();
  mut(s);
  write({ pages: [...s.pages] });
  refreshSnap();
}

function touch(page: GroceryPage) {
  page.updated_at = new Date().toISOString();
}

export function createPage(title = "New page"): GroceryPage {
  const now = new Date().toISOString();
  const page: GroceryPage = { id: uid(), title, lists: [], created_at: now, updated_at: now };
  update((s) => {
    s.pages.unshift(page);
  });
  return page;
}

export function renamePage(pageId: string, title: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    if (!p) return;
    p.title = title;
    touch(p);
  });
}

export function deletePage(pageId: string) {
  update((s) => {
    s.pages = s.pages.filter((p) => p.id !== pageId);
  });
}

export function addList(pageId: string, title = "New list") {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    if (!p) return;
    p.lists.push({ id: uid(), title, items: [] });
    touch(p);
  });
}

export function renameList(pageId: string, listId: string, title: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    const l = p?.lists.find((x) => x.id === listId);
    if (!p || !l) return;
    l.title = title;
    touch(p);
  });
}

export function deleteList(pageId: string, listId: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    if (!p) return;
    p.lists = p.lists.filter((l) => l.id !== listId);
    touch(p);
  });
}

export function addItem(pageId: string, listId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    const l = p?.lists.find((x) => x.id === listId);
    if (!p || !l) return;
    l.items.push({ id: uid(), text: trimmed, checked: false });
    touch(p);
  });
}

export function toggleItem(pageId: string, listId: string, itemId: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    const l = p?.lists.find((x) => x.id === listId);
    const it = l?.items.find((x) => x.id === itemId);
    if (!p || !l || !it) return;
    it.checked = !it.checked;
    touch(p);
  });
}

export function deleteItem(pageId: string, listId: string, itemId: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    const l = p?.lists.find((x) => x.id === listId);
    if (!p || !l) return;
    l.items = l.items.filter((i) => i.id !== itemId);
    touch(p);
  });
}

export function clearChecked(pageId: string, listId: string) {
  update((s) => {
    const p = s.pages.find((x) => x.id === pageId);
    const l = p?.lists.find((x) => x.id === listId);
    if (!p || !l) return;
    l.items = l.items.filter((i) => !i.checked);
    touch(p);
  });
}