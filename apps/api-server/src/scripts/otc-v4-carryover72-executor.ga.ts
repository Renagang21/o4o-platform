/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 제품별(master 단위) 독립 생산 실행기 (에이전트 가 · 단독 write owner)
 *
 * pilot 100 실행기(otc-v4-pilot-100-executor.ga.ts) VERBATIM 이식.
 * 변경점은 대상 경로 · batchId · confirm env · checkpoint 주기뿐이다. 계약(T수·SQL·검증)은 동일.
 *
 * 단위 = master 1건. 한 제품의 실패는 다음 제품 생산을 막지 않는다(continue-on-failure).
 * 제품별 독립 transaction + SAVEPOINT — 실패 시 해당 제품 write 0, 예외 원장 1행 기록 후 다음 제품 진행.
 *
 * 계약(T=1):
 *   KO 4T : authored needs_review INSERT → easy canonical demote → authored canonical flip → audit INSERT
 *   EN 2T : authored en needs_review INSERT → canonical flip (KO authored canonical 성립 후에만)
 *   source_type='mfds_drug_otc' · source_ref_id = masterRefV4(masterId) (V4 namespace 격리)
 *
 * 모드:
 *   (기본) dry-run        : write 0. 제품별 BEFORE 상태·write plan·예외 분류만 산출.
 *   --rollback-test       : 제품별 TX(KO→검증→EN→검증) 후 **항상 ROLLBACK**. 독립 커넥션 residue 0 확인.
 *   --apply --confirm     : LIVE. 추가로 env OTC_V4_APPLY_PILOT_500=CONFIRM 필수(2중 게이트).
 *
 * 재실행 멱등: 이미 KO·EN authored canonical + V4 sourceRef 가 성립한 master 는 SKIP_ALREADY_COMPLETE (write 0).
 * 체크포인트: 25건마다 원장 flush — proxy 만료 시 마지막 체크포인트부터 재개(완료분 자동 skip).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-carryover72-executor.ga.ts [--port 5502] [--rollback-test] [--apply --confirm] [--limit N] [--only <masterId>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool, PoolClient } from 'pg';
import { DATA_DIR, md5, masterRefV4 } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500, BATCH_ID_500 } from './otc-v4-carryover72-contract.ga.js';

const WO = WO_500;
const BATCH_ID = 'otc-v4-carryover72';
const SOURCE_TYPE = 'mfds_drug_otc';
const EASY_SOURCE = 'mfds_easy_drug';
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];
const CHECKPOINT_EVERY = 26;
const CONFIRM_ENV = 'OTC_V4_APPLY_CARRYOVER72';

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5502', 10);

const PREP = path.join(DATA_DIR, 'otc-v4-carryover72-prep.ga.json');
const KO_PAYLOAD = path.join(DATA_DIR, 'otc-v4-carryover72-ko-payload.ga.json');
const EN_PAYLOAD = path.join(DATA_DIR, 'otc-v4-carryover72-en-payload.ga.json');
const OUT_RESULT = path.join(DATA_DIR, 'otc-v4-carryover72-result-ledger.ga.json');
const OUT_GREEN = path.join(DATA_DIR, 'otc-v4-carryover72-green-ledger.ga.json');
const OUT_EXC = path.join(DATA_DIR, 'otc-v4-carryover72-exception-handoff-na.ga.json');
const OUT_CKPT = path.join(DATA_DIR, 'otc-v4-carryover72-checkpoint-ledger.ga.json');

type Mode = 'dry-run' | 'rollback-test' | 'APPLY';
const MODE: Mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

interface Unit { row: any; ko?: any; en?: any; sourceRef: string; }

function reproCmd(masterId: string): string {
  return `../../node_modules/.bin/tsx src/scripts/otc-v4-carryover72-executor.ga.ts --only ${masterId} --rollback-test --port ${port()}`;
}

function numericTokensOf(row: any): any {
  const t = row.numericTokens;
  if (t) return t;
  return { digitTokens: null, hasUnicodeFraction: null, hasAgeToken: null, hasDurationToken: null };
}

