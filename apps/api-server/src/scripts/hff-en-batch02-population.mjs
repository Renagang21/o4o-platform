/**
 * WO-...-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1 §8
 * Batch 02 모집단 5,000건 선정 (read-only).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const PORT = parseInt(process.env.PROXY_PORT ?? '5561', 10);
const B01 = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-population-v1.json`, 'utf8')).rows;
const B01_MASTERS = new Set(B01.map((r) => r.masterId));
const B01_KO = new Set(B01.map((r) => r.koCanonicalId));

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

// HFF ProductMaster + STORE/ko canonical 보유 + STORE/en canonical 미보유
const { rows } = await c.query(`
  SELECT pm.id AS master_id, coalesce(pm.name, pm.regulatory_name) AS product_name_ko,
         pm.specification, pm.mfds_permit_number,
         ko.id AS ko_canonical_id, ko.content AS ko_content, ko.updated_at AS ko_updated_at,
         pc.id AS candidate_id, pc.raw_payload
    FROM product_masters pm
    LEFT JOIN LATERAL (
      SELECT id, raw_payload FROM product_candidates
       WHERE matched_product_master_id = pm.id AND raw_payload IS NOT NULL AND deleted_at IS NULL
       ORDER BY updated_at DESC NULLS LAST LIMIT 1) pc ON true
    JOIN shared_product_descriptions ko
      ON ko.master_id = pm.id AND ko.deleted_at IS NULL AND ko.description_type='STORE'
     AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
   WHERE pm.regulatory_type = '건강기능식품'
     AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions en
        WHERE en.master_id = pm.id AND en.deleted_at IS NULL AND en.description_type='STORE'
          AND en.status='canonical' AND en.language='en')
   ORDER BY pm.id`);
await c.end();

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const HANGUL = /[가-힣]/;
// renderer family: KO canonical 구조에서 판정한다(§8 우선순위 3).
const familyOf = (h) => (/<ul class="sd-func"/.test(h) ? 'WAE' : /sd-core|sd-item|sd-tag/.test(h) ? 'DRIVER' : /<ul class="sd-fn"/.test(h) ? 'FN' : null);

const seenMaster = new Set(), seenKo = new Set();
const pool = [];
const drop = { batch01: 0, dupMaster: 0, dupKo: 0, noFamily: 0, emptyKo: 0, noHangul: 0 };
for (const r of rows) {
  if (B01_MASTERS.has(r.master_id) || B01_KO.has(r.ko_canonical_id)) { drop.batch01++; continue; }
  if (seenMaster.has(r.master_id)) { drop.dupMaster++; continue; }
  if (seenKo.has(r.ko_canonical_id)) { drop.dupKo++; continue; }
  const ko = r.ko_content ?? '';
  if (!ko.trim()) { drop.emptyKo++; continue; }
  if (!HANGUL.test(ko)) { drop.noHangul++; continue; }
  const fam = familyOf(ko);
  if (!fam) { drop.noFamily++; continue; }
  seenMaster.add(r.master_id); seenKo.add(r.ko_canonical_id);
  const src = r.raw_payload?.source ?? {};
  const g = (k) => (typeof src?.[k] === 'string' && src[k].trim() ? src[k] : null);
  pool.push({
    masterId: r.master_id, koCanonicalId: r.ko_canonical_id,
    productNameKo: r.product_name_ko, candidateId: r.candidate_id ?? null, specification: r.specification ?? null,
    rendererFamily: fam, koHash: sha(ko), koLength: ko.length,
    fields: {
      MAIN_FNCTN: g('MAIN_FNCTN'),
      SRV_USE: g('SRV_USE'),
      INTAKE_HINT1: g('INTAKE_HINT1'),
      BASE_STANDARD: g('BASE_STANDARD'),
    },
  });
}
// 우선순위: 구조화 필드 완전도 → KO 길이(정보량) → id 안정 정렬
const score = (x) => Object.values(x.fields).filter(Boolean).length;
pool.sort((a, b) => score(b) - score(a) || b.koLength - a.koLength || (a.masterId < b.masterId ? -1 : 1));
const picked = pool.slice(0, 5000);

const gates = {
  total: picked.length, expected: 5000, totalOk: picked.length === 5000,
  dupMasterId: picked.length - new Set(picked.map((x) => x.masterId)).size,
  dupKoCanonicalId: picked.length - new Set(picked.map((x) => x.koCanonicalId)).size,
  overlapBatch01: picked.filter((x) => B01_MASTERS.has(x.masterId) || B01_KO.has(x.koCanonicalId)).length,
  enCanonicalExisting: 0, // SQL NOT EXISTS 로 이미 배제
  dbMissing: 0,
  familyDist: picked.reduce((a, x) => ((a[x.rendererFamily] = (a[x.rendererFamily] ?? 0) + 1), a), {}),
  fieldComplete4: picked.filter((x) => score(x) === 4).length,
};
const out = {
  wo: 'WO-O4O-HFF-EN-BATCH-01-CLOSURE-AND-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1',
  batch: 2, builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  candidatePool: pool.length, dropped: drop, gates, rows: picked,
};
fs.writeFileSync(`${D}/hff-en-batch02-population-5000-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ candidatePool: pool.length, dropped: drop, gates }, null, 1));
