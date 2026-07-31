/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §5·§6·§10
 * 비번역 모집단 확정 (read-only)
 *
 * Track A = 최종 검토 큐 v3 중 language != 'en' 인 KO 잔여
 * Track B = Agent 9 HOLD 348
 * 두 트랙 모두 **현재 DB 실측**으로 재확인한다. 과거 보고 수치를 그대로 쓰지 않는다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const v3 = readJsonl(`${D}/hff-final-review-queue-v3.jsonl`);
const a9 = readJsonl(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`);

/* ── §5 번역 제외 게이트 ─────────────────────────────────────────── */
const EN_HOLD = new Set(['NO_OFFICIAL_EN_GROUNDING', 'PARTIAL_EN_GROUNDING']);
const koRows = v3.filter((r) => r.language !== 'en' && !EN_HOLD.has(r.holdReason));
const enRows = v3.filter((r) => r.language === 'en' || EN_HOLD.has(r.holdReason));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* ── Track A 실측 ────────────────────────────────────────────────── */
const trackA = [];
const koIds = koRows.map((r) => r.canonicalId);
const liveA = new Map();
for (let i = 0; i < koIds.length; i += 400) {
  for (const r of (await c.query(`
    SELECT spd.id, spd.master_id, spd.language, spd.content, spd.updated_at,
           encode(sha256(convert_to(spd.content,'UTF8')),'hex') content_hash,
           pc.id candidate_id,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' prduct,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1) AND spd.deleted_at IS NULL
       AND spd.source_type='o4o_hff_generated' AND spd.description_type='STORE' AND spd.status='canonical'`,
    [koIds.slice(i, i + 400)])).rows) liveA.set(r.id, r);
}
for (const r of koRows) {
  const l = liveA.get(r.canonicalId);
  trackA.push({
    canonicalId: r.canonicalId, productMasterId: r.productMasterId, candidateId: l?.candidate_id ?? r.candidateId ?? null,
    statementNo: l?.stmt ?? r.statementNo ?? null, productName: l?.prduct ?? null,
    language: l?.language ?? r.language, rendererFamily: r.rendererFamily,
    queueHoldReason: r.holdReason, queueProblem: r.currentProblem,
    queueContentHash: r.canonicalContentHash, dbContentHash: l?.content_hash ?? null,
    contentChangedSinceQueue: l ? l.content_hash !== r.canonicalContentHash : null,
    dbMissing: !l, hasOfficialFn: !!l?.fn, fnLen: l?.fn ? String(l.fn).length : 0,
  });
}

/* ── Track B 실측: candidateId 기준으로 후보·master·canonical 재확인 ── */
const a9Ids = a9.map((r) => r.candidateId);
const liveB = new Map();
for (let i = 0; i < a9Ids.length; i += 400) {
  for (const r of (await c.query(`
    SELECT pc.id candidate_id, pc.matched_product_master_id master_id, pc.candidate_status,
           pc.deleted_at IS NOT NULL cand_deleted,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' prduct,
           pc.raw_payload::jsonb->'source'->>'ENTRPS' entrps,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
           pc.raw_payload::jsonb->'source'->>'SRV_USE' srv,
           pc.raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint,
           pc.raw_payload::jsonb->'source'->>'BASE_STANDARD' base,
           (SELECT count(*) FROM shared_product_descriptions s
             WHERE s.master_id = pc.matched_product_master_id AND s.description_type='STORE'
               AND s.status='canonical' AND s.deleted_at IS NULL AND coalesce(s.language,'ko')='ko') ko_canonical_cnt,
           (SELECT count(*) FROM shared_product_descriptions s
             WHERE s.master_id = pc.matched_product_master_id AND s.description_type='STORE'
               AND s.status='canonical' AND s.deleted_at IS NULL AND coalesce(s.language,'ko')='ko'
               AND s.source_type='o4o_hff_generated') hff_ko_canonical_cnt
      FROM product_candidates pc
     WHERE pc.id = ANY($1)`, [a9Ids.slice(i, i + 400)])).rows) liveB.set(r.candidate_id, r);
}
const trackB = a9.map((r) => {
  const l = liveB.get(r.candidateId);
  const nz = (v) => (v == null ? '' : String(v).trim());
  return {
    candidateId: r.candidateId, statementNo: l?.stmt ?? r.statementNo, productName: l?.prduct ?? r.productName,
    enterprise: l?.entrps ?? r.enterprise, originalHoldReason: r.originalHoldReason, priority: r.priority,
    candidateMissing: !l, candidateDeleted: l?.cand_deleted ?? null, candidateStatus: l?.candidate_status ?? null,
    productMasterId: l?.master_id ?? null,
    hasMaster: !!l?.master_id,
    hasFn: !!nz(l?.fn), hasSrv: !!nz(l?.srv), hasHint: !!nz(l?.hint), hasBase: !!nz(l?.base),
    fnLen: nz(l?.fn).length, srvLen: nz(l?.srv).length, hintLen: nz(l?.hint).length,
    koCanonicalCnt: l ? Number(l.ko_canonical_cnt) : 0,
    hffKoCanonicalCnt: l ? Number(l.hff_ko_canonical_cnt) : 0,
  };
});

/* ── 중복·교차 검사 ──────────────────────────────────────────────── */
const aCanon = new Set(trackA.map((r) => r.canonicalId));
const bCand = new Set(trackB.map((r) => r.candidateId));
const aMasters = new Set(trackA.map((r) => r.productMasterId).filter(Boolean));
const crossMaster = trackB.filter((r) => r.productMasterId && aMasters.has(r.productMasterId)).map((r) => r.candidateId);

const tally = (arr, f) => arr.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});

const out = {
  builtAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  readOnly: true, dbWrites: 0,
  v3: { total: v3.length, koNonTranslation: koRows.length, excludedTranslation: enRows.length },
  trackA: {
    rows: trackA.length, uniqueCanonicalId: aCanon.size,
    dbMissing: trackA.filter((r) => r.dbMissing).length,
    enMixedIn: trackA.filter((r) => r.language === 'en').length,
    contentChangedSinceQueue: trackA.filter((r) => r.contentChangedSinceQueue).length,
    noOfficialFn: trackA.filter((r) => !r.hasOfficialFn).length,
    byHoldReason: tally(trackA, (r) => r.queueHoldReason),
    byRendererFamily: tally(trackA, (r) => r.rendererFamily ?? 'UNKNOWN'),
  },
  trackB: {
    rows: trackB.length, uniqueCandidateId: bCand.size,
    uniqueStatementNo: new Set(trackB.map((r) => r.statementNo)).size,
    candidateMissing: trackB.filter((r) => r.candidateMissing).length,
    candidateDeleted: trackB.filter((r) => r.candidateDeleted).length,
    hasMaster: trackB.filter((r) => r.hasMaster).length,
    noMaster: trackB.filter((r) => !r.hasMaster).length,
    hasFnAndSrv: trackB.filter((r) => r.hasFn && r.hasSrv).length,
    hasFnNoSrv: trackB.filter((r) => r.hasFn && !r.hasSrv).length,
    noFn: trackB.filter((r) => !r.hasFn).length,
    alreadyKoCanonical: trackB.filter((r) => r.koCanonicalCnt > 0).length,
    creatable: trackB.filter((r) => r.hasMaster && r.hasFn && r.hasSrv && r.koCanonicalCnt === 0).length,
    byOriginalReason: tally(trackB, (r) => r.originalHoldReason),
    byCandidateStatus: tally(trackB, (r) => String(r.candidateStatus)),
  },
  crossTrackSharedMaster: crossMaster.length,
  excludedTranslationBreakdown: tally(enRows, (r) => r.holdReason),
};

fs.writeFileSync(`${D}/hff-ko-nontranslation-population-v1.json`, JSON.stringify({ ...out, trackA, trackB }, null, 1));
await c.end();
console.log(JSON.stringify(out, null, 2));
