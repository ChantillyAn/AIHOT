// Enqueues analysis for articles (development helper). By default only editorial articles that have
// no live model analysis yet; --all re-runs everything (receipts make repeats free); --published re-runs the
// items on the site (selected and public), e.g. after a prompt change, so they are judged by the new rules.
import { parseArgs } from "node:util";
import { closeDb, sql } from "@aihot/backend/db";
import { enqueue, QUEUES, stopBoss } from "@aihot/backend/jobs/queue";

const { values } = parseArgs({ options: { all: { type: "boolean", default: false }, published: { type: "boolean", default: false }, limit: { type: "string", default: "1000" } } });
const rows = await sql<{ id: string }[]>`
  SELECT a.id FROM articles a JOIN sources s ON s.id = a.source_id
  WHERE s.participation_mode = 'editorial'
    ${values.published ? sql`AND EXISTS (SELECT 1 FROM publications p WHERE p.article_id = a.id AND p.selected AND p.visibility = 'public')`
      : values.all ? sql`` : sql`AND NOT EXISTS (SELECT 1 FROM analyses an WHERE an.article_id = a.id AND an.origin = 'model')`}
  ORDER BY a.discovered_at DESC LIMIT ${Number(values.limit)}`;
for (const r of rows) await enqueue(QUEUES.analyze, { articleId: r.id }, { singletonKey: r.id });
console.log(`enqueued ${rows.length}`);
await stopBoss();
await closeDb();
