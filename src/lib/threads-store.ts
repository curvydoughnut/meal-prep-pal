// Local-only thread + message store (no auth, no backend)
import type { UIMessage } from "ai";

export type Mode = "plan" | "recipe";
export type ThreadMeta = { id: string; title: string; mode: Mode; updated_at: string };
type Stored = {
  threads: ThreadMeta[];
  messages: Record<string, UIMessage[]>;
  pantry: string[];
  /** keyed by `${threadId}:${itemKey}` */
  checked: Record<string, boolean>;
};

const KEY = "preppal:store:v1";

function read(): Stored {
  if (typeof window === "undefined") return { threads: [], messages: {}, pantry: [], checked: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { threads: [], messages: {}, pantry: [], checked: {} };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      threads: parsed.threads ?? [],
      messages: parsed.messages ?? {},
      pantry: parsed.pantry ?? [],
      checked: parsed.checked ?? {},
    };
  } catch {
    return { threads: [], messages: {}, pantry: [], checked: {} };
  }
}

function write(s: Stored) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("preppal:store"));
}

export function listThreads(): ThreadMeta[] {
  return read().threads.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
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

export function deleteThread(id: string) {
  const s = read();
  s.threads = s.threads.filter((t) => t.id !== id);
  delete s.messages[id];
  write(s);
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
  return read().pantry;
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
