// 学术站搜索结果页（/search?q=）：首页的框架和搜索栏（小人、眼镜照旧），下面按两栏列出全部结果。
import { useMemo } from "react";
import { data as withHeaders, useLoaderData } from "react-router";
import type { Route } from "./+types/sci-search";
import { apiGet } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { SciFrame, sciLinks } from "../sci/frame";
import type { SciData, SciSearch, SciView } from "../sci/types";

export const links: Route.LinksFunction = () => sciLinks();

export async function loader({ request }: Route.LoaderArgs) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const [home, search] = await Promise.all([
    apiGet<SciData>("/api/site/sci", { signal: request.signal }),
    apiGet<SciSearch>(`/api/site/sci/search?q=${encodeURIComponent(q)}`, { signal: request.signal }),
  ]);
  return withHeaders({ home, search }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const q = loaderData?.search.q ?? "";
  return pageMeta({ path: `/search${q ? `?q=${encodeURIComponent(q)}` : ""}`, title: q ? `搜索：${q}` : "搜索", noindex: true });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export default function SciSearchPage() {
  const { home, search } = useLoaderData<typeof loader>();
  const view = useMemo<SciView>(() => ({ kind: "search", search }), [search]);
  return <SciFrame data={home} view={view} />;
}
