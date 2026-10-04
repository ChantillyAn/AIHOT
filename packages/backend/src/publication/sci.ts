// The academic homepage (广艺 AI 学术站): the newest selected items of the two columns, with the layout
// fields the understanding step wrote (editorial/layout.ts). Reads the same public set as the timeline:
// public, selected and past the release gate.
import { sql } from "../db.ts";
import { displayWidth, plainTake } from "../editorial/layout.ts";
import { selectedCondition } from "./items.ts";

export type SciSection = "frontier" | "practice";

export interface SciItem {
  id: string;
  sec: SciSection;
  title: string;
  sum: string;
  url: string;
  host: string;
  mark: string;
  take: string;
  name: string;
  line: string;
  kw: string;
  /** The source's publication day (Asia/Shanghai, YYYY-MM-DD), or "" when unknown. */
  date: string;
}

/** One item on its own page: the homepage fields plus what only the page shows. */
export interface SciItemFull extends SciItem {
  originalTitle: string;
  reason: string;
  source: string;
  keywords: string[];
}

export interface SciItemPage {
  item: SciItemFull;
  /** Every report of the same event, oldest first, this one included (empty when it stands alone). */
  timeline: SciItem[];
  /** The newest items of the same column, the event left out. */
  latest: SciItem[];
}

export interface SciSearch {
  q: string;
  items: SciItem[];
  generatedAt: string;
}

export interface SciHome {
  home: SciItem[];
  all: SciItem[];
  /** When the newest item reached the site (ISO), or "" before the first one. */
  updatedAt: string;
  generatedAt: string;
}