/** 예외 원장 1행(na handoff schema required 17 필드) — 실패 master 는 dbWriteActual 0 불변 */
function excRecord(u: Unit, code: string, stage: string, detail: string, extra: any = {}): any {
  const r = u.row;
  return {
    masterId: r.masterId,
    productCode: r.permitCode ?? null,
    productName: r.productName,
    sourceHoldClass: r.sourceHoldClass,
    exceptionCode: code,
    failedStage: stage,
    officialSectionPresence: r.officialSectionPresence,
    officialSourceHash: r.officialSourceHash ?? null,
    candidateRoute: r.route ?? null,
    identitySnapshot: { gencode: r.gencode ?? null, gencodeCount: r.gencodeCount ?? 0, classKinds: r.classKinds || [], atcCode: r.atcCode ?? null },
    numericTokens: numericTokensOf(r),
    existingCanonicalState: { authoredKo: r.slot?.authoredKoCanon ?? 0, en: r.slot?.enCanon ?? 0, ...(extra.existingCanonicalState || {}) },
    sourceRefState: { planned: u.sourceRef, liveConflict: extra.liveConflict ?? r.sourceRefLiveOccupancy ?? 0 },
    dbWriteActual: 0,
    retryable: !['SOURCE_EFFICACY_MISSING', 'SOURCE_DOSAGE_MISSING'].includes(code),
    recommendedAction: RECOMMEND[code] || 'na 에이전트 원문·계약 재검토 후 가 에이전트 재투입',
    reproductionCommand: reproCmd(r.masterId),
    detail,
    batchId: BATCH_ID,
    occurredAtSourceRef: `otc-v4-master-leaflet:${r.masterId}`,
    stratum: r.stratum,
    expectedExceptionCode: r.expectedExceptionCode ?? null,
  };
}

const RECOMMEND: Record<string, string> = {
  ROUTE_UNRESOLVED: '공식 용법 원문·제형 근거로 투여경로 확정(제품명 추론 금지) 후 가 에이전트 재투입',
  ROUTE_CONFLICT: '비경구 경로 동사 2종 동시 출현 — 원문 기준 대표경로 확정 또는 subgroup 분리 후 재투입',
  SOURCE_EFFICACY_MISSING: 'ETL 원천 재수집 전 terminal — 창작 금지, 원문 확보 시에만 재투입',
  SOURCE_DOSAGE_MISSING: 'ETL 원천 재수집 전 terminal — 창작 금지, 원문 확보 시에만 재투입',
  IDENTITY_CONFLICT: '품목기준코드 다중 또는 공식 원문 hash 다중 — identity 단일 확정 후 재투입',
  IDENTITY_MISSING: '품목기준코드 확보 후 재투입 — per-master 자기 원문 grounding 이면 생산 가능',
  PROFESSIONAL_USE: '전문의약품 여부 확정 — 일반의약품 확인 시에만 재투입',
  EXISTING_CANONICAL_CONFLICT: '기존 authored/en canonical 점유 상태 확인 후 교체 정책 판단',
  SOURCE_REF_CONFLICT: 'V4 sourceRef LIVE 점유 원인 규명 후 재투입',
  COMPOSER_SECTION_UNSUPPORTED: 'composer route profile 보강 후 재투입',
  TRANSLATION_VALIDATION_FAILED: 'EN 번역메모리 문장 보강 후 재투입',
  OTHER_REVIEW_REQUIRED: 'detail 확인 후 원인별 분류 → 가 에이전트 재투입',
};

