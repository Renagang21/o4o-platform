/**
 * WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1 §3
 *
 * HFF EN STORE canonical 전수 품질 census 의 **모집단 재현 + 원문 캐시** 단계.
 * DB 는 read-only 로 한 번만 읽는다. write 0.
 *
 * 과거 수치(40,918 / 40,902 / 16)를 재사용하지 않고 현재 DB 에서 재계산한다(§3).
 *
 * 산출: data/hff-en-full-quality-census-v1.json  (모집단·계약 실측)
 *       .cache/hff-en-pairs.jsonl                (KO↔EN 문서 쌍 캐시 — 이후 단계는 오프라인)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
fs.mkdirSync(CACHE, { recursive: true });

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5531', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const BASE = `deleted_at IS NULL AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`;

/* ── 모집단 실측 ─────────────────────────────────────────────── */
const totals = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='ja') ja,
         count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions WHERE ${BASE}`)).rows[0];

const koWithoutEn = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions k
   WHERE ${BASE.replace(/\b(deleted_at|source_type|description_type|status)\b/g, 'k.$1')}
     AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions e
                      WHERE e.master_id=k.master_id AND e.deleted_at IS NULL
                        AND e.source_type='o4o_hff_generated' AND e.description_type='STORE'
                        AND e.status='canonical' AND e.language='en')`)).rows[0].n;

/* canonical 중복 — master 당 2건 이상 */
const dup = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
       WHERE ${BASE} AND coalesce(language,'ko')='ko' GROUP BY master_id HAVING count(*)>1) a) ko_dup,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
       WHERE ${BASE} AND language='en' GROUP BY master_id HAVING count(*)>1) b) en_dup`)).rows[0];

/* EN 계약 위반 — BASE 밖 조합이 섞였는지 */
const contract = (await c.query(`
  SELECT count(*)::int n FROM shared_product_descriptions
   WHERE language='en' AND source_type='o4o_hff_generated' AND description_type='STORE'
     AND deleted_at IS NULL AND status <> 'canonical'`)).rows[0].n;

/* EN 생성 계보 — created_at 일자별 분포(=batch 근사)와 갱신 이력 */
const lineage = (await c.query(`
  SELECT date_trunc('day', created_at)::date d, count(*)::int n,
         count(*) FILTER (WHERE updated_at > created_at + interval '1 minute')::int corrected
    FROM shared_product_descriptions WHERE ${BASE} AND language='en'
   GROUP BY 1 ORDER BY 1`)).rows;

/* ── KO↔EN 쌍 캐시 ───────────────────────────────────────────── */
const rows = (await c.query(`
  SELECT k.master_id, pm.name AS product_name,
         k.id AS ko_id, k.content AS ko, k.created_at AS ko_created,
         e.id AS en_id, e.content AS en, e.created_at AS en_created, e.updated_at AS en_updated
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
    JOIN shared_product_descriptions e
      ON e.master_id = k.master_id AND e.deleted_at IS NULL
     AND e.source_type='o4o_hff_generated' AND e.description_type='STORE'
     AND e.status='canonical' AND e.language='en'
   WHERE ${BASE.replace(/\b(deleted_at|source_type|description_type|status)\b/g, 'k.$1')}
     AND coalesce(k.language,'ko')='ko'
   ORDER BY k.master_id`)).rows;

/* EN 없는 KO — HOLD 16 재검토 대상(§10) */
const holdRows = (await c.query(`
  SELECT k.master_id, k.id AS ko_id, pm.name AS product_name, k.content AS ko
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
   WHERE ${BASE.replace(/\b(deleted_at|source_type|description_type|status)\b/g, 'k.$1')}
     AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions e
                      WHERE e.master_id=k.master_id AND e.deleted_at IS NULL
                        AND e.source_type='o4o_hff_generated' AND e.description_type='STORE'
                        AND e.status='canonical' AND e.language='en')
   ORDER BY k.master_id`)).rows;
await c.end();

fs.writeFileSync(`${CACHE}/hff-en-pairs.jsonl`, rows.map((r) => JSON.stringify({
  m: r.master_id, n: r.product_name, ki: r.ko_id, ei: r.en_id,
  ko: r.ko, en: r.en,
  enC: r.en_created, enU: r.en_updated,
})).join('\n'));
fs.writeFileSync(`${CACHE}/hff-en-hold.jsonl`, holdRows.map((r) => JSON.stringify({
  m: r.master_id, ki: r.ko_id, n: r.product_name, ko: r.ko,
})).join('\n'));

const census = {
  wo: WO, censusedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  totals: { ko: Number(totals.ko), en: Number(totals.en), ja: Number(totals.ja), zh: Number(totals.zh) },
  koWithoutEn,
  pairs: rows.length,
  pairsHash: sha(rows.map((r) => r.master_id).join(',')),
  canonicalDup: { ko: dup.ko_dup, en: dup.en_dup },
  enNonCanonicalRows: contract,
  productMasterDupInPairs: rows.length - new Set(rows.map((r) => r.master_id)).size,
  enLineageByCreatedDay: lineage.map((x) => ({ day: String(x.d), n: x.n, correctedAfterCreate: x.corrected })),
};
fs.writeFileSync(`${D}/hff-en-full-quality-census-v1.json`, JSON.stringify(census, null, 1));
console.log(JSON.stringify({ ...census, enLineageByCreatedDay: census.enLineageByCreatedDay.slice(0, 20) }, null, 1));
