import assert from "node:assert/strict";
import test from "node:test";
import { checkLayout, displayWidth, numbersSupported } from "../packages/backend/src/editorial/layout.ts";

const TITLE = "昆虫大小的飞行机器人，用 AI 控制后速度提高约 450%";
const SRC = "MIT researchers ... 450% faster ... 10 flips in 11 seconds ... may one day aid search and rescue.";

test("frontier: keeps a mark that is in the title, drops practice fields", () => {
  const l = checkLayout({ section: "frontier", mark: "「速度提高约 450%」", take: "掌心大小，11 秒内连翻 10 个跟头。", nameZh: "x", lineZh: "y", keywords: ["机器人", "机器人", "robotics"] }, TITLE, SRC);
  assert.equal(l.mark, "速度提高约 450%");
  assert.equal(l.take, "掌心大小，11 秒内连翻 10 个跟头。");
  assert.equal(l.nameZh, "");
  assert.equal(l.lineZh, "");
  assert.deepEqual(l.keywords, ["机器人", "robotics"]);
});

test("frontier: a mark not in the title, or a take with an invented number, is dropped", () => {
  const l = checkLayout({ section: "frontier", mark: "速度提高五倍", take: "速度提高了 500%，但只在实验室测过。" }, TITLE, SRC);
  assert.equal(l.mark, "");
  assert.equal(l.take, "");
});

test("practice: a name wider than 12 is dropped, mark and take are cleared", () => {
  const l = checkLayout({ section: "practice", mark: "飞行机器人", take: "t", nameZh: "一个非常非常长的工具名字超过十二个字", lineZh: "MIT 斯隆：先说清用了什么工具。" }, TITLE, SRC);
  assert.equal(l.nameZh, "");
  assert.equal(l.mark, "");
  assert.equal(l.take, "");
  assert.equal(l.lineZh, "MIT 斯隆：先说清用了什么工具。");
});

test("widths and numbers", () => {
  assert.equal(displayWidth("NotebookLM"), 5);
  assert.equal(displayWidth("定制 GPT"), 4);
  assert.ok(numbersSupported("约 1,000 人", "about 1000 people"));
  assert.ok(!numbersSupported("约 2000 人", "about 1000 people"));
});