// ── KO 4T (T=1) ─────────────────────────────────────────────────────────────
async function execKo(c: PoolClient, u: Unit): Promise<any> {
  const mid = u.row.masterId, REF = u.sourceRef, html = u.ko.content;
  const ins = await c.query(
    `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
     SELECT $1::uuid, $2, $3, $4, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now()
     WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type = ANY($6) AND s.status IN ('canonical','needs_review'))
     RETURNING id`, [mid, html, u.ko.summary || null, SOURCE_TYPE, REF, AUTHORED]);
  const stepA = ins.rowCount || 0;
  if (stepA !== 1) throw new Error(`KO insert ${stepA}!=1 (authored row 선점)`);

  const cur = await c.query(
    `SELECT id::text id, source_type FROM shared_product_descriptions
     WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]);
  if (cur.rowCount !== 1) throw new Error(`KO canonical ${cur.rowCount}!=1`);
  if (cur.rows[0].source_type !== EASY_SOURCE) throw new Error(`KO canonical source ${cur.rows[0].source_type} 예상밖`);
  const easyId = cur.rows[0].id;

  const dem = await c.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]);
  if (dem.rowCount !== 1) throw new Error(`KO demote ${dem.rowCount}`);

  const flip = await c.query(
    `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
     WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type = ANY($2) AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, AUTHORED]);
  if (flip.rowCount !== 1) throw new Error(`KO flip ${flip.rowCount}`);
  const newId = flip.rows[0].id;

  await c.query(
    `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
     VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
    [mid, easyId, newId, JSON.stringify({
      targetMaster: mid, beforeSource: EASY_SOURCE, afterSource: SOURCE_TYPE, source_ref_id: REF,
      route: u.row.route, permitCode: u.row.permitCode ?? null, contentHash: u.ko.contentHash,
      officialSourceHash: u.row.officialSourceHash, batchId: BATCH_ID,
      reason: 'V4 제품별(master 단위) 공식 원문 grounded 매장용 설명서 canonical 승격(easy→authored, 공식 6섹션 보존)',
      wo: WO, productionWo: WO,
    })]);

  const post = (await c.query(
    `SELECT
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($2) AND s.deleted_at IS NULL) authored,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easyleft,
      (SELECT md5(s.content) FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($2) AND s.deleted_at IS NULL LIMIT 1) storedhash,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=$3::uuid AND s.deleted_at IS NULL AND s.master_id<>$1::uuid) outside,
      (SELECT count(*)::int FROM shared_product_description_audit_logs a WHERE a.master_id=$1::uuid AND a.event_type='canonical_replaced' AND (a.metadata->>'source_ref_id')=$3::text) auditn`,
    [mid, AUTHORED, REF])).rows[0];

  const fail: string[] = [];
  if (post.canoncnt !== 1) fail.push(`canon=${post.canoncnt}`);
  if (post.authored !== 1) fail.push(`authored=${post.authored}`);
  if (post.dep !== 1) fail.push(`dep=${post.dep}`);
  if (post.easyleft !== 0) fail.push(`easyLeft=${post.easyleft}`);
  if (post.storedhash !== u.ko.contentHash) fail.push(`storedHash≠payload(${post.storedhash})`);
  if (post.outside !== 0) fail.push(`sourceRef outside=${post.outside}`);
  if (post.auditn !== 1) fail.push(`audit=${post.auditn}`);
  return { writeActual: 4, writePlan: 4, post, fail };
}

// ── EN 2T (T=1) ─────────────────────────────────────────────────────────────
async function execEn(c: PoolClient, u: Unit): Promise<any> {
  const mid = u.row.masterId, REF = u.sourceRef, html = u.en.content;
  const koCanon = (await c.query(
    `SELECT count(*)::int n FROM shared_product_descriptions WHERE master_id=$1::uuid AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type = ANY($2) AND deleted_at IS NULL`, [mid, AUTHORED])).rows[0].n;
  if (koCanon !== 1) throw new Error(`EN 선행조건 미충족: KO authored canonical ${koCanon}!=1`);

  const ins = await c.query(
    `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
     SELECT $1::uuid, $2, $3, $4, $5::uuid, 'needs_review', 'en', 'STORE', now(), now()
     WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL AND s.source_type = ANY($6) AND s.status IN ('canonical','needs_review'))
     RETURNING id`, [mid, html, u.en.summary || null, SOURCE_TYPE, REF, AUTHORED]);
  if (ins.rowCount !== 1) throw new Error(`EN insert ${ins.rowCount}!=1`);
  const flip = await c.query(
    `UPDATE shared_product_descriptions SET status='canonical', curated_at=now()
     WHERE master_id=$1::uuid AND description_type='STORE' AND language='en' AND source_type = ANY($2) AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid, AUTHORED]);
  if (flip.rowCount !== 1) throw new Error(`EN flip ${flip.rowCount}`);

  const post = (await c.query(
    `SELECT
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) encanon,
      (SELECT md5(s.content) FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.source_type = ANY($2) AND s.deleted_at IS NULL LIMIT 1) storedhash,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=$3::uuid AND s.language='en' AND s.deleted_at IS NULL AND s.master_id<>$1::uuid) outside`,
    [mid, AUTHORED, REF])).rows[0];
  const fail: string[] = [];
  if (post.encanon !== 1) fail.push(`enCanon=${post.encanon}`);
  if (post.storedhash !== u.en.contentHash) fail.push(`enStoredHash≠payload(${post.storedhash})`);
  if (post.outside !== 0) fail.push(`enSourceRef outside=${post.outside}`);
  return { writeActual: 2, writePlan: 2, post, fail };
}

