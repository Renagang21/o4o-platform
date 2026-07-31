/**
 * WO-O4O-HFF-KO-FINAL-ACTIONABLE-HOLD-133-HUMAN-RESOLUTION-V1 / 모집단 재구성 (read-only).
 * 대상: FINAL_HOLD_BOUNDARY_AMBIGUOUS 124 + FINAL_HOLD_SOURCE_CONFLICT 9 = 133
 * 공식 원천 부재 343 은 **혼입 금지**.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-ko-final-unresolved-v1.jsonl`;
const OUT = `${D}/hff-ko-actionable-hold-133-population-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const all = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const TARGET = new Set(['FINAL_HOLD_BOUNDARY_AMBIGUOUS', 'FINAL_HOLD_SOURCE_CONFLICT']);
const rows = all.filter((r) => TARGET.has(r.finalHoldReason));
const excluded = all.filter((r) => !TARGET.has(r.finalHoldReason));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5499', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const cids = rows.map((r) => r.candidateId);
const cand = new Map();
for (let i = 0; i < cids.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, deleted_at, matched_product_master_id,
      raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
      raw_payload::jsonb->'source'->>'PRDUCT' name,
      raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
      raw_payload::jsonb->'source'->>'SRV_USE' srv
    FROM product_candidates WHERE id = ANY($1)`, [cids.slice(i, i + 500)])).rows) cand.set(r.id, r);
}
const masters = [...new Set([...cand.values()].map((r) => r.matched_product_master_id).filter(Boolean))];
const canon = new Map();
for (let i = 0; i < masters.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, master_id, content, source_type, status, language, description_type
    FROM shared_product_descriptions
    WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
      AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [masters.slice(i, i + 500)])).rows) canon.set(r.master_id, r);
}
await c.end();

const out = [], problems = [];
for (const q of rows) {
  const cd = cand.get(q.candidateId);
  const cn = cd?.matched_product_master_id ? canon.get(cd.matched_product_master_id) : null;
  const rec = {
    candidateId: q.candidateId, statementNo: cd?.stmt ?? q.statementNo, productName: cd?.name ?? q.productName,
    productMasterId: cd?.matched_product_master_id ?? null, canonicalId: cn?.id ?? null,
    queueReason: q.finalHoldReason,
    candidatePresent: !!cd && !cd.deleted_at,
    canonicalPresent: !!cn,
    language: cn?.language ?? null, descriptionType: cn?.description_type ?? null,
    sourceType: cn?.source_type ?? null,
    canonicalHash: cn ? sha(cn.content) : null,
    canonicalLength: cn ? cn.content.length : null,
    hasFnSection: cn ? /<h2>[^<]*기능성[^<]*<\/h2>/.test(cn.content) : null,
    usesSdFunc: cn ? /class="sd-func"/.test(cn.content) : null,
    usesSdWhy: cn ? /class="sd-why"/.test(cn.content) : null,
    officialFnPresent: !!nrm(cd?.fn), officialSrvPresent: !!nrm(cd?.srv),
    officialFnLength: nrm(cd?.fn).length,
  };
  if (!rec.candidatePresent) problems.push({ id: q.candidateId, why: 'CANDIDATE_MISSING' });
  if (!rec.canonicalPresent) problems.push({ id: q.candidateId, why: 'CANONICAL_MISSING' });
  if (rec.canonicalPresent && (rec.language ?? 'ko') !== 'ko') problems.push({ id: q.candidateId, why: 'NOT_KO' });
  out.push(rec);
}

const checks = {
  total: out.length, expected: 133, matches: out.length === 133,
  boundaryAmbiguous: out.filter((r) => r.queueReason === 'FINAL_HOLD_BOUNDARY_AMBIGUOUS').length,
  sourceConflict: out.filter((r) => r.queueReason === 'FINAL_HOLD_SOURCE_CONFLICT').length,
  candidateIdDup: out.length - new Set(out.map((r) => r.candidateId)).size,
  canonicalIdDup: out.length - new Set(out.map((r) => r.canonicalId)).size,
  dbMissing: out.filter((r) => !r.candidatePresent || !r.canonicalPresent).length,
  allKo: out.every((r) => (r.language ?? 'ko') === 'ko'),
  allStoreCanonical: out.every((r) => r.descriptionType === 'STORE'),
  officialSourceMissingMixedIn: out.filter((r) => !r.officialFnPresent || !r.officialSrvPresent).length,
  excludedFromQueue: excluded.length,
  excludedReasons: excluded.reduce((a, r) => { a[r.finalHoldReason] = (a[r.finalHoldReason] ?? 0) + 1; return a; }, {}),
  structure: {
    hasFnSection: out.filter((r) => r.hasFnSection).length,
    usesSdFunc: out.filter((r) => r.usesSdFunc).length,
    usesSdWhyOnly: out.filter((r) => r.usesSdWhy && !r.usesSdFunc).length,
  },
};
fs.writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, problems, rows: out }, null, 1));
console.log(JSON.stringify({ out: OUT, checks, problems: problems.slice(0, 5) }, null, 2));
