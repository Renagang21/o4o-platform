/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 단계 3 LIVE 재조립
 *
 * 두 가지 처분만 있다. 부분 수정·문자열 치환은 없다(WO 원칙 2).
 *   REPLACE  기존 오류 canonical 을 `deprecated` 로 강등하고, 제품 자기 e약은요 원문으로
 *            재조립한 신규본을 canonical 로 넣는다. `source_ref_id` 는 은퇴 행에서 승계한다
 *            (WO 완료조건 "sourceRef 변경 0").
 *   HOLD     경로 확정 불가·원문 귀속 실패는 고치지 않고 **비노출**한다(WO 원칙 6).
 *            강등만 하고 신규본을 넣지 않는다 → 해당 master 의 KO STORE canonical 은 0 이 된다.
 *            추측으로 경로를 정해 저작하는 것이 더 위험하다는 판단이며, 선례가 있다
 *            (선행 WO 의 `canonical_withdrawn` 43건).
 *
 * 안전장치:
 *   - master 별 독립 트랜잭션 + `FOR UPDATE` 3중 일치(id · status='canonical' · md5(content)=oldMd5).
 *     계획 산출 이후 본문이 바뀐 행은 건드리지 않고 SKIP_CONTENT_DRIFTED 로 남긴다.
 *   - 트랜잭션 내부 post-verify: REPLACE 는 ko canonical 이 정확히 1건이고 그 본문이 신규본,
 *     HOLD 는 ko canonical 이 0건.
 *   - dry-run 이 기본. `--apply` 는 전용 env 게이트와 함께여야 한다.
 *   - HOLD 비노출은 `--withdraw-holds` 를 따로 줘야 실행된다(교체와 회수는 다른 결정이다).
 *   - 멱등: 이미 신규본이면 SKIP_ALREADY_APPLIED, 이미 회수됐으면 SKIP_ALREADY_WITHDRAWN.
 *
 * write 대상은 `shared_product_descriptions` 와 `shared_product_description_audit_logs` 뿐이다.
 * product_masters · EN · ZH write 0. 물리 삭제 0.
 *
 * 실행:
 *   sh runtsx.sh src/scripts/easy-drug-ko-oral-prohibition-corpus-rebuild/apply-rebuild.ts --port 15441
 *   EASY_DRUG_KO_ORAL_PROHIBITION_REBUILD_APPLY_CONFIRM=YES ... --apply --withdraw-holds
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, md5, type Db } from '../easy-drug-ko-critical-content-correction/correction-contract.js';
import { WO, PRIOR_COMMIT } from './prohibition-contract.mjs';
import type { RebuildPlanRow } from './plan-rebuild.js';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PLAN = path.join(RESULTS, 'rebuild-plan.json');

const APPLY = process.argv.includes('--apply');
const WITHDRAW = process.argv.includes('--withdraw-holds');
const ENV_GATE = process.env.EASY_DRUG_KO_ORAL_PROHIBITION_REBUILD_APPLY_CONFIRM === 'YES';
const LIVE = APPLY && ENV_GATE;

const NEW_SOURCE_TYPE = 'mfds_drug_otc';
const RETIRED_STATUS = 'deprecated';

interface Outcome {
  masterId: string; itemSeq: string; action: 'REPLACE' | 'HOLD';
  outcome: string; oldDescId: string; newDescId: string | null; holdCode?: string | null; error?: string;
}

