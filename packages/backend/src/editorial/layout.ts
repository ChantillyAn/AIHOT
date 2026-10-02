// The fields the site's two-column layout shows beside the title and summary (学术前沿 / 学术实践).
// The model writes them in the understanding step; every one is checked here before it is stored, and a
// field that fails its check is dropped (the page then falls back to the title), never shown wrong.
//
//   frontier: mark (a phrase of the title, underlined with the brush stroke) + take (one line, the
//             finding and the limit the source itself states)
//   practice: nameZh (the tool, document or method, set large) + lineZh (whose it is, what it is for)
//   both:     keywords (search only)

export type Section = "frontier" | "practice";

export interface Layout {
  section: Section | null;
  mark: string;
  take: string;
  nameZh: string;
  lineZh: string;
  keywords: string[];
}

export interface LayoutDraft {
  section?: unknown;
  mark?: unknown;
  take?: unknown;
  nameZh?: unknown;
  lineZh?: unknown;
  keywords?: unknown;
}

const EDGE_PUNCT = /^[\s，。、；：？！,.;:?!「」『』“”"'（）()【】《》<>—\-]+|[\s，。、；：？！,.;:?!「」『』“”"'（）()【】《》<>—\-]+$/g;

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Width as the layout counts it: a Han character or full-width sign is 1, two Latin letters or digits are 1. */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch) ? 1 : 0.5;
  return w;
}

/** Every number the line states must appear in the source (the model may not invent or round one). */
export function numbersSupported(line: string, source: string): boolean {
  const nums = line.match(/\d+(?:[.,]\d+)*/g) ?? [];
  const hay = source.replace(/,(?=\d{3}\b)/g, "");
  return nums.every((n) => hay.includes(n.replace(/,(?=\d{3}\b)/g, "")));
}

const NOT_SAID = /(原文|文中|文章)?(未|没有)(提及|说明|详述|披露|给出|提供|涉及)/;

/**
 * The take states the finding and the limit itself, not what "the source" said or left out: a clause about what the
 * source does not mention is cut (a reader cannot do anything with it), and "原文指出" becomes a plain statement.
 */
export function plainTake(take: string): string {
  let t = take.replace(/(，|,)?\s*但(原文|文中|文章)(指出|强调|提醒|表示|称|提到|也指出)?/g, "，但").replace(/^(原文|文中)(指出|强调|称)/, "");
  if (NOT_SAID.test(t)) {
    const cut = t.search(/[，,；;]\s*(但|不过|然而)/);
    t = cut > 0 && !NOT_SAID.test(t.slice(0, cut)) ? `${t.slice(0, cut)}。` : "";
  }
  return t.replace(/，，/g, "，").replace(/^，/, "").trim();
}

/**
 * Checks and trims what the model wrote. `titleZh` is the title actually published (after the identity
 * guard); `source` is the original text the item was written from (title, excerpt, body).
 */
export function checkLayout(draft: LayoutDraft, titleZh: string, source: string): Layout {
  const section = draft.section === "frontier" || draft.section === "practice" ? draft.section : null;
  let mark = str(draft.mark).replace(EDGE_PUNCT, "");
  let take = plainTake(str(draft.take));
  let nameZh = str(draft.nameZh);
  let lineZh = str(draft.lineZh);

  // The underline sits on the published title: the phrase must be in it, verbatim, 2–12 wide.
  if (!mark || !titleZh.includes(mark) || displayWidth(mark) < 2 || displayWidth(mark) > 12 || mark === titleZh) mark = "";
  // One line on the card: a take or line that runs long, or states a number the source does not, is dropped.
  if (!take || displayWidth(take) > 44 || !numbersSupported(take, source) || take === titleZh) take = "";
  if (!lineZh || displayWidth(lineZh) > 44 || !numbersSupported(lineZh, source)) lineZh = "";
  // The name is set large: longer than 12 wide it would wrap, so the title is shown instead.
  if (!nameZh || displayWidth(nameZh) > 12) nameZh = "";

  if (section === "frontier") {
    nameZh = "";
    lineZh = "";
  } else if (section === "practice") {
    mark = "";
    take = "";
  }

  const seen = new Set<string>();
  const keywords = (Array.isArray(draft.keywords) ? draft.keywords : [])
    .map(str)
    .filter((k) => k && k.length <= 30 && !seen.has(k.toLowerCase()) && seen.add(k.toLowerCase()))
    .slice(0, 12);

  return { section, mark, take, nameZh, lineZh, keywords };
}
