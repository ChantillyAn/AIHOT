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
}

export interface SciHome {
  home: SciItem[];
  all: SciItem[];
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
  };
}

async function column(section: SciSection, limit: number, now: Date): Promise<Row[]> {
  return sql<Row[]>`
    SELECT p.article_id AS id, p.category, p.title, p.summary, p.url, p.tags, p.story_id, p.sort_at,
      (SELECT a.output->'layout' FROM analyses a WHERE a.article_id = p.article_id ORDER BY a.id DESC LIMIT 1) AS layout
    FROM publications p
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
  const keep = new Set(ordered.filter((_, i) => root(i) === i));
  return rows.filter((r) => keep.has(r));
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
    generatedAt: now.toISOString(),
  };
}
