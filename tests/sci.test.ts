// The academic homepage's items: what the model wrote is shown when it still fits the published row,
// and every field the model left out falls back to the summary instead of showing nothing wrong.
import assert from "node:assert/strict";
import test from "node:test";
import { firstLine, toSciItem } from "../packages/backend/src/publication/sci.ts";

const base = {
  id: "a1",
  title: "Anthropic 称 Claude 在 21 小时里找到一类新的酶系统",
  summary: "找到一类带 CRISPR 式重复序列的新系统。它的功能还不清楚，需要实验验证。",
  url: "https://www.anthropic.com/research/x",
  tags: ["生物", "研究进展"],
};

test("firstLine takes the first sentence only when it fits one card line", () => {
  assert.equal(firstLine(base.summary), "找到一类带 CRISPR 式重复序列的新系统。");
  assert.equal(firstLine("这".repeat(60) + "。"), "");
  assert.equal(firstLine(""), "");
});

test("frontier: mark kept only while it is in the title; take falls back to the first line", () => {
  const ok = toSciItem({ ...base, category: "frontier", layout: { mark: "一类新的酶系统", take: "", keywords: ["CRISPR"] } });
  assert.equal(ok.mark, "一类新的酶系统");
  assert.equal(ok.take, "找到一类带 CRISPR 式重复序列的新系统。");
  assert.equal(ok.host, "anthropic.com");
  assert.equal(ok.kw, "CRISPR 生物 研究进展");
  assert.equal(ok.name, "");

  const edited = toSciItem({ ...base, category: "frontier", layout: { mark: "旧标题里的词" } });
  assert.equal(edited.mark, "");
});

test("practice: name and line from the model, line falls back; no layout at all still renders", () => {
  const p = toSciItem({ ...base, category: "practice", layout: { nameZh: "NotebookLM", lineZh: "", mark: "酶系统" } });
  assert.equal(p.name, "NotebookLM");
  assert.equal(p.line, "找到一类带 CRISPR 式重复序列的新系统。");
  assert.equal(p.mark, "", "the underline belongs to the frontier column");

  const bare = toSciItem({ ...base, category: "practice", summary: null, tags: [], url: "not a url", layout: null });
  assert.deepEqual([bare.name, bare.line, bare.take, bare.host, bare.kw, bare.sum], ["", "", "", "", "", ""]);
});

test("one event across both columns: the newest report stays, publisher names never merge items", async () => {
  const { dedupeEvents, eventNames } = await import("../packages/backend/src/publication/sci.ts");
  assert.deepEqual(eventNames("DeepMind发布SynthID Bio：AI生成蛋白质的水印技术"), ["synthidbio"]);
  assert.deepEqual(eventNames("Nature MI：分钟级训练微型机器人导航策略"), []);
  assert.deepEqual(eventNames("Import AI 469：DiG-bench 基准"), ["digbench"]);
  const row = (id: string, category: "frontier" | "practice", title: string, t: number, story_id: string | null = null) =>
    ({ id, category, title, summary: "", url: "", tags: [], layout: null, story_id, sort_at: new Date(t) });
  const rows = [
    row("a", "frontier", "DeepMind发布SynthID Bio：AI生成蛋白质的水印技术", 3),
    row("b", "practice", "DeepMind 开发 SynthIDBio 为 AI 蛋白加隐形水印", 2),
    row("c", "frontier", "Nature MI：分钟级训练微型机器人导航策略", 1),
    row("d", "frontier", "Nature MI：多任务神经网络涌现模块化", 0),
    row("e", "practice", "某大学的课堂规定", 5, "s1"),
    row("f", "frontier", "另一家媒体的同一报道", 4, "s1"),
  ];
  assert.deepEqual(dedupeEvents(rows).map((r) => r.id), ["a", "c", "d", "e"]);
});

