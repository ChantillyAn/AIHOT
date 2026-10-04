// 广艺 AI 学术站首页：定稿原型的版面，数据来自 /api/site/sci。
// 版面是一整块静态骨架（sci/shell.ts），交互在浏览器里由 sci/sci-client.ts 接管；
// 栏目内页（#all-frontier、#all-practice）和「关于」（#about）都在这一页里切换。
import { data as withHeaders, useLoaderData } from "react-router";
import type { Route } from "./+types/sci-home";
import { apiGet } from "../lib/api.server";
import { organizationLd, pageMeta } from "../lib/seo";
import { SciFrame, sciLinks } from "../sci/frame";
import type { SciData } from "../sci/types";

export const links: Route.LinksFunction = () => sciLinks();

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
  return <SciFrame data={data} />;
}