async function processOne(db: Db, p: RebuildPlanRow): Promise<Outcome> {
  const base: Outcome = {
    masterId: p.masterId, itemSeq: p.itemSeq, action: p.action,
    outcome: 'FAILED', oldDescId: p.oldDescId, newDescId: null, holdCode: p.postHoldCode ?? p.holdCode,
  };
  const c = await db.pool.connect();
  try {
    await c.query('BEGIN');

    const cur = (await c.query(
      `SELECT id::text, status, source_ref_id::text ref, md5(content) cmd5
         FROM shared_product_descriptions
        WHERE id=$1 AND deleted_at IS NULL AND description_type='STORE'
          AND COALESCE(language,'ko')='ko'
        FOR UPDATE`, [p.oldDescId])).rows[0];

    if (!cur) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_ROW_MISSING' }; }
    if (cur.status !== 'canonical') {
      await c.query('ROLLBACK');
      // 이미 강등돼 있으면 이 WO 가 앞서 처리한 것 — 멱등 재실행 경로다.
      return { ...base, outcome: p.action === 'HOLD' ? 'SKIP_ALREADY_WITHDRAWN' : 'SKIP_NOT_CANONICAL' };
    }
    if (p.action === 'REPLACE' && cur.cmd5 === p.newMd5) {
      await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_ALREADY_APPLIED' };
    }
    if (cur.cmd5 !== p.oldMd5) { await c.query('ROLLBACK'); return { ...base, outcome: 'SKIP_CONTENT_DRIFTED' }; }

    const dep = await c.query(
      `UPDATE shared_product_descriptions SET status=$2, updated_at=now()
        WHERE id=$1 AND status='canonical'`, [p.oldDescId, RETIRED_STATUS]);
    if (dep.rowCount !== 1) throw new Error(`강등 rowCount=${dep.rowCount}`);

    let newId: string | null = null;
    if (p.action === 'REPLACE') {
      if (!p.newHtml || !p.newMd5 || md5(p.newHtml) !== p.newMd5) throw new Error('재조립본 md5 불일치');
      newId = (await c.query(
        `INSERT INTO shared_product_descriptions
           (master_id, content, summary, source_type, source_ref_id, status, language,
            description_type, curated_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'canonical','ko','STORE',now(),now(),now())
         RETURNING id::text`,
        [p.masterId, p.newHtml, p.newSummary, NEW_SOURCE_TYPE, cur.ref])).rows[0].id;
    }

    await c.query(
      `INSERT INTO shared_product_description_audit_logs
         (event_type, description_type, master_id, language,
          previous_description_id, new_description_id, previous_status, new_status,
          performed_at, created_at, metadata)
       VALUES ($5,'STORE',$1,'ko',$2,$3,'canonical',$6, now(), now(), $4::jsonb)`,
      [p.masterId, p.oldDescId, newId,
        JSON.stringify({
          wo: WO, phase: 'oral-prohibition-corpus-rebuild', priorCommit: PRIOR_COMMIT,
          reason: p.action === 'REPLACE'
            ? '경구 금지 문장이 경로 동사 재표현으로 파손된 KO canonical 을 제품 자기 e약은요 원문으로 전면 재조립'
            : '경구 금지 문장 파손 확인 · 경로 확정 불가로 재조립 불가 — 비노출(WO 원칙 6)',
          detectedBy: p.detectedBy, holdCode: p.postHoldCode ?? p.holdCode,
          previousMd5: p.oldMd5, newMd5: p.newMd5, route: p.route, routeSource: p.routeSource,
          permitCode: p.itemSeq,
        }),
        p.action === 'REPLACE' ? 'canonical_replaced' : 'canonical_withdrawn',
        p.action === 'REPLACE' ? 'canonical' : RETIRED_STATUS]);

    const v = (await c.query(
      `SELECT count(*) FILTER (WHERE status='canonical')::int ko_canon,
              count(*) FILTER (WHERE status='canonical' AND md5(content)=$2)::int ko_new
         FROM shared_product_descriptions
        WHERE master_id=$1 AND deleted_at IS NULL AND description_type='STORE'
          AND COALESCE(language,'ko')='ko'`, [p.masterId, p.newMd5 ?? ''])).rows[0];
    if (p.action === 'REPLACE') {
      if (v.ko_canon !== 1 || v.ko_new !== 1) throw new Error(`post-verify ko canonical ${v.ko_canon}/${v.ko_new}`);
    } else if (v.ko_canon !== 0) {
      throw new Error(`post-verify 비노출 실패 — ko canonical ${v.ko_canon}`);
    }

    if (LIVE) await c.query('COMMIT'); else await c.query('ROLLBACK');
    return { ...base, outcome: p.action === 'REPLACE' ? 'REPLACED' : 'WITHDRAWN', newDescId: newId };
  } catch (e: any) {
    try { await c.query('ROLLBACK'); } catch { /* noop */ }
    return { ...base, outcome: 'FAILED', error: String(e?.message ?? e) };
  } finally {
    c.release();
  }
}

async function main(): Promise<void> {
  if (APPLY && !ENV_GATE) {
    process.stderr.write('STOP: --apply 는 EASY_DRUG_KO_ORAL_PROHIBITION_REBUILD_APPLY_CONFIRM=YES 와 함께여야 한다.\n');
    process.exitCode = 2; return;
  }
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const rows: RebuildPlanRow[] = plan.rows;
  const work = rows.filter((r) => r.action === 'REPLACE' || (r.action === 'HOLD' && WITHDRAW));

  const db = await connect();
  try {
    const results: Outcome[] = [];
    for (const p of work) results.push(await processOne(db, p));

    const byOutcome: Record<string, number> = {};
    for (const r of results) byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;
    const failed = results.filter((r) => r.outcome === 'FAILED');

    const summary = {
      wo: WO, phase: 'apply-rebuild',
      mode: LIVE ? 'LIVE APPLY' : 'DRY-RUN (전건 ROLLBACK)',
      withdrawHolds: WITHDRAW,
      planned: { total: rows.length, replace: rows.filter((r) => r.action === 'REPLACE').length,
        hold: rows.filter((r) => r.action === 'HOLD').length },
      attempted: work.length,
      byOutcome,
      failedSample: failed.slice(0, 10),
    };
    fs.mkdirSync(RESULTS, { recursive: true });
    fs.writeFileSync(path.join(RESULTS, `apply-${LIVE ? 'live' : 'dry-run'}.json`),
      JSON.stringify({ ...summary, results }, null, 2) + '\n', 'utf8');
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    if (failed.length) process.exitCode = 2;
  } finally {
    await db.destroy();
  }
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
