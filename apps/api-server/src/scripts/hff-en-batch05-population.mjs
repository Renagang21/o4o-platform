/**
 * WO-O4O-HFF-EN-BATCH-05-ALL-REMAINING-DIRECT-BULK-PRODUCTION-AND-CLOSURE-V1 §3
 * Batch 05 모집단 5,000건 선정 (read-only).
 *
 * 조건: HFF STORE/ko canonical 존재 · STORE/en canonical 부재 · Batch 01·02 중복 0
 *       ProductMaster·koCanonicalId 중복 0 · 기능성/섭취방법/주의사항/기준규격 원문 존재
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const PORT = parseInt(process.env.PROXY_PORT ?? '5621', 10);

const prior = new Set(), priorKo = new Set();
for (const f of ['hff-en-batch-01-population-v1.json', 'hff-en-batch02-population-5000-v1.json',
  'hff-en-batch03-population-5000-v1.json', 'hff-en-batch04-population-5000-v1.json']) {
  for (const r of JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')).rows) {
    prior.add(r.masterId ?? r.productMasterId);
    if (r.koCanonicalId) priorKo.add(r.koCanonicalId);
  }
}
// 기존 통합 문제 큐(Batch 01~04, 576건)는 모집단에서 제외한다.
const queued = new Set();
for (const l of fs.readFileSync(`${D}/hff-en-deferred-issue-queue-through-batch04-v1.jsonl`, 'utf8').split('\n').filter(Boolean)) {
  const q = JSON.parse(l);
  queued.add(q.productMasterId);
  if (q.koCanonicalId) priorKo.add(q.koCanonicalId);
}
for (const id of queued) prior.add(id);

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const { rows } = await c.query(`
  SELECT pm.id AS master_id, coalesce(pm.name, pm.regulatory_name) AS product_name_ko,
         pm.specification,
         ko.id AS ko_canonical_id, ko.content AS ko_content,
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
const familyOf = (h) => (/<ul class="sd-func"/.test(h) ? 'WAE' : /sd-core|sd-item|sd-tag/.test(h) ? 'DRIVER' : /<ul class="sd-fn"/.test(h) ? 'FN' : null);

const seenMaster = new Set(), seenKo = new Set();
const pool = [];
const drop = { priorBatch: 0, dupMaster: 0, dupKo: 0, noFamily: 0, emptyKo: 0, noHangul: 0, noSourceFields: 0 };
for (const r of rows) {
  if (prior.has(r.master_id) || priorKo.has(r.ko_canonical_id)) { drop.priorBatch++; continue; }
  if (seenMaster.has(r.master_id)) { drop.dupMaster++; continue; }
  if (seenKo.has(r.ko_canonical_id)) { drop.dupKo++; continue; }
  const ko = r.ko_content ?? '';
  if (!ko.trim()) { drop.emptyKo++; continue; }
  if (!HANGUL.test(ko)) { drop.noHangul++; continue; }
  const fam = familyOf(ko);
  if (!fam) { drop.noFamily++; continue; }
  const src = r.raw_payload?.source ?? {};
  const g = (k) => (typeof src?.[k] === 'string' && src[k].trim() ? src[k] : null);
  const fields = { MAIN_FNCTN: g('MAIN_FNCTN'), SRV_USE: g('SRV_USE'), INTAKE_HINT1: g('INTAKE_HINT1'), BASE_STANDARD: g('BASE_STANDARD') };
  // §3 "기능성·섭취방법·주의사항·기준규격 원문 존재": 최소 1개 축은 있어야 검증 대조가 가능하다.
  if (!Object.values(fields).some(Boolean)) { drop.noSourceFields++; continue; }
  seenMaster.add(r.master_id); seenKo.add(r.ko_canonical_id);
  pool.push({
    masterId: r.master_id, koCanonicalId: r.ko_canonical_id,
    productNameKo: r.product_name_ko, candidateId: r.candidate_id ?? null, specification: r.specification ?? null,
    rendererFamily: fam, koHash: sha(ko), koLength: ko.length,
    // 원문 전문은 product_candidates.raw_payload.source 에서 언제든 재현되므로 존재 여부만 보관한다.
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Boolean(v)])),
  });
}
const score = (x) => Object.values(x.fields).filter(Boolean).length;
pool.sort((a, b) => score(b) - score(a) || b.koLength - a.koLength || (a.masterId < b.masterId ? -1 : 1));
// Batch 05 는 5,000 절단 없이 정상 생산 후보 전량을 모집단으로 고정한다.
const picked = pool;
// 기대값은 상수가 아니라 직전 배치 종료 매니페스트에서 재계산한다.
const rem = JSON.parse(fs.readFileSync(`${D}/hff-en-production-remaining-after-batch04-v1.json`, 'utf8'));
const expected = rem.remaining - queued.size;

const gates = {
  candidatePool: pool.length,
  remainingAfterBatch04: rem.remaining, deferredQueueSize: queued.size,
  total: picked.length, expected, totalOk: picked.length === expected,
  dupMasterId: picked.length - new Set(picked.map((x) => x.masterId)).size,
  dupKoCanonicalId: picked.length - new Set(picked.map((x) => x.koCanonicalId)).size,
  overlapPriorBatches: picked.filter((x) => prior.has(x.masterId) || priorKo.has(x.koCanonicalId)).length,
  missingFamily: picked.filter((x) => !x.rendererFamily).length,
  familyMix: picked.reduce((a, x) => ({ ...a, [x.rendererFamily]: (a[x.rendererFamily] ?? 0) + 1 }), {}),
};
fs.writeFileSync(`${D}/hff-en-batch05-population-all-v1.json`, JSON.stringify({
  wo: 'WO-O4O-HFF-EN-BATCH-05-ALL-REMAINING-DIRECT-BULK-PRODUCTION-AND-CLOSURE-V1',
  batch: 5, builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  candidatePool: pool.length, dropped: drop, gates, rows: picked,
  fieldsNote: 'fields 는 원문 축 존재 여부다. 전문은 product_candidates.raw_payload.source 에서 재현한다.',
}, null, 1), 'utf8');
console.log(JSON.stringify({ dropped: drop, gates }, null, 1));
