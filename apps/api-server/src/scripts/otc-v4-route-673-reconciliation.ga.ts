/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-673-CURRENT-REMAINDER-RECONCILIATION-V1
 *
 * commit 45b2f1add 의 route 673 판정 원장을 **현행 LIVE DB 와 대조**하여 실제 미생산 재투입 대상만 확정한다.
 *  - 재판정 금지: classification / resolvedRoute 는 기존 원장 값을 그대로 사용한다(파생·재계산 없음).
 *  - 기존 673 판정 원장·hold 원장·reentry 원장은 수정하지 않는다(read-only 입력).
 *  - DB write 0. SELECT 만 수행한다.
 *
 * 실행: tsx src/scripts/otc-v4-route-673-reconciliation.ga.ts --port=5495
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const arg = (k: string, d: string) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const PORT = Number(arg('port', '5495'));
const WO = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-673-CURRENT-REMAINDER-RECONCILIATION-V1';
const BASE_COMMIT = '45b2f1add';
const AUTHORED = ['mfds_drug_otc'];

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const wr = (f: string, o: any) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2));
const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const count = <T>(xs: T[], k: (x: T) => string) => xs.reduce((a: Record<string, number>, x) => { const v = k(x); a[v] = (a[v] || 0) + 1; return a; }, {});

