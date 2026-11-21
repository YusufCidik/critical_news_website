import { normalizeNewsText } from "./categories";
import { newsSentences } from "./text";

interface Report {
  id: string;
  original_title: string;
  executive_summary: string;
  publisher: string;
  source_url: string;
  published_at: string;
}

export interface EventBadge { id: string; reports: number; publishers: number }
export interface EventReport { id: string; title: string; excerpt: string; publisher: string; url: string; publishedAt: string }
export interface EventCoverage extends EventBadge {
  timeline: EventReport[];
  highlights: EventReport[];
  disagreements: { metric: "fatalities"; claims: { reportId: string; value: number; evidence: string }[] }[];
}

const HOUR = 3_600_000;
const stopWords = new Set("about after again amid and are before breaking could days from have into latest live more news says some than that their them there these they this through today update updates with would year olan icin sonra kadar yeni haber durch avec dans pour sobre para".split(" "));
const identity = (title: string) => normalizeNewsText(title).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function terms(title: string) {
  return new Set(identity(title).split(" ").filter((word) => word.length >= 3 && !stopWords.has(word)).slice(0, 30));
}

const relativeLocation = /\b(?:in|near|outside|at) ([\p{Lu}][\p{L}’'-]+(?: [\p{Lu}][\p{L}’'-]+){0,2})(?=[,.;:!?]|\s|$)/gu;
const nonLocations = /^(?:January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;
function locations(title: string) {
  return [...title.matchAll(relativeLocation)].filter((match) => !nonLocations.test(match[1])).map((match) => normalizeNewsText(match[1]));
}
interface IndexedReport { report: Report; title: string; terms: Set<string>; locations: string[]; date: number; eventId: string }
interface Group { anchor: IndexedReport; members: Set<string> }

/** Retains group membership through warm refreshes. Candidate retrieval is
 * bounded by headline terms and comparisons only use the original anchor. */
export class EventIndex {
  private reports = new Map<string, IndexedReport>();
  private groups = new Map<string, Group>();
  private postings = new Map<string, Set<string>>();
  private exact = new Map<string, Set<string>>();

  update(reports: readonly Report[]) {
    const current = new Set(reports.map(({ id }) => id));
    for (const [id, entry] of this.reports) {
      if (!current.has(id)) {
        this.reports.delete(id);
        const group = this.groups.get(entry.eventId)!;
        group.members.delete(id);
        if (group.members.size === 0) this.removeGroup(entry.eventId, group);
      }
    }
    const additions: Report[] = [];
    for (const report of reports) {
      const existing = this.reports.get(report.id);
      if (existing) existing.report = report;
      else additions.push(report);
    }
    additions.sort((a, b) => a.published_at.localeCompare(b.published_at) || a.id.localeCompare(b.id));
    for (const report of additions) this.add(report);
  }

  badge(reportId: string): EventBadge | undefined {
    const entry = this.reports.get(reportId);
    if (!entry) return;
    const { members } = this.groups.get(entry.eventId)!;
    if (members.size < 2) return;
    return { id: entry.eventId, reports: members.size, publishers: new Set([...members].map((id) => this.reports.get(id)!.report.publisher)).size };
  }

  coverage(reportId: string): EventCoverage | undefined {
    const badge = this.badge(reportId);
    if (!badge) return;
    const { members } = this.groups.get(badge.id)!;
    const reports = [...members].map((id) => this.reports.get(id)!.report)
      .sort((a, b) => b.published_at.localeCompare(a.published_at) || a.id.localeCompare(b.id));
    const newestPerPublisher = [...new Map([...reports].reverse().map((report) => [report.publisher, report])).values()]
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
    const selected = new Map([...newestPerPublisher.slice(0, 12), ...reports.slice(0, 12)].map((report) => [report.id, report]));
    const timeline = [...selected.values()].sort((a, b) => a.published_at.localeCompare(b.published_at))
      .map((r) => ({ id: r.id, title: r.original_title, excerpt: r.executive_summary === r.original_title ? "" : r.executive_summary, publisher: r.publisher, url: r.source_url, publishedAt: r.published_at }));
    const highlightText = new Set<string>();
    const preferred = new Set(newestPerPublisher.map(({ id }) => id));
    const highlights: EventReport[] = [];
    for (const report of [...timeline].reverse()) {
      if (!preferred.has(report.id)) continue;
      const key = identity(report.excerpt || report.title);
      if (highlightText.has(key)) continue;
      highlightText.add(key);
      highlights.push(report);
      if (highlights.length === 3) break;
    }
    return { ...badge, timeline, highlights, disagreements: conflictingCounts(newestPerPublisher.filter(({ id }) => selected.has(id))) };
  }

  private removeGroup(id: string, { anchor }: Group) {
    this.groups.delete(id);
    for (const term of anchor.terms) {
      const posting = this.postings.get(term)!;
      posting.delete(id);
      if (!posting.size) this.postings.delete(term);
    }
    const equal = this.exact.get(anchor.title)!;
    equal.delete(id);
    if (!equal.size) this.exact.delete(anchor.title);
  }

  private add(report: Report) {
    const title = identity(report.original_title);
    const tokens = terms(report.original_title);
    const places = locations(report.original_title);
    const date = Date.parse(report.published_at);
    const candidates = new Map<string, number>();
    for (const token of tokens) {
      const posting = this.postings.get(token);
      if (posting && posting.size <= 120) {
        for (const id of posting) candidates.set(id, (candidates.get(id) ?? 0) + 1);
      }
    }
    if (tokens.size >= 4) {
      for (const sameTitle of this.exact.get(title) ?? []) candidates.set(sameTitle, tokens.size);
    }
    let eventId = report.id;
    let best = 0;
    for (const [id, shared] of candidates) {
      const { anchor } = this.groups.get(id)!;
      if (shared < 4 || Math.abs(date - anchor.date) > 36 * HOUR) continue;
      if (places.length && anchor.locations.length && !places.some((place) =>
        anchor.locations.some((other) => place === other || place.startsWith(other + " ") || other.startsWith(place + " ")))) continue;
      const overlap = shared / (tokens.size + anchor.terms.size - shared);
      const hasDistinguishingTerm = [...tokens].some((token) => anchor.terms.has(token) && (this.postings.get(token)?.size ?? 0) <= 25);
      if ((title !== anchor.title && (overlap < 0.54 || !hasDistinguishingTerm)) || overlap < best) continue;
      if (overlap === best && id >= eventId) continue;
      eventId = id;
      best = overlap;
    }
    const entry = { report, title, terms: tokens, locations: places, date, eventId };
    if (!this.groups.has(eventId)) {
      this.groups.set(eventId, { anchor: entry, members: new Set() });
      for (const token of tokens) {
        if (!this.postings.has(token)) this.postings.set(token, new Set());
        this.postings.get(token)!.add(eventId);
      }
      if (!this.exact.has(title)) this.exact.set(title, new Set());
      this.exact.get(title)!.add(eventId);
    }
    this.groups.get(eventId)!.members.add(report.id);
    this.reports.set(report.id, entry);
  }
}

function conflictingCounts(reports: Report[]): EventCoverage["disagreements"] {
  const claims = reports.flatMap((report) => {
    const passages = newsSentences(report.executive_summary, 6);
    const counts = passages.flatMap((evidence) => {
      if (/\b(?:at least|over|more than|up to|could|estimat\w*|unconfirmed|earlier|initially|previously|expected|fears?|denied|denies|false|rumou?rs?|not)\b/i.test(evidence)) return [];
      const matches = [...evidence.matchAll(/\b(\d{1,7}) (?:people (?:were |are )?(?:killed|dead)|deaths|fatalities)\b/gi)];
      return matches.length === 1 ? [{ value: Number(matches[0][1]), evidence }] : [];
    });
    if (counts.length !== 1) return [];
    return [{ reportId: report.id, ...counts[0], date: Date.parse(report.published_at) }];
  });
  for (const [i, first] of claims.entries()) {
    const second = claims.slice(i + 1).find((claim) => claim.value !== first.value && Math.abs(claim.date - first.date) <= 6 * HOUR);
    if (second) {
      return [{ metric: "fatalities", claims: [first, second].map(({ reportId, value, evidence }) => ({ reportId, value, evidence })) }];
    }
  }
  return [];
}
