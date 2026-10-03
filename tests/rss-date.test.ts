// Feed dates: RFC 822 and ISO as before, plus the Drupal form some older Inside Higher Ed items carry,
// so a first import's age limit can drop them instead of treating them as undated.
import assert from "node:assert/strict";
import test from "node:test";
import { parseDate } from "../packages/backend/src/sources/rss.ts";

test("parseDate reads RFC 822, ISO and Drupal dates", () => {
  assert.equal(parseDate("Wed, 30 Sep 26 19:32:00 -0400")?.toISOString(), "2026-09-30T23:32:00.000Z");
  assert.equal(parseDate("2026-10-02T08:00:00Z")?.toISOString(), "2026-10-02T08:00:00.000Z");
  assert.equal(parseDate("Tue, 02/21/2023 - 02:00 PM")?.toISOString(), "2023-02-21T14:00:00.000Z");
  assert.equal(parseDate("Mon, 01/30/2023 - 12:15 AM")?.toISOString(), "2023-01-30T00:15:00.000Z");
  assert.equal(parseDate("Sun, 07/10/2022 - 18:05")?.toISOString(), "2022-07-10T18:05:00.000Z");
  assert.equal(parseDate("not a date"), null);
  assert.equal(parseDate(""), null);
});
