/**
 * WO-O4O-HFF-KO-FINAL-HOLD-523-FULL-RESOLUTION-V1 / Phase 0
 * 523 모집단을 현재 DB 로 재구성한다 (read-only).
 *   Track A : KO canonical 보유 검토 잔여 175
 *   Track B : Agent 9 canonical 미보유 348
 * 과거 사유를 신뢰하지 않고 공식 필드·연결·canonical 상태를 실측한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = `${D}/hff-ko-nontranslation-final-hold-v1.jsonl`;
const OUT = `${D}/hff-ko-final-hold-523-population-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const rows = fs.readFileSync(QUEUE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
console.error(`[queue] ${rows.length} rows, keys=${Object.keys(rows[0]).join(',')}`);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5497', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const candIds = [...new Set(rows.map((r) => r.candidateId).filter(Boolean))];
const cand = new Map();
for (let i = 0; i < candIds.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, deleted_at, candidate_status, matched_product_master_id, source_label,
      raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
      raw_payload::jsonb->'source'->>'PRDUCT' name,
      raw_payload::jsonb->'source'->>'ENTRPS' maker,
      raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
      raw_payload::jsonb->'source'->>'SRV_USE' srv,
      raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint,
      raw_payload::jsonb->'source'->>'BASE_STANDARD' base
    FROM product_candidates WHERE id = ANY($1)`, [candIds.slice(i, i + 500)])).rows) cand.set(r.id, r);
}

// permit → 기존 ProductMaster (= ANY 1회 스캔)
const permits = [...new Set([...cand.values()].map((r) => r.stmt).filter(Boolean))];
const pmByPermit = new Map();
for (let i = 0; i < permits.length; i += 1000) {
  for (const r of (await c.query(`
    SELECT id, mfds_permit_number, regulatory_type, name, manufacturer_name, status
    FROM product_masters WHERE mfds_permit_number = ANY($1)`, [permits.slice(i, i + 1000)])).rows) {
    if (!pmByPermit.has(r.mfds_permit_number)) pmByPermit.set(r.mfds_permit_number, []);
    pmByPermit.get(r.mfds_permit_number).push(r);
  }
}

// canonical 상태 (master 기준)
const masterIds = [...new Set([...cand.values()].map((r) => r.matched_product_master_id).filter(Boolean))];
const canonByMaster = new Map();
if (masterIds.length) {
  for (let i = 0; i < masterIds.length; i += 500) {
    for (const r of (await c.query(`
      SELECT id, master_id, content, status, language, description_type
      FROM shared_product_descriptions
      WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
        AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [masterIds.slice(i, i + 500)])).rows) canonByMaster.set(r.master_id, r);
  }
}
// 큐가 canonicalId 를 들고 있으면 그것도 조회
const canonIds = [...new Set(rows.map((r) => r.canonicalId).filter(Boolean))];
const canonById = new Map();
for (let i = 0; i < canonIds.length; i += 500) {
  for (const r of (await c.query(`
    SELECT id, master_id, content, status, language, description_type, deleted_at
    FROM shared_product_descriptions WHERE id = ANY($1)`, [canonIds.slice(i, i + 500)])).rows) canonById.set(r.id, r);
}
await c.end();

const out = [];
const tally = { A: 0, B: 0 };
const fieldCov = { fn: 0, srv: 0, hint: 0, base: 0 };
const pmState = { linked: 0, permitMatchUnique: 0, permitMatchMulti: 0, permitNoMatch: 0, noPermit: 0 };
const canonState = { hasKoCanonical: 0, noKoCanonical: 0 };

for (const q of rows) {
  const cd = cand.get(q.candidateId);
  const permit = cd?.stmt ?? q.statementNo ?? null;
  const pmCands = permit ? (pmByPermit.get(permit) ?? []) : [];
  const linked = cd?.matched_product_master_id ?? null;
  const canon = q.canonicalId ? canonById.get(q.canonicalId) : (linked ? canonByMaster.get(linked) : null);
  const hasCanon = !!canon && !canon.deleted_at;

  const rec = {
    candidateId: q.candidateId, statementNo: permit, productName: cd?.name ?? q.productName ?? null,
    maker: cd?.maker ?? null,
    queueTrack: q.track ?? (q.canonicalId ? 'A' : 'B'),
    queueReason: q.finalHoldReason ?? q.holdReason ?? q.reason ?? null,
    candidatePresent: !!cd && !cd.deleted_at,
    candidateStatus: cd?.candidate_status ?? null,
    productMasterId: linked,
    permitMasterCandidates: pmCands.map((x) => ({ id: x.id, name: x.name, regulatory: x.regulatory_type })),
    canonicalId: canon?.id ?? null, hasKoCanonical: hasCanon,
    canonicalHash: hasCanon ? sha(canon.content) : null,
    canonicalHasFnSection: hasCanon ? /<h2>[^<]*기능성[^<]*<\/h2>/.test(canon.content) : null,
    canonicalUsesSdFunc: hasCanon ? /class="sd-func"/.test(canon.content) : null,
    official: {
      MAIN_FNCTN: !!nrm(cd?.fn), SRV_USE: !!nrm(cd?.srv),
      INTAKE_HINT1: !!nrm(cd?.hint), BASE_STANDARD: !!nrm(cd?.base),
      fnLen: nrm(cd?.fn).length, srvLen: nrm(cd?.srv).length,
    },
  };
  // 재판정용 축
  rec.track = hasCanon ? 'A' : 'B';
  tally[rec.track]++;
  if (rec.official.MAIN_FNCTN) fieldCov.fn++;
  if (rec.official.SRV_USE) fieldCov.srv++;
  if (rec.official.INTAKE_HINT1) fieldCov.hint++;
  if (rec.official.BASE_STANDARD) fieldCov.base++;
  if (linked) pmState.linked++;
  else if (!permit) pmState.noPermit++;
  else if (pmCands.length === 1) pmState.permitMatchUnique++;
  else if (pmCands.length > 1) pmState.permitMatchMulti++;
  else pmState.permitNoMatch++;
  if (hasCanon) canonState.hasKoCanonical++; else canonState.noKoCanonical++;
  out.push(rec);
}

const queueReasonTally = {};
for (const r of out) queueReasonTally[r.queueReason ?? 'null'] = (queueReasonTally[r.queueReason ?? 'null'] ?? 0) + 1;

const result = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  queueFile: QUEUE, queueRows: rows.length, expected: 523, populationMatches: rows.length === 523,
  trackTally: tally, queueReasonTally,
  officialFieldCoverage: fieldCov,
  productMasterState: pmState, canonicalState: canonState,
  candidateMissing: out.filter((r) => !r.candidatePresent).length,
  rows: out,
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ out: OUT, queueRows: rows.length, populationMatches: rows.length === 523,
  trackTally: tally, queueReasonTally, officialFieldCoverage: fieldCov, productMasterState: pmState,
  canonicalState: canonState, candidateMissing: result.candidateMissing }, null, 2));
