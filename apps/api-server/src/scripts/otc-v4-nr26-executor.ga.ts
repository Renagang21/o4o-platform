/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal14 · rectal12 실행기 (에이전트 가 · 단독 write owner)
 *
 * route535 실행기(otc-v4-route535-executor.ga.ts)의 실행 함수(execKo/execEn/liveState/runOne)를
 * **동일 계약으로** 이식한다. rollback-test 가 LIVE apply 와 같은 코드 경로를 타야 §12 가 성립한다.
 * 차이는 대상 원장 · batchId · sourceRef namespace 아님(동일) · **LIVE 이중 잠금**뿐이다.
 *
 * 계약(T=1):
 *   KO 4T : authored needs_review INSERT → easy canonical demote → authored canonical flip → audit INSERT
 *   EN 2T : authored en needs_review INSERT → canonical flip (KO authored canonical 성립 후에만)
 *   → master 당 6T. nasal 14×6=84T · rectal 12×6=72T · 합계 156T.
 *
 * 모드:
 *   (기본) dry-run        : write 0. 결정론적 plan digest 산출(§11 2회 byte-identical 대상).
 *   --rollback-test       : 제품별 TX(KO→검증→EN→검증) 후 **항상 ROLLBACK**. 독립 커넥션 residue 0 확인.
 *   --apply --confirm     : LIVE. **이 WO 에서는 실행 불가** — env 2개 동시 충족 필요(§14 잠금).
 *
 * ⚠️ 본 WO 의 최종 committed DB write 는 0 이다. rollback-test 내부 write 는 전량 ROLLBACK 된다.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-nr26-executor.ga.ts --unit nasal   [--port 5495]
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-nr26-executor.ga.ts --unit rectal  --rollback-test
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { DATA_DIR, masterRefV4 } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_NR, BATCH_ID_NR, UNITS, CONFIRM_ENV_NR, APPROVAL_WO_ENV_NR } from './otc-v4-nr26-contract.ga.js';

const WO = WO_NR;
const BATCH_ID = BATCH_ID_NR;
const SOURCE_TYPE = 'mfds_drug_otc';
const EASY_SOURCE = 'mfds_easy_drug';
const AUTHORED = ['mfds_drug_otc', 'nutrition_combo'];

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);

const PREP = path.join(DATA_DIR, 'otc-v4-nr26-prep.ga.json');
const KO_PAYLOAD = path.join(DATA_DIR, 'otc-v4-nr26-ko-payload.ga.json');
const EN_PAYLOAD = path.join(DATA_DIR, 'otc-v4-nr26-en-payload.ga.json');

type Mode = 'dry-run' | 'rollback-test' | 'APPLY';
const MODE: Mode = has('--rollback-test') ? 'rollback-test' : (has('--apply') && has('--confirm') ? 'APPLY' : 'dry-run');

interface Unit { row: any; ko?: any; en?: any; sourceRef: string }