/** 제품별 LIVE 상태 재조회 — skip 판정 및 preflight 근거 */
async function liveState(pool: Pool, u: Unit): Promise<any> {
  const mid = u.row.masterId, REF = u.sourceRef;
  return (await pool.query(
    `SELECT
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) easykocanon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type = ANY($2) AND s.deleted_at IS NULL) authoredkocanon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type = ANY($2) AND s.deleted_at IS NULL) authoredkoany,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.source_type = ANY($2) AND s.deleted_at IS NULL) encanon,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.status IN ('canonical','needs_review') AND s.source_type = ANY($2) AND s.deleted_at IS NULL) enany,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=$3::uuid AND s.deleted_at IS NULL) refrows,
      (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=$3::uuid AND s.deleted_at IS NULL AND s.master_id<>$1::uuid) refoutside,
      (SELECT count(*)::int FROM shared_product_description_audit_logs a WHERE a.master_id=$1::uuid AND (a.metadata->>'source_ref_id')=$3::text) auditn,
      (SELECT md5(s.content) FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type = ANY($2) AND s.deleted_at IS NULL LIMIT 1) kohash,
      (SELECT md5(s.content) FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.source_type = ANY($2) AND s.deleted_at IS NULL LIMIT 1) enhash`,
    [mid, AUTHORED, REF])).rows[0];
}

