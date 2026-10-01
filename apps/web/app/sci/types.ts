/** One collected item as the academic homepage shows it (see packages/backend/src/publication/sci.ts). */
export interface SciItem {
  id: string;
  sec: "frontier" | "practice";
  title: string;
  sum: string;
  url: string;
  host: string;
  /** Frontier: a phrase of the title to underline, and one line (the finding and the limit the source states). */
  mark: string;
  take: string;
  /** Practice: the tool, document or method set large, and one line (whose it is, what it is for). */
  name: string;
  line: string;
  /** Search words, space separated. */
  kw: string;
}

export interface SciData {
  /** The newest five of each column, shown on the homepage. */
  home: SciItem[];
  /** Everything recent, for the column pages, the flip deck and search. */
  all: SciItem[];
  generatedAt: string;
}