const sha = (s: string): string => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ── KO 4T (T=1) ─────────────────────────────────────────────────────────────
async function execKo(c: PoolClient, u: Unit): Promise<any> {
  const mid = u.row.masterId, REF = u.sourceRef, html = u.ko.content;
  const ins = await c.query(
    `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
     SELECT $1::uuid, $2, $3, $4, $5::uuid, 'needs_review', 'ko', 'STORE', now(), now()
     WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=$1::uuid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type = ANY($6) AND s.status IN ('canonical','needs_review'))
     RETURNING id`, [mid, html, u.ko.summary || null, SOURCE_TYPE, REF, AUTHORED]);
  if ((ins.rowCount || 0) !== 1) throw new Error(`KO insert ${ins.rowCount}!=1 (authored row 선점)`);

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
      officialSourceHash: u.row.officialSourceHash, batchId: BATCH_ID, unit: u.row.unit,
      reason: 'V4 nasal/rectal 경로 프로파일 기반 제품별 공식 원문 grounded 매장용 설명서 canonical 승격(easy→authored, 공식 6섹션 보존)',
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

/** 제품 1건 처리 — 실패는 이 함수 내부에서 격리된다(throw 하지 않음). */
async function runOne(pool: Pool, u: Unit): Promise<any> {
  const r = u.row;
  const base = {
    masterId: r.masterId, unit: r.unit, productCode: r.permitCode ?? null, productName: r.productName,
    stratum: r.stratum, route: r.route ?? null, sourceRef: u.sourceRef, officialSourceHash: r.officialSourceHash,
  };
  if (!u.ko || !u.en) {
    return { ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0,
      exceptionCode: u.ko ? 'TRANSLATION_VALIDATION_FAILED' : 'COMPOSER_SECTION_UNSUPPORTED',
      detail: u.ko ? 'EN payload 미생성' : 'KO payload 미생성' };
  }

  const st = await liveState(pool, u);
  if (st.authoredkocanon === 1 && st.encanon === 1 && st.kohash === u.ko.contentHash && st.enhash === u.en.contentHash) {
    return { ...base, status: 'SKIP_ALREADY_COMPLETE', koWriteActual: 0, enWriteActual: 0, writeActual: 0, live: st };
  }
  const pre = (code: string, detail: string): any => ({ ...base, status: 'EXCEPTION', koWriteActual: 0, enWriteActual: 0, writeActual: 0, exceptionCode: code, detail, before: st });
  if (st.authoredkocanon > 0 || st.authoredkoany > 0 || st.enany > 0) return pre('EXISTING_CANONICAL_CONFLICT', `authoredKo=${st.authoredkoany} en=${st.enany} 선점(부분 상태)`);
  if (st.easykocanon !== 1) return pre('EXISTING_CANONICAL_CONFLICT', `easy ko canonical=${st.easykocanon} (1 이어야 함)`);
  if (st.refrows > 0) return pre('SOURCE_REF_CONFLICT', `V4 sourceRef LIVE 점유 ${st.refrows}행`);

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
      await c.query('RELEASE SAVEPOINT sp_master');
      if (MODE === 'APPLY') {
        await c.query('COMMIT');
        rep.status = 'GREEN'; rep.committed = true;
        rep.koWriteActual = ko.writeActual; rep.enWriteActual = en.writeActual; rep.writeActual = ko.writeActual + en.writeActual;
      } else {
        await c.query('ROLLBACK');
        rep.status = 'ROLLBACK_TEST_PASS'; rep.committed = false;
        rep.koWriteActual = 0; rep.enWriteActual = 0; rep.writeActual = 0;
        rep.txWritten = ko.writeActual + en.writeActual;   // TX 내부에서 실제 수행된 T 수(=6). 커밋되지 않는다.
      }
    } catch (e) {
      await c.query('ROLLBACK TO SAVEPOINT sp_master');
      await c.query('ROLLBACK');
      rep.status = 'EXCEPTION'; rep.committed = false; rep.koWriteActual = 0; rep.enWriteActual = 0; rep.writeActual = 0;
      rep.exceptionCode = 'OTHER_REVIEW_REQUIRED'; rep.detail = e instanceof Error ? e.message : String(e);
    }
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { /* noop */ }
    rep.status = 'EXCEPTION'; rep.koWriteActual = 0; rep.enWriteActual = 0; rep.writeActual = 0;
    rep.exceptionCode = 'OTHER_REVIEW_REQUIRED'; rep.detail = e instanceof Error ? e.message : String(e);
  } finally { c.release(); }

  // 독립 커넥션(pool 의 다른 커넥션)으로 잔여 재확인 — §12 residue 0
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
  } else {
    rep.residue = { authoredKoAny: after.authoredkoany, enAny: after.enany, refRows: after.refrows, auditRows: after.auditn, easyKoCanonical: after.easykocanon };
    rep.residueClean = after.authoredkoany === 0 && after.enany === 0 && after.refrows === 0 && after.auditn === 0 && after.easykocanon === 1;
  }
  return rep;
}