/** 제품 1건 처리 — 실패는 이 함수 내부에서 격리된다(throw 하지 않음) */
async function runOne(pool: Pool, u: Unit): Promise<any> {
  const r = u.row;
  const base = { masterId: r.masterId, productCode: r.permitCode ?? null, productName: r.productName, stratum: r.stratum, route: r.route ?? null, sourceRef: u.sourceRef, officialSourceHash: r.officialSourceHash };

  if (r.preExceptionCode) {
    const st = await liveState(pool, u);
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exception: excRecord(u, r.preExceptionCode, stageOf(r.preExceptionCode), r.preExceptionDetail || '사전 게이트에서 확정된 제품별 예외', { liveConflict: st.refoutside, existingCanonicalState: { authoredKo: st.authoredkocanon, en: st.encanon } }) };
  }
  if (!u.ko || !u.en) {
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exception: excRecord(u, u.ko ? 'TRANSLATION_VALIDATION_FAILED' : 'COMPOSER_SECTION_UNSUPPORTED', u.ko ? 'translate' : 'compose', u.ko ? 'EN payload 미생성' : 'KO payload 미생성') };
  }

  const st = await liveState(pool, u);
  if (st.authoredkocanon === 1 && st.encanon === 1 && st.kohash === u.ko.contentHash && st.enhash === u.en.contentHash) {
    return { ...base, status: 'SKIP_ALREADY_COMPLETE', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      live: st, verify: { koCanonical: 1, enCanonical: 1, contentHashMatch: true } };
  }

  if (st.authoredkocanon > 0 || st.authoredkoany > 0 || st.enany > 0) {
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exception: excRecord(u, 'EXISTING_CANONICAL_CONFLICT', 'preflight', `authoredKo=${st.authoredkoany} en=${st.enany} 선점(부분 상태)`, { existingCanonicalState: { authoredKo: st.authoredkocanon, en: st.encanon } }) };
  }
  if (st.easykocanon !== 1) {
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exception: excRecord(u, 'EXISTING_CANONICAL_CONFLICT', 'preflight', `easy ko canonical=${st.easykocanon} (1 이어야 함)`) };
  }
  if (st.refrows > 0) {
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exception: excRecord(u, 'SOURCE_REF_CONFLICT', 'preflight', `V4 sourceRef LIVE 점유 ${st.refrows}행`, { liveConflict: st.refrows }) };
  }

  if (MODE === 'dry-run') {
    return { ...base, status: 'DRYRUN_PASS', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      writePlan: { ko: 4, en: 2, total: 6 }, before: st, koContentHash: u.ko.contentHash, enContentHash: u.en.contentHash };
  }

  const c = await pool.connect();
  const rep: any = { ...base, koContentHash: u.ko.contentHash, enContentHash: u.en.contentHash };
  try {
    await c.query('BEGIN');
    await c.query('SAVEPOINT sp_master');
    try {
      const ko = await execKo(c, u);
      if (ko.fail.length) throw new Error(`KO 사후검증 실패 [${ko.fail.join(',')}]`);
      const en = await execEn(c, u);
      if (en.fail.length) throw new Error(`EN 사후검증 실패 [${en.fail.join(',')}]`);
      rep.ko = ko; rep.en = en;
      rep.koWriteActual = ko.writeActual; rep.enWriteActual = en.writeActual; rep.writeActual = ko.writeActual + en.writeActual;
      await c.query('RELEASE SAVEPOINT sp_master');
      if (MODE === 'APPLY') { await c.query('COMMIT'); rep.status = 'GREEN'; rep.committed = true; }
      else { await c.query('ROLLBACK'); rep.status = 'ROLLBACK_TEST_PASS'; rep.committed = false; rep.writeActual = 0; rep.koWriteActual = 0; rep.enWriteActual = 0; rep.txWritten = ko.writeActual + en.writeActual; }
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT sp_master');
      await c.query('ROLLBACK');
      const msg = e instanceof Error ? e.message : String(e);
      rep.status = 'EXCEPTION'; rep.committed = false; rep.koWriteActual = 0; rep.enWriteActual = 0; rep.writeActual = 0;
      rep.exception = excRecord(u, classify(msg), 'persist', msg);
    }
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { /* noop */ }
    const msg = e instanceof Error ? e.message : String(e);
    rep.status = 'EXCEPTION'; rep.koWriteActual = 0; rep.enWriteActual = 0; rep.writeActual = 0;
    rep.exception = excRecord(u, 'OTHER_REVIEW_REQUIRED', 'persist', msg);
  } finally { c.release(); }

  const after = await liveState(pool, u);
  rep.after = after;
  if (rep.status === 'GREEN') {
    const f: string[] = [];
    if (after.authoredkocanon !== 1) f.push(`koCanon=${after.authoredkocanon}`);
    if (after.encanon !== 1) f.push(`enCanon=${after.encanon}`);
    if (after.kohash !== u.ko.contentHash) f.push('koHash 불일치');
    if (after.enhash !== u.en.contentHash) f.push('enHash 불일치');
    if (after.auditn !== 1) f.push(`audit=${after.auditn}`);
    if (after.refoutside !== 0) f.push(`refOutside=${after.refoutside}`);
    rep.postVerify = { fail: f, pass: f.length === 0 };
    if (f.length) { rep.status = 'EXCEPTION'; rep.exception = excRecord(u, 'OTHER_REVIEW_REQUIRED', 'verify', `커밋 후 독립검증 실패 [${f.join(',')}]`); }
  } else {
    rep.residue = { authoredKoAny: after.authoredkoany, enAny: after.enany, refRows: after.refrows, auditRows: after.auditn };
    rep.residueClean = after.authoredkoany === 0 && after.enany === 0 && after.refrows === 0 && after.auditn === 0;
  }
  return rep;
}

function stageOf(code: string): string {
  if (code.startsWith('IDENTITY')) return 'identity';
  if (code.startsWith('ROUTE')) return 'route';
  if (code.startsWith('SOURCE_') && code.endsWith('MISSING')) return 'source';
  if (code === 'PROFESSIONAL_USE') return 'screen';
  if (code === 'COMPOSER_SECTION_UNSUPPORTED') return 'compose';
  if (code === 'TRANSLATION_VALIDATION_FAILED') return 'translate';
  return 'preflight';
}
function classify(msg: string): string {
  if (/canonical/.test(msg) && /선점|예상밖|!=1/.test(msg)) return 'EXISTING_CANONICAL_CONFLICT';
  if (/sourceRef|source_ref/.test(msg)) return 'SOURCE_REF_CONFLICT';
  return 'OTHER_REVIEW_REQUIRED';
}

