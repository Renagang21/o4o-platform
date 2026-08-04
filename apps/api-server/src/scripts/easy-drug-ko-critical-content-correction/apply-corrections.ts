/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 단계 2 시정 적용
 *
 * 입력: results/correction-plan.json (plan-corrections.ts 산출, READ-ONLY 단계)
 *
 * ── 제품 1건 = 독립 트랜잭션 + SAVEPOINT ────────────────────────────────────────
 *   REPLACE: 기존 오류 canonical → status='deprecated' 강등(보존) → 신규 canonical INSERT
 *   HOLD   : 기존 오류 canonical → status='deprecated' 강등만. 신규 INSERT 없음(비노출)
 *   두 경우 모두 감사 로그 1행. 물리 삭제 0. EN·zh·ja 무접촉. product_masters 무접촉.
 *
 * ⚠️ 안전 게이트
 *   - 기본 모드는 dry-run: 전 write 를 수행하고 post-verify 까지 마친 뒤 **무조건 ROLLBACK**.
 *   - LIVE 반영은 `--apply` + `EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM=YES` 이중 게이트.
 *   - `--rollback-test` 는 dry-run 후 LIVE 상태가 원상인지 트랜잭션 밖에서 재확인한다.
 *   - 대상 행은 (id, status='canonical', md5(content)=oldMd5) 3중 일치 시에만 건드린다.
 *     하나라도 어긋나면 그 제품은 SKIP — 다른 세션의 변경을 덮어쓰지 않는다.
 *
 * 실행:
 *   PGPASSWORD=... ../../node_modules/.bin/tsx src/scripts/easy-drug-ko-critical-content-correction/apply-corrections.ts --port 15441
 *   ... --rollback-test
 *   EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM=YES ... --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { WO, AUDIT_COMMIT, RESULTS_DIR, connect, md5, type Db, type CorrectionPlanRow } from './correction-contract.js';

const PLAN = path.join(RESULTS_DIR, 'correction-plan.json');
const APPLY = process.argv.includes('--apply');
const ROLLBACK_TEST = process.argv.includes('--rollback-test');
const ENV_GATE = process.env.EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM === 'YES';
/** 신규본의 실제 저작기. 기존 오류본의 source_type(특히 nutrition_combo)을 승계하지 않는다. */
const NEW_SOURCE_TYPE = 'mfds_drug_otc';

type Outcome =
  | 'REPLACED' | 'HELD'
  | 'SKIP_ALREADY_APPLIED' | 'SKIP_NOT_CANONICAL' | 'SKIP_CONTENT_DRIFTED' | 'SKIP_ROW_MISSING'
  | 'FAILED';

interface ResultRow {
  masterId: string; itemSeq: string; action: string; outcome: Outcome;
  oldDescId: string; newDescId: string | null; holdCode: string | null; error?: string;
}