test("one event under a Chinese and an English name, or a rare shared word; method words never merge", async () => {
  const { dedupeEvents } = await import("../packages/backend/src/publication/sci.ts");
  const row = (id: string, title: string, kw: string, t: number, category: "frontier" | "practice" = "frontier") =>
    ({ id, category, title, summary: "", url: "", tags: [], layout: { keywords: kw.split(" ") }, story_id: null, sort_at: new Date(t) });
  const ns = "OpenAI 纳维-斯托克斯方程 Navier-Stokes 千禧年难题 流体力学 数学证明 数学";
  const rows = [
    row("en", "专家质疑 OpenAI 未解决真正的 Navier-Stokes 问题", "Navier-Stokes OpenAI 千禧年难题 数学证明 流体力学 质疑 数学", 9),
    row("zh1", "OpenAI 发布纳维-斯托克斯方程 AI 解法", ns, 8),
    row("zh2", "OpenAI 称 AI 破解纳维-斯托克斯方程", `${ns} 湍流 奇点`, 7),
    row("m1", "Downes：生成式 AI 是元工具而非普通工具", "生成式 元工具 认知再分配 Ungrading 现象/趋势 教育评价", 6, "practice"),
    row("m2", "Jon Dron谈生成式AI：它是元工具而非人类伙伴", "生成式AI 元工具 认知再分配 Ungrading 现象/趋势 人机关系", 5, "practice"),
    row("l1", "B-BiLO：基于LoRA的双层算子学习用于PDE反问题", "LoRA 算子学习 PDE 不确定性量化", 4),
    row("l2", "LoRA 修复 Transformer 过早停止思考问题", "LoRA Transformer 推理 微调", 3),
    row("p1", "Silverchair高管谈AI时代同行评审的三角困境", "同行评审 出版 AI 治理 现象/趋势 学术出版", 2, "practice"),
    row("p2", "学者谈同行评审容量：AI 冲击下的尴尬真相", "同行评审 出版 AI 容量 现象/趋势 学术出版", 1, "practice"),
    row("p3", "同行评审是否因熟悉度而抑制创新？", "同行评审 创新 熟悉度 研究评价", 0, "practice"),
  ];
  assert.deepEqual(dedupeEvents(rows).map((r) => r.id), ["en", "m1", "l1", "l2", "p1", "p2", "p3"]);
});

test("search page: whole words first, then two-character pieces; one item per event", async () => {
  const { searchRows } = await import("../packages/backend/src/publication/sci.ts");
  const row = (id: string, title: string, kw: string, t: number, category: "frontier" | "practice" = "frontier") =>
    ({ id, category, title, summary: "", url: "", tags: [], layout: { keywords: kw.split(" ") }, story_id: null, sort_at: new Date(t) });
  const rows = [
    row("a", "AI 证明渗流理论猜想", "数学 证明", 5),
    row("b", "OpenAI 发布纳维-斯托克斯方程 AI 解法", "OpenAI 纳维-斯托克斯方程 Navier-Stokes 千禧年难题 数学", 4),
    row("c", "专家质疑 OpenAI 未解决真正的 Navier-Stokes 问题", "Navier-Stokes OpenAI 千禧年难题 数学 质疑", 6),
    row("d", "高校课堂 AI 规定", "教学 规定", 3, "practice"),
  ];
  assert.deepEqual(searchRows(rows, "数学").map((r) => r.id), ["c", "a"], "the Navier-Stokes reports count once, the newest");
  assert.deepEqual(searchRows(rows, "课堂教学怎么办").map((r) => r.id), ["d"], "no whole-word hit: pieces of the Chinese");
  assert.deepEqual(searchRows(rows, "   "), []);
});

test("item page: the event's reports oldest first, the column's newest without them", async () => {
  const { itemPage } = await import("../packages/backend/src/publication/sci.ts");
  const row = (id: string, title: string, kw: string, t: number, category: "frontier" | "practice" = "frontier") =>
    ({ id, category, title, summary: "摘要。", url: `https://example.org/${id}`, tags: [], layout: { keywords: kw.split(" "), take: `${id} 要点` },
      story_id: null, sort_at: new Date(Date.UTC(2026, 8, t)), published_at: new Date(Date.UTC(2026, 8, t)), original_title: `Original ${id}`, reason: "值得看。", source_name: "源" });
  const rows = [
    row("n", "最新的一条", "其他", 30),
    row("c", "专家质疑 OpenAI 未解决真正的 Navier-Stokes 问题", "Navier-Stokes OpenAI 千禧年难题 数学 质疑", 22),
    row("b", "OpenAI 发布纳维-斯托克斯方程 AI 解法", "OpenAI 纳维-斯托克斯方程 Navier-Stokes 千禧年难题 数学", 8),
    row("p", "实践栏的一条", "教学", 29, "practice"),
  ];
  const page = itemPage(rows, "c")!;
  assert.equal(page.item.originalTitle, "Original c");
  assert.equal(page.item.reason, "值得看。");
  assert.equal(page.item.date, "2026-09-22");
  assert.deepEqual(page.timeline.map((x) => x.id), ["b", "c"]);
  assert.deepEqual(page.latest.map((x) => x.id), ["n"]);
  assert.deepEqual(itemPage(rows, "n")!.timeline, [], "an item alone has no timeline");
  assert.equal(itemPage(rows, "missing"), null);
});