async function main(): Promise<void> {
  if (MODE === 'APPLY' && process.env[CONFIRM_ENV] !== 'CONFIRM') {
    console.error(`LOCKED: confirm env(${CONFIRM_ENV}=CONFIRM) 미설정 — LIVE apply 금지`); process.exit(3);
  }
  const prep = JSON.parse(fs.readFileSync(PREP, 'utf8'));
  const koBy = new Map<string, any>(JSON.parse(fs.readFileSync(KO_PAYLOAD, 'utf8')).payloads.map((p: any) => [p.masterId, p]));
  const enBy = new Map<string, any>(JSON.parse(fs.readFileSync(EN_PAYLOAD, 'utf8')).payloads.map((p: any) => [p.masterId, p]));
  const only = arg('--only');
  const limit = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;

  let units: Unit[] = prep.rows.map((row: any) => ({ row, ko: koBy.get(row.masterId), en: enBy.get(row.masterId), sourceRef: masterRefV4(row.masterId) }));
  for (const u of units) if (u.sourceRef !== u.row.plannedSourceRef) throw new Error(`sourceRef 결정성 위반 ${u.row.masterId}`);
  if (only) units = units.filter((u) => u.row.masterId === only);
  if (limit) units = units.slice(0, limit);

  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', statement_timeout: 900000, max: 4 });
  const results: any[] = [];
  const checkpoints: any[] = [];
  const started = new Date().toISOString();
  RUN_STARTED = started;
  try {
    for (let i = 0; i < units.length; i++) {
      const r = await runOne(pool, units[i]);
      results.push(r);
      const tag = r.status === 'GREEN' ? '✓' : r.status === 'EXCEPTION' ? '✗' : '·';
      console.error(`${tag} [${i + 1}/${units.length}] ${r.masterId} ${r.status}${r.exception ? ' ' + r.exception.exceptionCode : ''} write=${r.writeActual}`);
      if ((i + 1) % CHECKPOINT_EVERY === 0 || i === units.length - 1) {
        checkpoints.push({ checkpoint: checkpoints.length + 1, processed: results.length, lastMasterId: r.masterId,
          green: results.filter((x) => x.status === 'GREEN').length,
          exception: results.filter((x) => x.status === 'EXCEPTION').length,
          skip: results.filter((x) => x.status === 'SKIP_ALREADY_COMPLETE').length,
          writeActual: results.reduce((t, x) => t + (x.writeActual || 0), 0), at: new Date().toISOString() });
        flush(results, checkpoints, units.length, started);
      }
    }
  } finally { await pool.end(); }

  const out = flush(results, checkpoints, units.length, started);
  console.log(JSON.stringify(out.summary, null, 2));
  console.log(`\n=== ${MODE} · target ${units.length} · GREEN ${out.summary.green} · EXCEPTION ${out.summary.exception} · SKIP ${out.summary.skip} · write ${out.summary.writeActual} · PASS=${out.summary.pass} ===`);
  if (!out.summary.pass) process.exitCode = 2;
}

/**
 * run 별 불변 사본 경로. `x.ga.json` → `x.run-20260729T140840.ga.json`.
 *
 * 배경(실측 사고): pilot 500 에서 멱등 재실행(전량 SKIP)이 무접미 green-ledger 를 GREEN 0 으로
 * 덮어써, 이후 기준선 스냅샷이 선행 GREEN 을 80건으로 잘못 잡았다.
 * → 실행 결과 원장은 **run 별 불변 파일**을 정본으로 남기고, 무접미 파일은 "최신 실행" 편의 사본으로만 둔다.
 *   후속 배치가 선행 GREEN 을 참조할 때는 반드시 run 별 불변 파일을 쓴다.
 */
let RUN_STARTED = '';
const runTag = (started: string): string => started.replace(/[-:]/g, '').replace(/\..*$/, '');
function writeLedger(file: string, payload: string, _enc?: string): void {
  fs.writeFileSync(file, payload, 'utf8');                                       // 최신 실행 편의 사본
  const immutable = file.replace(/\.ga\.json$/, `.run-${runTag(RUN_STARTED)}.ga.json`);
  fs.writeFileSync(immutable, payload, 'utf8');                                  // 이 run 의 정본(다른 run 이 덮지 못함)
}

