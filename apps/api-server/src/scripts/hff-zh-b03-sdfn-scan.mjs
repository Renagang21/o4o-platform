/**
 * WO-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1  §6
 * Batch 02 문제 큐의 sd-fn RENDER_FAILURE 12건이 실제로 어떤 마크업을 쓰는지 확인한다(read-only).
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const queue = fs.readFileSync(`${D}/hff-zh-deferred-issue-queue-through-batch02-v1.jsonl`, 'utf8')
  .split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l));
const ids = queue.filter((q) => q.issueType === 'RENDER_FAILURE').map((q) => q.productMasterId);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform' });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
const rows = (await c.query(`
  SELECT master_id, content FROM shared_product_descriptions
   WHERE master_id = ANY($1) AND deleted_at IS NULL AND source_type='o4o_hff_generated'
     AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko'`, [ids])).rows;
await c.end();

const one = rows[0];
const block = one.content.match(/<h2>[^<]*<\/h2>\s*<ul class="sd-fn">[\s\S]*?<\/ul>/) ?? one.content.match(/<ul class="sd-fn">[\s\S]*?<\/ul>/);
/* sd-fn 이 sd-func 처럼 원료 그룹(중첩 ul)을 갖는지, 평면 목록인지 판정한다. */
const nested = rows.filter((r) => /<ul class="sd-fn">[\s\S]*?<ul/.test(r.content)).length;
const withB = rows.filter((r) => /<ul class="sd-fn">\s*<li>\s*<b>/.test(r.content)).length;
console.log(JSON.stringify({
  koDocsFound: rows.length, nestedListDocs: nested, liStartsWithBoldDocs: withB,
  sample: block?.slice(0, 1200),
}, null, 1));