interface Row {
  id: string;
  category: SciSection;
  title: string;
  summary: string | null;
  url: string;
  tags: string[];
  layout: Record<string, unknown> | null;
  story_id?: string | null;
  sort_at?: Date;
  published_at?: Date | null;
  original_title?: string | null;
  reason?: string | null;
  source_name?: string | null;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The summary's first sentence when it fits on one line of the card; otherwise nothing. */
export function firstLine(summary: string): string {
  const m = summary.match(/^[^。！？!?；;]+[。！？!?；;]?/);
  const s = (m ? m[0] : summary).trim();
  return s && displayWidth(s) <= 44 ? s : "";
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** One row as the page shows it; a field the model did not write (or that failed its check) falls back. */
export function toSciItem(r: Row): SciItem {
  const l = r.layout ?? {};
  const sum = r.summary ?? "";
  const mark = str(l.mark);
  const name = r.category === "practice" ? str(l.nameZh) : "";
  const line = r.category === "practice" ? str(l.lineZh) || firstLine(sum) : "";
  const keywords = Array.isArray(l.keywords) ? (l.keywords as unknown[]).map(str).filter(Boolean) : [];
  return {
    id: r.id,
    sec: r.category,
    title: r.title,
    sum,
    url: r.url,
    host: host(r.url),
    // An editor may have changed the title since: the phrase must still be in it.
    mark: r.category === "frontier" && mark && r.title.includes(mark) ? mark : "",
    take: plainTake(str(l.take)) || firstLine(sum),
    name,
    line,
    kw: [...keywords, ...(r.tags ?? [])].join(" "),
    date: day(r.published_at ?? r.sort_at ?? null),
  };
}

/** A calendar day as readers in China see it. */
function day(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

async function column(section: SciSection, limit: number, now: Date): Promise<Row[]> {
  return sql<Row[]>`
    SELECT p.article_id AS id, p.category, p.title, p.summary, p.url, p.tags, p.story_id, p.sort_at,
      p.published_at, p.original_title, p.reason, s.name AS source_name,
      (SELECT a.output->'layout' FROM analyses a WHERE a.article_id = p.article_id ORDER BY a.id DESC LIMIT 1) AS layout
    FROM publications p LEFT JOIN sources s ON s.id = p.source_id
    WHERE ${selectedCondition(now)} AND p.category = ${section}
    ORDER BY p.sort_at DESC, p.article_id
    LIMIT ${limit}`;
}

// Names that say who published, not what happened, and method words many papers share
// ("基于 LoRA 的…" and "LoRA 修复…" are different work): they never make two items the same event.
const NOT_EVENT = new Set(["ai", "llm", "llms", "gpt", "chatgpt", "claude", "gemini", "openai", "anthropic", "google", "deepmind",
  "meta", "microsoft", "nature", "science", "mit", "mi", "arc", "agi", "ml", "api", "import", "scholarly", "kitchen", "research", "lab",
  "lora", "transformer", "transformers", "arxiv", "agent", "agents"]);

/**
 * The distinctive Latin names in a title (SynthID Bio → "synthidbio"), the clue that two items from different
 * sources report one event when the grouping step has not tied them to a story (history items are not grouped).
 * A name made only of publisher words ("Nature MI", "Import AI 469") does not count.
 */
export function eventNames(title: string): string[] {
  const out = new Set<string>();
  for (const m of title.match(/[A-Za-z][A-Za-z0-9\-. ]*[A-Za-z0-9]/g) ?? []) {
    const words = m.toLowerCase().split(/[\s\-.]+/).filter(Boolean);
    if (words.every((w) => NOT_EVENT.has(w) || /^\d+$/.test(w))) continue;
    const key = words.join("");
    if (key.length >= 4) out.add(key);
  }
  return [...out];
}

const squash = (s: string) => s.toLowerCase().replace(/[\s\-.·]+/g, "");
const HAN = /[一-鿿]/;

/** The words the model wrote about an item (its keywords and tags), lower case, entity markers left out. */
function keywordTokens(r: Row): Set<string> {
  const kw = Array.isArray(r.layout?.keywords) ? (r.layout!.keywords as unknown[]).map(str) : [];
  return new Set([...kw, ...(r.tags ?? [])].join(" ").toLowerCase().split(/\s+/).filter((t) => t && !t.startsWith("entity:")));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let both = 0;
  for (const t of a) if (b.has(t)) both += 1;
  return both / Math.max(1, a.size + b.size - both);
}

/**
 * Two reports of one event whose titles do not share a Latin name: a Chinese title and an English one
 * (纳维-斯托克斯 / Navier-Stokes), or two Chinese titles. Either the English name in one title is among the
 * other's keywords, or both titles carry the same rare keyword (in no third title); in both cases the two
 * keyword lists must also overlap, so a shared method word alone ("Perturb-seq", "同行评审") merges nothing.
 */
function sameEventByWords(a: Row, b: Row, titleCount: (term: string) => number): boolean {
  const ka = keywordTokens(a), kb = keywordTokens(b);
  const overlap = jaccard(ka, kb);
  if (overlap >= 0.3) {
    const kwA = squash([...ka].join(" ")), kwB = squash([...kb].join(" "));
    if (eventNames(a.title).some((n) => kwB.includes(n)) || eventNames(b.title).some((n) => kwA.includes(n))) return true;
  }
  if (overlap >= 0.2) {
    const ta = squash(a.title), tb = squash(b.title);
    for (const t of ka) {
      if (!kb.has(t)) continue;
      const s = squash(t);
      if (NOT_EVENT.has(s) || s.length < (HAN.test(s) ? 3 : 6)) continue;
      if (ta.includes(s) && tb.includes(s) && titleCount(s) <= 2) return true;
    }
  }
  return false;
}

/** One item per event across both columns: the newest report stays, in whichever column it was put. */
export function dedupeEvents(rows: Row[]): Row[] {
  const keep = new Set(eventGroups(rows).map((g) => g[0]!));
  return rows.filter((r) => keep.has(r));
}

/** Reports grouped by event, each group newest first, groups in the order of their newest report. */
export function eventGroups(rows: Row[]): Row[][] {
  const ordered = [...rows].sort((a, b) => (b.sort_at?.getTime() ?? 0) - (a.sort_at?.getTime() ?? 0));
  const titles = rows.map((r) => squash(r.title));
  const titleCount = (term: string) => titles.filter((t) => t.includes(term)).length;
  // Reports join one event through any chain of matches (A~B, B~C: one event even when A and C share
  // nothing), then the newest of each event stays.
  const parent = ordered.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const join = (i: number, j: number) => { const a = root(i), b = root(j); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
  const byKey = new Map<string, number>();
  ordered.forEach((r, i) => {
    for (const k of [...(r.story_id ? [`story:${r.story_id}`] : []), ...eventNames(r.title).map((n) => `name:${n}`)]) {
      const first = byKey.get(k);
      if (first === undefined) byKey.set(k, i);
      else join(first, i);
    }
  });
  for (let i = 0; i < ordered.length; i += 1)
    for (let j = i + 1; j < ordered.length; j += 1)
      if (root(i) !== root(j) && sameEventByWords(ordered[i]!, ordered[j]!, titleCount)) join(i, j);
  // The smallest index of a group is its newest report, and every root is the smallest index of its group.
  const groups = new Map<number, Row[]>();
  ordered.forEach((r, i) => {
    const g = groups.get(root(i));
    if (g) g.push(r);
    else groups.set(root(i), [r]);
  });
  return [...groups.values()];
}

/** Five per column on the homepage; up to `limit` per column for the column pages, the flip deck and search. */
export async function loadSciHome(limit = 60, now = new Date()): Promise<SciHome> {
  const [f, p] = await Promise.all([column("frontier", limit + 20, now), column("practice", limit + 20, now)]);
  const kept = dedupeEvents([...f, ...p]);
  const frontier = kept.filter((r) => r.category === "frontier").slice(0, limit).map(toSciItem);
  const practice = kept.filter((r) => r.category === "practice").slice(0, limit).map(toSciItem);
  return {
    home: [...frontier.slice(0, 5), ...practice.slice(0, 5)],
    all: [...frontier, ...practice],
    updatedAt: kept.reduce<Date | null>((m, r) => (r.sort_at && (!m || r.sort_at > m) ? r.sort_at : m), null)?.toISOString() ?? "",
    generatedAt: now.toISOString(),
  };
}

/** Everything selected in the two columns, newest first: the pool the search and the item pages read. */
async function pool(now: Date): Promise<Row[]> {
  const [f, p] = await Promise.all([column("frontier", 1000, now), column("practice", 1000, now)]);
  return [...f, ...p].sort((a, b) => (b.sort_at?.getTime() ?? 0) - (a.sort_at?.getTime() ?? 0));
}

const STOP_GRAMS = new Set(["怎么", "什么", "如何", "一下", "可以", "我想", "哪些", "这个", "一个"]);

/** The words a search looks through, lower case. */
function haystack(r: Row): string {
  const it = toSciItem(r);
  return `${it.title} ${it.sum} ${it.name} ${it.line} ${it.take} ${it.kw}`.toLowerCase();
}

/**
 * The homepage search over every selected item instead of the newest 120: whole words first, and when
 * none matches, two-character pieces of the Chinese (the rule the homepage applies in the browser).
 * One item per event, newest first.
 */
export function searchRows(rows: Row[], q: string): Row[] {
  const terms = q.trim().toLowerCase().split(/[\s，,。、]+/).filter(Boolean);
  if (!terms.length) return [];
  const kept = dedupeEvents(rows).sort((a, b) => (b.sort_at?.getTime() ?? 0) - (a.sort_at?.getTime() ?? 0));
  const hits = kept.filter((r) => { const h = haystack(r); return terms.some((t) => h.includes(t)); });
  if (hits.length) return hits;
  const grams = terms.flatMap((t) => {
    const han = t.replace(/[^一-鿿]/g, "");
    return Array.from({ length: Math.max(0, han.length - 1) }, (_, i) => han.slice(i, i + 2));
  }).filter((g) => !STOP_GRAMS.has(g));
  return kept
    .map((r) => { const h = haystack(r); return { r, n: grams.filter((g) => h.includes(g)).length }; })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.r);
}

export async function searchSci(q: string, now = new Date()): Promise<SciSearch> {
  const query = q.trim().slice(0, 60);
  const items = query ? searchRows(await pool(now), query).slice(0, 200).map(toSciItem) : [];
  return { q: query, items, generatedAt: now.toISOString() };
}

/** One item's page: its own fields, the other reports of its event, and the newest of its column. */
export function itemPage(rows: Row[], id: string): SciItemPage | null {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const group = eventGroups(rows).find((g) => g.includes(row)) ?? [row];
  const inGroup = new Set(group);
  const l = row.layout ?? {};
  const keywords = Array.isArray(l.keywords) ? (l.keywords as unknown[]).map(str).filter(Boolean) : [];
  const original = str(row.original_title);
  return {
    item: {
      ...toSciItem(row),
      originalTitle: original !== row.title ? original : "",
      reason: str(row.reason),
      source: str(row.source_name),
      keywords: keywords.slice(0, 8),
    },
    timeline: group.length > 1 ? [...group].reverse().map(toSciItem) : [],
    latest: rows.filter((r) => r.category === row.category && !inGroup.has(r)).slice(0, 3).map(toSciItem),
  };
}

export async function loadSciItem(id: string, now = new Date()): Promise<SciItemPage | null> {
  return itemPage(await pool(now), id);
}
