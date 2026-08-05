/**
 * WO-O4O-HFF-ZH-ALL-REMAINING-10414-DIRECT-BULK-PRODUCTION-AND-TRACK-CLOSURE-V1  §7
 * 잔여(ZH 부재) 문서 중 지금 자산으로 정상 생산 가능한 건의 출처 분류 (read-only).
 */
import fs from 'node:fs';
import pg from 'pg';
import { build } from './hff-zh-b01-build.mjs';

const D = 'apps/api-server/src/scripts/data';
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l)) : []);
const QUEUE = new Map(rdl('hff-zh-deferred-issue-queue-through-final-v1.jsonl').map((q) => [q.productMasterId, q.issueType]));
const KOHOLD = new Set(rdl('hff-ko-agent-09-hold-queue-v1.jsonl').map((h) => h.productMasterId).filter(Boolean));

const c = new pg.Client({ host: '127.0.0.1', port: 5463, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const rows = (await c.query(`
  SELECT k.master_id, k.content FROM shared_product_descriptions k
   WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko' AND k.source_type='o4o_hff_generated'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions z
                      WHERE z.deleted_at IS NULL AND z.master_id=k.master_id AND z.description_type='STORE'
                        AND z.status='canonical' AND z.language='zh' AND z.source_type='o4o_hff_generated')`)).rows;
await c.end();

const tally = {};
const producible = [];
for (const r of rows) {
  if (!r.content || !/<h2|<li/.test(r.content)) { tally.DAMAGED = (tally.DAMAGED ?? 0) + 1; continue; }
  const b = build(r.content);
  if (b.misses.length || b.hangul) { tally.STILL_UNRESOLVED = (tally.STILL_UNRESOLVED ?? 0) + 1; continue; }
  const src = QUEUE.has(r.master_id) ? `QUEUE:${QUEUE.get(r.master_id)}` : (KOHOLD.has(r.master_id) ? 'KO_HOLD' : 'OTHER');
  tally[src] = (tally[src] ?? 0) + 1;
  producible.push({ m: r.master_id, src });
}
console.log(JSON.stringify({ residual: rows.length, producible: producible.length, tally }, null, 1));
fs.writeFileSync(`${D}/hff-zh-final-residual-producible-v1.json`, JSON.stringify(producible, null, 1));
