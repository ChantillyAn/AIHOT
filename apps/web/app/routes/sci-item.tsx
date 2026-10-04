// 学术站导读页（/items/:id）：中文导读、为什么值得看、读原文，旁边是同一事件的其他报道和本栏最新。
import { useMemo } from "react";
import { data as withHeaders, useLoaderData } from "react-router";
import type { Route } from "./+types/sci-item";
import { apiGet, loadOr404 } from "../lib/api.server";
import { pageMeta, titled } from "../lib/seo";
import { SciFrame, sciLinks } from "../sci/frame";
import type { SciData, SciItemPage, SciView } from "../sci/types";

export const links: Route.LinksFunction = () => sciLinks();

export async function loader({ params, request }: Route.LoaderArgs) {
  const [home, page] = await Promise.all([
    apiGet<SciData>("/api/site/sci", { signal: request.signal }),
    loadOr404<SciItemPage>(`/api/site/sci/items/${encodeURIComponent(params.id)}`, { signal: request.signal }),
  ]);
  return withHeaders({ home, page }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  if (!loaderData) return [{ title: titled("内容不存在") }, { name: "robots", content: "noindex" }];
  const { item } = loaderData.page;
  return pageMeta({ path: `/items/${params.id}`, title: item.title, description: item.take || item.sum, type: "article" });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export default function SciItemRoute() {
  const { home, page } = useLoaderData<typeof loader>();
  const view = useMemo<SciView>(() => ({ kind: "item", page }), [page]);
  return <SciFrame data={home} view={view} />;
}
