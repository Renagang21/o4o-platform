/**
 * WO-O4O-HFF-ZH-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1  §3
 * Batch 02 모집단 KO canonical 덤프 (read-only, DB write 0).
 *   - KO STORE canonical 존재 · ZH STORE canonical 부재 (Batch 01 대상 자동 제외)
 *   - 기존 중국어 문제 큐(Batch 01) 제외 · KO 영구 HOLD 제외
 * 산출: <CACHE>/hff-zh-b02-pool.jsonl · data/hff-zh-b02-population-v1.json
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
fs.mkdirSync(CACHE, { recursive: true });
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

const zhQueue = new Set();
for (const q of rdl('hff-zh-deferred-issue-queue-through-batch01-v1.jsonl')) if (q.productMasterId) zhQueue.add(q.productMasterId);
const koHold = new Set();
for (const h of rdl('hff-ko-agent-09-hold-queue-v1.jsonl')) if (h.productMasterId) koHold.add(h.productMasterId);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5631', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT k.master_id, k.id, k.content, pm.name AS product_name
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
   WHERE k.deleted_at IS NULL AND k.source_type='o4o_hff_generated'
     AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions z
        WHERE z.master_id = k.master_id AND z.deleted_at IS NULL
          AND z.source_type='o4o_hff_generated' AND z.description_type='STORE'
          AND z.status='canonical' AND z.language='zh')
   ORDER BY k.master_id`)).rows;
const globals = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND source_type='o4o_hff_generated'
     AND description_type='STORE' AND status='canonical'`)).rows[0];
await c.end();

let exZhQueue = 0, exKoHold = 0;
const pool = rows.filter((r) => {
  if (zhQueue.has(r.master_id)) { exZhQueue++; return false; }
  if (koHold.has(r.master_id)) { exKoHold++; return false; }
  return true;
});
fs.writeFileSync(`${CACHE}/hff-zh-b02-pool.jsonl`,
  pool.map((r) => JSON.stringify({ m: r.master_id, i: r.id, n: r.product_name, c: r.content })).join('\n') + '\n');

const out = {
  wo: 'WO-O4O-HFF-ZH-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1',
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  globalsBefore: globals,
  koCanonicalWithoutZh: rows.length,
  excludedZhIssueQueue: exZhQueue, excludedKoPermanentHold: exKoHold,
  candidatePool: pool.length,
  masterDup: pool.length - new Set(pool.map((r) => r.master_id)).size,
  koCanonicalDup: pool.length - new Set(pool.map((r) => r.id)).size,
  target: 10000, poolCoversTarget: pool.length >= 10000,
};
fs.writeFileSync(`${D}/hff-zh-b02-population-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