async function main(): Promise<void> {
  // ── §14 LIVE 이중 잠금 ──────────────────────────────────────────────────────
  if (MODE === 'APPLY') {
    const ok = process.env[CONFIRM_ENV_NR] === 'CONFIRM' && !!(process.env[APPROVAL_WO_ENV_NR] || '').trim();
    if (!ok) {
      console.error(`LOCKED: LIVE apply 는 ${CONFIRM_ENV_NR}=CONFIRM 과 ${APPROVAL_WO_ENV_NR}=<승인 WO> 동시 충족 시에만 가능하다. 본 WO 범위에서는 실행 금지.`);
      process.exit(3);
    }
  }

  const unitArg = (arg('--unit') || '').replace(/-unit-1$/, '');
  const spec = UNITS[unitArg as keyof typeof UNITS];
  if (!spec) { console.error('--unit nasal | rectal 필요'); process.exit(1); }

  const prep = JSON.parse(fs.readFileSync(PREP, 'utf8'));
  const koBy = new Map<string, any>(JSON.parse(fs.readFileSync(KO_PAYLOAD, 'utf8')).payloads.map((p: any) => [p.masterId, p]));
  const enBy = new Map<string, any>(JSON.parse(fs.readFileSync(EN_PAYLOAD, 'utf8')).payloads.map((p: any) => [p.masterId, p]));

  let units: Unit[] = prep.rows
    .filter((row: any) => row.unit === spec.unit)
    .sort((a: any, b: any) => (a.masterId < b.masterId ? -1 : 1))
    .map((row: any) => ({ row, ko: koBy.get(row.masterId), en: enBy.get(row.masterId), sourceRef: masterRefV4(row.masterId) }));
  for (const u of units) {
    if (u.sourceRef !== u.row.plannedSourceRef) throw new Error(`sourceRef 결정성 위반 ${u.row.masterId}`);
    if (u.row.route !== spec.route) throw new Error(`unit/route 불일치 ${u.row.masterId} ${u.row.route}`);
  }
  if (units.length !== spec.expected) throw new Error(`SYSTEM STOP: ${spec.unit} 대상 ${units.length} ≠ 기대 ${spec.expected}`);
  const only = arg('--only');
  if (only) units = units.filter((u) => u.row.masterId === only);

  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', statement_timeout: 900000, max: 4 });
  const results: any[] = [];
  try {
    for (let i = 0; i < units.length; i++) {
      const r = await runOne(pool, units[i]);
      results.push(r);
      const tag = r.status === 'EXCEPTION' ? '✗' : '·';
      console.error(`${tag} [${i + 1}/${units.length}] ${r.masterId} ${r.status}${r.exceptionCode ? ' ' + r.exceptionCode : ''} write=${r.writeActual}`);
    }
  } finally { await pool.end(); }

  const exc = results.filter((r) => r.status === 'EXCEPTION');
  const writeActual = results.reduce((t, r) => t + (r.writeActual || 0), 0);
  const txWritten = results.reduce((t, r) => t + (r.txWritten || 0), 0);
  const residueDirty = results.filter((r) => r.residueClean === false).length;

  // ── §11 결정론적 plan digest — timestamp·난수 비포함 ─────────────────────────
  const planRows = results.map((r) => ({
    masterId: r.masterId, unit: r.unit, route: r.route, productCode: r.productCode,
    sourceRef: r.sourceRef, officialSourceHash: r.officialSourceHash,
    koContentHash: r.koContentHash ?? null, enContentHash: r.enContentHash ?? null,
    status: r.status, writePlanKo: 4, writePlanEn: 2, writePlanTotal: 6,
    beforeEasyKoCanonical: r.before?.easykocanon ?? r.live?.easykocanon ?? null,
    beforeAuthoredKoAny: r.before?.authoredkoany ?? null,
    beforeEnAny: r.before?.enany ?? null,
    beforeSourceRefRows: r.before?.refrows ?? null,
  }));
  const plan = {
    wo: WO, batchId: BATCH_ID, unit: spec.unit, route: spec.route, mode: MODE,
    target: units.length, expected: spec.expected,
    writeContract: { perMasterKo: 4, perMasterEn: 2, perMaster: 6, unitTotal: units.length * 6 },
    liveDbWriteCommitted: MODE === 'APPLY' ? writeActual : 0,
    rows: planRows,
  };
  const planJson = JSON.stringify(plan, null, 2) + '\n';
  const planDigest = sha(planJson);

  if (MODE === 'dry-run') {
    fs.writeFileSync(path.join(DATA_DIR, `otc-v4-nr26-dryrun-plan-${spec.unit}.ga.json`), planJson, 'utf8');
  }
  const summary = {
    wo: WO, agent: 'ga', writeOwner: 'agent-ga', batchId: BATCH_ID, unit: spec.unit, route: spec.route,
    mode: MODE, port: port(), target: units.length,
    dryRunPass: results.filter((r) => r.status === 'DRYRUN_PASS').length,
    rollbackTestPass: results.filter((r) => r.status === 'ROLLBACK_TEST_PASS').length,
    green: results.filter((r) => r.status === 'GREEN').length,
    skip: results.filter((r) => r.status === 'SKIP_ALREADY_COMPLETE').length,
    exception: exc.length,
    txWrittenThenRolledBack: txWritten,
    committedWriteActual: MODE === 'APPLY' ? writeActual : 0,
    liveDbWrite: MODE === 'APPLY' ? writeActual : 0,
    residueDirty,
    planDigest,
    pass: exc.length === 0 && residueDirty === 0 && results.length === units.length
      && (MODE === 'dry-run' ? writeActual === 0 && results.every((r) => r.status === 'DRYRUN_PASS')
        : MODE === 'rollback-test' ? writeActual === 0 && txWritten === units.length * 6 && results.every((r) => r.status === 'ROLLBACK_TEST_PASS')
          : writeActual === units.length * 6),
  };
  const outName = MODE === 'dry-run' ? `otc-v4-nr26-dryrun-${spec.unit}.ga.json`
    : MODE === 'rollback-test' ? `otc-v4-nr26-rollback-test-${spec.unit}.ga.json`
      : `otc-v4-nr26-apply-${spec.unit}.ga.json`;
  fs.writeFileSync(path.join(DATA_DIR, outName), JSON.stringify({ wo: WO, kind: outName.replace('.ga.json', ''), summary, results }, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) process.exitCode = 2;
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