async function processOne(db: Db, p: CorrectionPlanRow): Promise<ResultRow> {
  const base: ResultRow = {
    masterId: p.masterId, itemSeq: p.itemSeq, action: p.action, outcome: 'FAILED',
    oldDescId: p.oldDescId, newDescId: null, holdCode: p.holdCode,
  };
  const c = await db.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SAVEPOINT sp_master');

    // ── 대상 행 잠금 + 3중 일치 확인 ──────────────────────────────────────────
    const cur = (await c.query(
      `SELECT id::text, status, source_ref_id::text ref, md5(content) cmd5
         FROM shared_product_descriptions
        WHERE id=$1 AND deleted_at IS NULL AND description_type='STORE'
          AND COALESCE(language,'ko')='ko'
        FOR UPDATE`, [p.oldDescId])).rows[0];

    if (!cur) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_ROW_MISSING' }; }
    if (cur.status !== 'canonical') {
      // 이미 강등됐다 = 이 WO 가 먼저 돌았다. 신규본 존재 여부로 구분한다.
      const done = (await c.query(
        `SELECT count(*)::int n FROM shared_product_descriptions
          WHERE master_id=$1 AND deleted_at IS NULL AND description_type='STORE'
            AND COALESCE(language,'ko')='ko' AND status='canonical'`, [p.masterId])).rows[0].n;
      await c.query('ROLLBACK');
      return { ...base, outcome: (p.action === 'HOLD' ? done === 0 : done === 1) ? 'SKIP_ALREADY_APPLIED' : 'SKIP_NOT_CANONICAL' };
    }
    if (cur.cmd5 !== p.oldMd5) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_CONTENT_DRIFTED' }; }

    // ── 1) 오류본 은퇴 (물리 삭제 0) ───────────────────────────────────────────
    const dep = await c.query(
      `UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
        WHERE id=$1 AND status='canonical'`, [p.oldDescId]);
    if (dep.rowCount !== 1) throw new Error(`강등 rowCount=${dep.rowCount}`);

    // ── 2) 신규 canonical (REPLACE 만) ─────────────────────────────────────────
    let newId: string | null = null;
    if (p.action === 'REPLACE') {
      if (!p.newHtml || md5(p.newHtml) !== p.newMd5) throw new Error('신규본 md5 불일치');
      newId = (await c.query(
        `INSERT INTO shared_product_descriptions
           (master_id, content, summary, source_type, source_ref_id, status, language,
            description_type, curated_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'canonical','ko','STORE',now(),now(),now())
         RETURNING id::text`,
        [p.masterId, p.newHtml, p.newSummary, NEW_SOURCE_TYPE, cur.ref])).rows[0].id;
    }

    // ── 3) 감사 로그 ───────────────────────────────────────────────────────────
    await c.query(
      `INSERT INTO shared_product_description_audit_logs
         (event_type, description_type, master_id, language,
          previous_description_id, new_description_id, previous_status, new_status,
          performed_at, created_at, metadata)
       VALUES ($1,'STORE',$2,'ko',$3,$4,'canonical',$5, now(), now(), $6::jsonb)`,
      [
        p.action === 'REPLACE' ? 'canonical_replaced' : 'canonical_withdrawn',
        p.masterId, p.oldDescId, newId, p.action === 'REPLACE' ? 'canonical' : 'deprecated',
        JSON.stringify({
          wo: WO, auditCommit: AUDIT_COMMIT, auditVerdict: p.verdict,
          reason: p.action === 'REPLACE'
            ? '식약처 e약은요 공식 원문 기준 KO 재조립'
            : `공식 원문 직접 귀속 불가 — HOLD/비노출 (${p.holdCode})`,
          holdCode: p.holdCode, anomalies: p.anomalies,
          previousSource: p.oldSourceType, newSource: p.action === 'REPLACE' ? NEW_SOURCE_TYPE : null,
          previousMd5: p.oldMd5, newMd5: p.newMd5, route: p.route, routeSource: p.routeSource,
          permitCode: p.itemSeq,
        }),
      ]);

    // ── 4) post-verify (같은 TX 안) ────────────────────────────────────────────
    const v = (await c.query(
      `SELECT
         count(*) FILTER (WHERE status='canonical')::int ko_canon,
         count(*) FILTER (WHERE status='canonical' AND md5(content)=$2)::int ko_new,
         count(*) FILTER (WHERE id=$3 AND status='deprecated')::int retired
       FROM shared_product_descriptions
       WHERE master_id=$1 AND deleted_at IS NULL AND description_type='STORE'
         AND COALESCE(language,'ko')='ko'`,
      [p.masterId, p.newMd5 ?? '', p.oldDescId])).rows[0];
    const wantCanon = p.action === 'REPLACE' ? 1 : 0;
    if (v.ko_canon !== wantCanon) throw new Error(`post-verify ko canonical ${v.ko_canon} != ${wantCanon}`);
    if (p.action === 'REPLACE' && v.ko_new !== 1) throw new Error('post-verify 신규본 canonical 아님');
    if (v.retired !== 1) throw new Error('post-verify 오류본 강등 안 됨');

    if (APPLY && ENV_GATE) { await c.query('COMMIT'); }
    else { await c.query('ROLLBACK'); }
    return { ...base, outcome: p.action === 'REPLACE' ? 'REPLACED' : 'HELD', newDescId: newId };
  } catch (e: any) {
    try { await c.query('ROLLBACK TO SAVEPOINT sp_master'); } catch { /* TX 이미 종료 */ }
    try { await c.query('ROLLBACK'); } catch { /* noop */ }
    return { ...base, outcome: 'FAILED', error: String(e?.message ?? e) };
  } finally {
    c.release();
  }
}

async function main() {
  const plan: CorrectionPlanRow[] = JSON.parse(fs.readFileSync(PLAN, 'utf8')).rows;
  const mode = APPLY && ENV_GATE ? 'LIVE APPLY' : ROLLBACK_TEST ? 'ROLLBACK-TEST' : 'DRY-RUN';
  if (APPLY && !ENV_GATE) {
    process.stderr.write('STOP: --apply 는 EASY_DRUG_KO_CRITICAL_CORRECTION_APPLY_CONFIRM=YES 와 함께여야 한다.\n');
    process.exitCode = 2; return;
  }
  const db = await connect();
  try {
    const results: ResultRow[] = [];
    for (const p of plan) results.push(await processOne(db, p));

    const byOutcome: Record<string, number> = {};
    for (const r of results) byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;
    const failed = results.filter((r) => r.outcome === 'FAILED');

    // ── rollback-test: TX 밖에서 원상 확인 ─────────────────────────────────────
    let rollbackCheck: unknown = null;
    if (!APPLY) {
      const ids = plan.map((p) => p.oldDescId);
      const live = (await db.query(
        `SELECT count(*) FILTER (WHERE status='canonical')::int still_canonical,
                count(*) FILTER (WHERE status<>'canonical')::int moved,
                count(*)::int total
           FROM shared_product_descriptions WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]))[0];
      const inserted = (await db.query(
        `SELECT count(*)::int n FROM shared_product_descriptions
          WHERE master_id = ANY($1::uuid[]) AND source_type=$2 AND deleted_at IS NULL
            AND md5(content) = ANY($3::text[])`,
        [plan.map((p) => p.masterId), NEW_SOURCE_TYPE, plan.filter((p) => p.newMd5).map((p) => p.newMd5)]))[0];
      rollbackCheck = { 기존행_canonical_유지: live.still_canonical, 이동: live.moved, 총: live.total, 신규본_LIVE_잔존: inserted.n };
    }

    const summary = {
      wo: WO, mode,
      plan: { total: plan.length, replace: plan.filter((p) => p.action === 'REPLACE').length, hold: plan.filter((p) => p.action === 'HOLD').length },
      byOutcome,
      failed: failed.slice(0, 20).map((r) => ({ masterId: r.masterId, error: r.error })),
      rollbackCheck,
    };
    const stamp = mode.toLowerCase().replace(/[^a-z]+/g, '-');
    fs.writeFileSync(path.join(RESULTS_DIR, `apply-${stamp}.json`),
      JSON.stringify({ ...summary, results }, null, 2) + '\n', 'utf8');
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    if (failed.length) process.exitCode = 2;
  } finally {
    await db.destroy();
  }
}

main();