async function main() {
  // ── 입력(기존 원장 · 무수정) ───────────────────────────────────────────────
  const led = rd('otc-v4-route-673-resolution-ledger.na.json');
  const rows: any[] = led.rows;
  const reentry: any[] = rd('otc-v4-route-673-agent-ga-reentry.na.json').masters;
  const hold: any[] = rd('otc-v4-route-673-hold-ledger.na.json').rows;
  const excludeIds = new Set<string>(rd('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((r: any) => r.mid));
  const naQueue = rd('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters;
  const sourceTerminalIds = new Set<string>(naQueue.filter((r: any) => r.code === 'SOURCE_EFFICACY_MISSING').map((r: any) => r.mid));

  // 기존 GREEN 원장 합집합 (pilot100 / pilot500 / next2000 / finalall + run 스냅샷)
  const greenIds = new Set<string>();
  for (const f of fs.readdirSync(DATA).filter((f) => /^otc-v4-.*green-ledger.*\.json$/.test(f)))
    for (const r of rd(f).rows || []) greenIds.add(r.masterId);

  const ids = rows.map((r) => r.masterId);

  const pool = new Pool({ host: '127.0.0.1', port: PORT, user: 'o4o_api', database: 'o4o_platform' });
  const q = async (sql: string, p: any[] = []) => (await pool.query(sql, p)).rows;

  // ── 현행 LIVE 상태 (673 master) ───────────────────────────────────────────
  const live = await q(
    `SELECT s.master_id::text mid,
            count(*) FILTER (WHERE s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($2))::int authored_ko,
            count(*) FILTER (WHERE s.status='canonical' AND s.language='en' AND s.source_type = ANY($2))::int authored_en,
            count(*) FILTER (WHERE s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug')::int easy_ko,
            count(*) FILTER (WHERE s.status IN ('canonical','needs_review') AND s.source_type = ANY($2))::int authored_any,
            max(s.updated_at) upd
     FROM shared_product_descriptions s
     WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL
     GROUP BY 1`, [ids, AUTHORED]);
  const byId: Record<string, any> = Object.fromEntries(live.map((r) => [r.mid, r]));

  // 공식 원문(효능) 존재 여부 — source terminal 판별용
  const src = await q(
    `SELECT s.master_id::text mid,
            bool_or(s.content LIKE '%<strong>효능·효과</strong>%')::bool has_efficacy
     FROM shared_product_descriptions s
     WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL
     GROUP BY 1`, [ids]);
  const srcById: Record<string, any> = Object.fromEntries(src.map((r) => [r.mid, r]));

  // ── 제품별 reconciliation (재판정 없음) ────────────────────────────────────
  const out = rows.map((r) => {
    const st = byId[r.masterId] || { authored_ko: 0, authored_en: 0, easy_ko: 0, authored_any: 0, upd: null };
    const complete = st.authored_ko === 1 && st.authored_en === 1;
    const partial = !complete && st.authored_any > 0;
    let state: string;
    if (complete) state = 'SKIP_COMPLETE';
    else if (partial) state = 'PARTIAL_REVIEW_REQUIRED';
    else if (r.classification === 'RECOVERABLE_ROUTE_CONFIRMED') state = 'PENDING_RECOVERABLE';
    else state = `PENDING_${r.classification}`;
    return {
      masterId: r.masterId,
      productName: r.productName,
      classification: r.classification,           // 기존 판정 그대로
      resolvedRoute: r.resolvedRoute,             // 기존 판정 그대로
      composerSupported: r.composerSupported,
      mappableToExistingProfile: r.mappableToExistingProfile,
      originExceptionCode: r.originExceptionCode,
      plannedSourceRef: r.plannedSourceRef,
      liveState: { authoredKoCanonical: st.authored_ko, authoredEnCanonical: st.authored_en, easyKoCanonical: st.easy_ko, authoredAny: st.authored_any },
      officialEfficacyPresent: srcById[r.masterId]?.has_efficacy ?? false,
      state,
      contamination: {
        excludeLedgerHit: excludeIds.has(r.masterId),
        sourceTerminalHit: sourceTerminalIds.has(r.masterId),
        existingGreenHit: greenIds.has(r.masterId),
      },
    };
  });

  const recoverable = out.filter((r) => r.classification === 'RECOVERABLE_ROUTE_CONFIRMED');
  const recDone = recoverable.filter((r) => r.state === 'SKIP_COMPLETE');
  const recPending = recoverable.filter((r) => r.state === 'PENDING_RECOVERABLE');
  const recPartial = recoverable.filter((r) => r.state === 'PARTIAL_REVIEW_REQUIRED');
  const nonRec = out.filter((r) => r.classification !== 'RECOVERABLE_ROUTE_CONFIRMED');

  const summary = {
    wo: WO, agent: 'ga', mode: 'READ_ONLY_RECONCILIATION', baseCommit: BASE_COMMIT, liveDbWrite: 0,
    input: { total: out.length, ledgerRows: rows.length, reentry: reentry.length, hold: hold.length },
    byClassification: count(out, (r) => r.classification),
    byState: count(out, (r) => r.state),
    recoverable: {
      total: recoverable.length,
      alreadyProduced: recDone.length,
      pending: recPending.length,
      partial: recPartial.length,
      pendingByRoute: count(recPending, (r) => r.resolvedRoute || 'null'),
      producedByRoute: count(recDone, (r) => r.resolvedRoute || 'null'),
    },
    nonRecoverable: {
      total: nonRec.length,
      byClassification: count(nonRec, (r) => r.classification),
      alreadyProduced: nonRec.filter((r) => r.state === 'SKIP_COMPLETE').length,
      requiresRouteProfileByRoute: count(nonRec.filter((r) => r.classification === 'REQUIRES_ROUTE_PROFILE'), (r) => r.resolvedRoute || 'null'),
      trueMultiRoute: nonRec.filter((r) => r.classification === 'TRUE_MULTI_ROUTE').length,
      holdUnresolved: nonRec.filter((r) => r.classification === 'HOLD_UNRESOLVED').length,
      routeSourceConflict: nonRec.filter((r) => r.classification === 'ROUTE_SOURCE_CONFLICT').length,
    },
    contamination: {
      excludeLedgerSize: excludeIds.size,
      sourceTerminalSize: sourceTerminalIds.size,
      existingGreenSize: greenIds.size,
      reentryQueueXExclude: recPending.filter((r) => r.contamination.excludeLedgerHit).length,
      reentryQueueXSourceTerminal: recPending.filter((r) => r.contamination.sourceTerminalHit).length,
      reentryQueueXExistingGreen: recPending.filter((r) => r.contamination.existingGreenHit).length,
      ledger673XExclude: out.filter((r) => r.contamination.excludeLedgerHit).length,
      ledger673XSourceTerminal: out.filter((r) => r.contamination.sourceTerminalHit).length,
      ledger673XExistingGreen: out.filter((r) => r.contamination.existingGreenHit).length,
    },
  };

  // ── 가 에이전트 최종 재투입 원장 (실제 미생산 RECOVERABLE 만) ──────────────
  const reentryOut = {
    wo: WO, producer: 'agent-ga(reconciliation)', consumer: 'agent-ga(production)', baseCommit: BASE_COMMIT,
    kind: 'final-reentry-queue', liveDbWrite: 0,
    contract: {
      note: '기존 673 판정(45b2f1add)의 classification·resolvedRoute 를 그대로 승계한다. 재판정 없음.',
      sourceRefNamespace: 'otc-v4-master-leaflet:<masterId>',
      writeContract: 'KO 4T + EN 2T = 6T / master',
      producibleRoutes: ['topical', 'oromucosal'],
    },
    total: recPending.length,
    byRoute: count(recPending, (r) => r.resolvedRoute || 'null'),
    masters: recPending.map((r) => ({
      masterId: r.masterId, productName: r.productName, resolvedRoute: r.resolvedRoute,
      originExceptionCode: r.originExceptionCode, plannedSourceRef: r.plannedSourceRef,
      officialEfficacyPresent: r.officialEfficacyPresent,
    })),
  };

  const carryOut = {
    wo: WO, producer: 'agent-ga(reconciliation)', kind: 'carry-over-ledger', liveDbWrite: 0,
    total: nonRec.length + recPartial.length,
    byClassification: count([...nonRec, ...recPartial], (r) => r.classification),
    rows: [...nonRec, ...recPartial].map((r) => ({
      masterId: r.masterId, productName: r.productName, classification: r.classification,
      resolvedRoute: r.resolvedRoute, composerSupported: r.composerSupported,
      mappableToExistingProfile: r.mappableToExistingProfile, state: r.state, liveState: r.liveState,
    })),
  };

  const ledgerOut = { wo: WO, kind: 'route-673-current-remainder-reconciliation', baseCommit: BASE_COMMIT, summary, rows: out };
  wr('otc-v4-route-673-reconciliation-ledger.ga.json', ledgerOut);
  wr('otc-v4-route-673-final-reentry-queue.ga.json', reentryOut);
  wr('otc-v4-route-673-carryover-ledger.ga.json', carryOut);

  console.log(JSON.stringify(summary, null, 2));
  console.log('\nbyte-identity fingerprint:');
  for (const f of ['otc-v4-route-673-reconciliation-ledger.ga.json', 'otc-v4-route-673-final-reentry-queue.ga.json', 'otc-v4-route-673-carryover-ledger.ga.json'])
    console.log('  ', f, md5(fs.readFileSync(path.join(DATA, f), 'utf8')));
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
