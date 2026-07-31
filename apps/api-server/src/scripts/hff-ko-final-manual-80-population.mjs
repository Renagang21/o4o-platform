/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / 모집단 재현 (read-only).
 * 대상: hff-ko-final-actionable-unresolved-v1.jsonl 80행.
 * 공식 원천 부재 343 혼입 금지 · EN 혼입 금지.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-ko-final-actionable-unresolved-v1.jsonl`;
const OUT = `${D}/hff-ko-final-manual-80-population-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const rows = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const c = new pg.Client({
  host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5501', 10),
  user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false,
});
await c.connect();
await c.query('SET default_transaction_read_only = on');

const cids = rows.map((r) => r.candidateId);
const cand = new Map();
for (let i = 0; i < cids.length; i += 400) {
  const q = await c.query(`
    SELECT id, deleted_at, matched_product_master_id,
      raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
      raw_payload::jsonb->'source'->>'PRDUCT'     name,
      raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
      raw_payload::jsonb->'source'->>'SRV_USE'    srv,
      raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint,
      raw_payload::jsonb->'source'->>'BASE_STANDARD' base,
      raw_payload::jsonb->'source'->>'RAWMTRL_NM' rawm,
      raw_payload::jsonb->'source'->>'ENTRPS'     entrps
    FROM product_candidates WHERE id = ANY($1)`, [cids.slice(i, i + 400)]);
  for (const r of q.rows) cand.set(r.id, r);
}

const masters = [...new Set([...cand.values()].map((r) => r.matched_product_master_id).filter(Boolean))];
const canon = new Map();
for (let i = 0; i < masters.length; i += 400) {
  const q = await c.query(`
    SELECT id, master_id, content, source_type, status, language, description_type, updated_at
    FROM shared_product_descriptions
    WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
      AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [masters.slice(i, i + 400)]);
  for (const r of q.rows) canon.set(r.master_id, r);
}

const globals = (await c.query(`
  SELECT
    (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon
`)).rows[0];
await c.end();

const out = [], problems = [];
for (const q of rows) {
  const cd = cand.get(q.candidateId);
  const cn = cd?.matched_product_master_id ? canon.get(cd.matched_product_master_id) : null;
  const content = cn?.content ?? '';
  const fnBlock = content.match(/<h2>[^<]*기능성[^<]*<\/h2>([\s\S]*?)(?=<h2>|<div class="sd-foot")/);
  const rec = {
    candidateId: q.candidateId,
    statementNo: cd?.stmt ?? q.statementNo,
    productName: cd?.name ?? q.productName,
    entrps: cd?.entrps ?? null,
    productMasterId: cd?.matched_product_master_id ?? null,
    canonicalId: cn?.id ?? null,
    queueReason: q.finalHoldReason,
    track: q.finalHoldReason === 'OFFICIAL_SOURCE_CONFLICT' ? 'A'
      : q.finalHoldReason === 'CANONICAL_STRUCTURE_REQUIRES_REDESIGN' ? 'B'
      : q.finalHoldReason === 'INGREDIENT_OWNERSHIP_REQUIRES_HUMAN_APPROVAL' ? 'C' : 'D',
    candidatePresent: !!cd && !cd.deleted_at,
    canonicalPresent: !!cn,
    language: cn?.language ?? null,
    descriptionType: cn?.description_type ?? null,
    status: cn?.status ?? null,
    sourceType: cn?.source_type ?? null,
    canonicalHash: cn ? sha(cn.content) : null,
    canonicalLength: content.length,
    hasFnSection: !!fnBlock,
    fnHeading: (content.match(/<h2>([^<]*기능성[^<]*)<\/h2>/) ?? [])[1] ?? null,
    usesSdFunc: /class="sd-func"/.test(content),
    usesSdWhy: /class="sd-why"/.test(content),
    fnBlockLength: fnBlock ? fnBlock[1].length : 0,
    officialFn: nrm(cd?.fn),
    officialSrv: nrm(cd?.srv),
    officialRawm: nrm(cd?.rawm),
    officialFnPresent: !!nrm(cd?.fn),
    officialSrvPresent: !!nrm(cd?.srv),
  };
  if (!rec.candidatePresent) problems.push({ id: q.candidateId, why: 'CANDIDATE_MISSING' });
  if (!rec.canonicalPresent) problems.push({ id: q.candidateId, why: 'CANONICAL_MISSING' });
  if (rec.canonicalPresent && (rec.language ?? 'ko') !== 'ko') problems.push({ id: q.candidateId, why: 'NOT_KO' });
  if (rec.canonicalPresent && rec.sourceType !== 'o4o_hff_generated') problems.push({ id: q.candidateId, why: 'SOURCE_TYPE' });
  out.push(rec);
}

const checks = {
  total: out.length, expected: 80, matches: out.length === 80,
  byReason: out.reduce((a, r) => { a[r.queueReason] = (a[r.queueReason] ?? 0) + 1; return a; }, {}),
  byTrack: out.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  candidateIdDup: out.length - new Set(out.map((r) => r.candidateId)).size,
  canonicalIdDup: out.length - new Set(out.map((r) => r.canonicalId)).size,
  dbMissing: out.filter((r) => !r.candidatePresent || !r.canonicalPresent).length,
  allKo: out.every((r) => (r.language ?? 'ko') === 'ko'),
  allStore: out.every((r) => r.descriptionType === 'STORE'),
  allCanonical: out.every((r) => r.status === 'canonical'),
  allHffSource: out.every((r) => r.sourceType === 'o4o_hff_generated'),
  officialSourceMissingMixedIn: out.filter((r) => !r.officialFnPresent || !r.officialSrvPresent).length,
  structure: {
    hasFnSection: out.filter((r) => r.hasFnSection).length,
    usesSdFunc: out.filter((r) => r.usesSdFunc).length,
    usesSdWhyOnly: out.filter((r) => r.usesSdWhy && !r.usesSdFunc).length,
    noFnSection: out.filter((r) => !r.hasFnSection).length,
  },
  globals,
};
fs.writeFileSync(OUT, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, problems, rows: out }, null, 1));
console.log(JSON.stringify({ out: OUT, checks, problems: problems.slice(0, 6) }, null, 2));
