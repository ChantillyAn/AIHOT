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