function flush(results: any[], checkpoints: any[], target: number, started: string): any {
  const green = results.filter((r) => r.status === 'GREEN');
  const exc = results.filter((r) => r.status === 'EXCEPTION');
  const skip = results.filter((r) => r.status === 'SKIP_ALREADY_COMPLETE');
  const dry = results.filter((r) => r.status === 'DRYRUN_PASS' || r.status === 'ROLLBACK_TEST_PASS');
  const byCode: Record<string, number> = {};
  for (const e of exc) byCode[e.exception.exceptionCode] = (byCode[e.exception.exceptionCode] || 0) + 1;
  const byRoute: Record<string, number> = {};
  for (const g of [...green, ...dry]) byRoute[g.route || 'null'] = (byRoute[g.route || 'null'] || 0) + 1;
  const byStratum: Record<string, any> = {};
  for (const r of results) {
    const s = (byStratum[r.row?.stratum || r.stratum] ||= { total: 0, green: 0, exception: 0, skip: 0 });
    s.total++;
    if (r.status === 'GREEN') s.green++; else if (r.status === 'EXCEPTION') s.exception++; else if (r.status === 'SKIP_ALREADY_COMPLETE') s.skip++;
  }
  const residueDirty = exc.filter((e) => e.residueClean === false).length;
  const summary = {
    wo: WO, agent: 'ga', writeOwner: 'agent-ga', batchId: BATCH_ID, mode: MODE, port: port(), startedAt: started,
    target, processed: results.length, green: green.length, exception: exc.length, skip: skip.length,
    dryOrRollback: dry.length,
    koWriteActual: results.reduce((t, r) => t + (r.koWriteActual || 0), 0),
    enWriteActual: results.reduce((t, r) => t + (r.enWriteActual || 0), 0),
    writeActual: results.reduce((t, r) => t + (r.writeActual || 0), 0),
    expectedWrite: green.length * 6,
    byExceptionCode: byCode, byRouteProduced: byRoute, byStratum,
    failedMasterResidueDirty: residueDirty,
    checkpoints: checkpoints.length,
    pass: residueDirty === 0
      && results.length === target
      && results.reduce((t, r) => t + (r.writeActual || 0), 0) === green.length * 6
      && green.every((g) => g.postVerify?.pass !== false),
  };
  writeLedger(OUT_RESULT, JSON.stringify({ wo: WO, kind: 'per-master-result-ledger', summary, results }, null, 2) + '\n', 'utf8');
  writeLedger(OUT_GREEN, JSON.stringify({
    wo: WO, kind: 'green-ledger', total: green.length,
    rows: green.map((g) => ({
      status: 'GREEN', masterId: g.masterId, productCode: g.productCode, productName: g.productName, route: g.route,
      sourceRef: g.sourceRef, officialSourceHash: g.officialSourceHash,
      koContentHash: g.koContentHash, enContentHash: g.enContentHash,
      koWriteActual: g.koWriteActual, enWriteActual: g.enWriteActual, writeActual: g.writeActual,
      auditRows: g.after?.auditn ?? null,
      canonicalState: { authoredKoCanonical: g.after?.authoredkocanon ?? null, enCanonical: g.after?.encanon ?? null, easyKoCanonicalLeft: g.after?.easykocanon ?? null },
      independentVerify: g.postVerify?.pass === true ? 'PASS' : 'FAIL',
    })),
  }, null, 2) + '\n', 'utf8');
  writeLedger(OUT_EXC, JSON.stringify({
    wo: WO, producer: 'agent-ga', consumer: 'agent-na', liveDbWrite: 0, batchId: BATCH_ID,
    schema: 'otc-v4-master-by-master-exception-handoff v1', total: exc.length, byExceptionCode: byCode,
    invariantCheck: { allFailedWriteZero: exc.every((e) => e.exception.dbWriteActual === 0), residueDirty },
    rows: exc.map((e) => e.exception),
  }, null, 2) + '\n', 'utf8');
  writeLedger(OUT_CKPT, JSON.stringify({ wo: WO, kind: 'checkpoint-ledger', every: CHECKPOINT_EVERY, checkpoints }, null, 2) + '\n', 'utf8');
  return { summary };
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
void md5;
