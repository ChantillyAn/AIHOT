// 广艺 AI 学术站首页：定稿原型的版面，数据来自 /api/site/sci。
// 版面是一整块静态骨架（sci/shell.ts），交互在浏览器里由 sci/sci-client.ts 接管；
// 栏目内页（#all-frontier、#all-practice）和「关于」（#about）都在这一页里切换。
import { useEffect } from "react";
import { data as withHeaders, useLoaderData } from "react-router";
import type { Route } from "./+types/sci-home";
import { apiGet } from "../lib/api.server";
import { organizationLd, pageMeta } from "../lib/seo";
import sciCss from "../sci/sci.css?url";
import { SHELL_HTML } from "../sci/shell";
import type { SciData } from "../sci/types";

// Fonts come from the same mirror as guangyi.me (reachable in mainland China).
const FONTS = "https://fonts.loli.net/css2?family=Noto+Serif+SC:wght@200;500;600&family=Noto+Sans+SC:wght@400;500&family=Long+Cang&display=swap";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.loli.net" },
  { rel: "preconnect", href: "https://gstatic.loli.net", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: FONTS },
  { rel: "stylesheet", href: sciCss },
];

export async function loader({ request }: Route.LoaderArgs) {
  const data = await apiGet<SciData>("/api/site/sci", { signal: request.signal });
  return withHeaders(data, { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } });
}

export function meta() {
  return pageMeta({ path: "/", jsonLd: organizationLd() });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export default function SciHome() {
  const data = useLoaderData<typeof loader>();
  useEffect(() => {
    let cancelled = false;
    void import("../sci/sci-client").then((m) => {
      if (!cancelled) m.initSci(data);
    });
    return () => {
      cancelled = true;
    };
  }, [data]);
  return <div className="sci-page" dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />;
}
