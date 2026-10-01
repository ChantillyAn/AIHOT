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
