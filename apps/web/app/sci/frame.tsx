// The frame every academic page shares: the finished design's shell (sci/shell.ts) and its stylesheet;
// the browser script (sci/sci-client.ts) fills it with the homepage data and, on the search and item
// pages, with that page's content.
import { useEffect } from "react";
import sciCss from "./sci.css?url";
import { SHELL_HTML } from "./shell";
import type { SciData, SciView } from "./types";

// Fonts come from the same mirror as guangyi.me (reachable in mainland China).
const FONTS = "https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@200;500;600&family=Noto+Sans+SC:wght@400;500&family=Long+Cang&display=swap";

export function sciLinks() {
  return [
    { rel: "preconnect", href: "https://fonts.loli.net" },
    { rel: "preconnect", href: "https://gstatic.loli.net", crossOrigin: "anonymous" as const },
    { rel: "stylesheet", href: FONTS },
    { rel: "stylesheet", href: sciCss },
  ];
}

export function SciFrame({ data, view }: { data: SciData; view?: SciView }) {
  useEffect(() => {
    let cancelled = false;
    void import("./sci-client").then((m) => {
      if (!cancelled) m.initSci(data, view);
    });
    return () => {
      cancelled = true;
    };
  }, [data, view]);
  return <div className="sci-page" dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />;
}
