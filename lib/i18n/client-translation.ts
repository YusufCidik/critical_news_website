import type { SupportedLanguage } from "@/lib/store/language-store";

export interface TranslationEntry { text: string; source: string; priority: number }
type Job = TranslationEntry & { key: string; target: SupportedLanguage; attempts: number; state: "pending" | "running" | "error"; next: number };
type Result = { complete?: boolean; translations?: string[]; resolved?: boolean[] };
type Requester = (entries: TranslationEntry[], language: SupportedLanguage) => Promise<Result>;
const STORAGE = "intelmatrix-translations-v2";
const keyFor = (text: string, source: string, target: string) => JSON.stringify([target, source, text]);

async function request(entries: TranslationEntry[], targetLang: SupportedLanguage): Promise<Result> {
  const response = await fetch("/api/translate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetLang, texts: entries.map((entry) => entry.text), sourceLangs: entries.map((entry) => entry.source) }),
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw new Error("Translation request failed");
  return response.json();
}

export class TranslationQueue {
  private cache = new Map<string, string>();
  private jobs = new Map<string, Job>();
  private scopes = new Map<string, Set<string>>();
  private listeners = new Set<() => void>();
  private revision = 0;
  private active = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private hydrated = false;
  constructor(private requester: Requester = request, private retryDelay = 1500) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.revision;
  private notify() { this.revision++; this.listeners.forEach((listener) => listener()); }
  private hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      if (typeof localStorage === "undefined") return;
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(saved)) for (const pair of saved.slice(-1000)) {
        if (Array.isArray(pair) && pair.length === 2 && pair.every((value) => typeof value === "string") && pair[0].length < 10000 && pair[1].length < 10000) this.cache.set(pair[0], pair[1]);
      }
    } catch { /* Storage is optional, translation remains available. */ }
  }
  private persist() {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE, JSON.stringify([...this.cache].slice(-1000)));
    } catch { /* Private browsing or storage limits must not break the queue. */ }
  }
  get(text: string, source: string, target: SupportedLanguage) {
    return !text.trim() || source === target ? text : this.cache.get(keyFor(text, source, target));
  }
  seed(entries: Array<TranslationEntry & { translated: string }>, target: SupportedLanguage) {
    this.hydrate();
    let changed = false;
    for (const entry of entries) if (entry.translated.trim()) {
      const key = keyFor(entry.text, entry.source, target);
      if (this.cache.get(key) !== entry.translated) { this.cache.set(key, entry.translated); changed = true; }
    }
    if (changed) { this.persist(); this.notify(); }
  }
  status(entries: TranslationEntry[], target: SupportedLanguage): "loading" | "ready" | "error" {
    const missing = entries.filter((entry) => this.get(entry.text, entry.source, target) === undefined);
    if (!missing.length) return "ready";
    return missing.every((entry) => this.jobs.get(keyFor(entry.text, entry.source, target))?.state === "error") ? "error" : "loading";
  }
  watch(scope: string, entries: TranslationEntry[], target: SupportedLanguage) {
    this.hydrate();
    const keys = new Set<string>();
    for (const entry of entries) {
      if (this.get(entry.text, entry.source, target) !== undefined) continue;
      const key = keyFor(entry.text, entry.source, target);
      keys.add(key);
      const job = this.jobs.get(key);
      if (!job) this.jobs.set(key, { ...entry, target, key, attempts: 0, state: "pending", next: 0 });
      else job.priority = Math.min(job.priority, entry.priority);
    }
    this.scopes.set(scope, keys);
    this.notify();
    this.schedule();
    return () => {
      this.scopes.delete(scope);
      const wanted = this.wanted();
      for (const [key, job] of this.jobs) if (!wanted.has(key) && job.state !== "running") this.jobs.delete(key);
    };
  }
  retry(entries: TranslationEntry[], target: SupportedLanguage) {
    for (const entry of entries) {
      const job = this.jobs.get(keyFor(entry.text, entry.source, target));
      if (job?.state === "error") { job.state = "pending"; job.attempts = 0; job.next = 0; }
    }
    this.notify();
    this.schedule();
  }
  private wanted() { return new Set([...this.scopes.values()].flatMap((keys) => [...keys])); }
  private schedule(delay = 0) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.pump(), delay);
  }
  private pump() {
    const wanted = this.wanted();
    const pending = [...this.jobs.values()].filter((job) => wanted.has(job.key) && job.state === "pending").sort((a, b) => a.priority - b.priority);
    while (this.active < 2) {
      const first = pending.find((job) => job.state === "pending" && job.next <= Date.now());
      if (!first) break;
      const batch = pending.filter((job) => job.state === "pending" && job.next <= Date.now() && job.target === first.target && job.priority === first.priority).slice(0, first.priority === 0 ? 12 : 4);
      batch.forEach((job) => { job.state = "running"; job.attempts++; });
      this.active++;
      this.notify();
      void this.run(batch);
    }
    const future = pending.filter((job) => job.state === "pending");
    if (future.length && this.active < 2) this.schedule(Math.max(50, Math.min(...future.map((job) => job.next)) - Date.now()));
  }
  private async run(batch: Job[]) {
    try {
      const result = await this.requester(batch, batch[0].target);
      batch.forEach((job, index) => {
        const value = result.translations?.[index];
        if ((result.complete || result.resolved?.[index]) && typeof value === "string" && value.trim()) {
          this.cache.set(job.key, value);
          this.jobs.delete(job.key);
        }
      });
      if (this.cache.size > 5000) for (const key of [...this.cache.keys()].slice(0, this.cache.size - 5000)) this.cache.delete(key);
      this.persist();
    } catch { /* Retry only unresolved fields, never discard completed work. */ }
    finally {
      const wanted = this.wanted();
      for (const job of batch) if (this.jobs.has(job.key)) {
        if (!wanted.has(job.key)) this.jobs.delete(job.key);
        else { job.state = job.attempts >= 4 ? "error" : "pending"; job.next = Date.now() + this.retryDelay * job.attempts; }
      }
      this.active--;
      this.notify();
      this.schedule();
    }
  }
}
export const translationQueue = new TranslationQueue();
