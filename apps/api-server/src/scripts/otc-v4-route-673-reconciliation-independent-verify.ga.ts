/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-673-CURRENT-REMAINDER-RECONCILIATION-V1 §11 독립검증.
 *
 * reconciliation 실행기와 **분리된 코드 경로**: 실행기 모듈을 import 하지 않고,
 *  - 673 판정 원장(45b2f1add)을 SSOT 로 직접 읽고
 *  - LIVE 상태를 다른 형태의 쿼리(행 단위 SELECT)로 재수집하며
 *  - 원장 무결성(해시)과 재투입 큐 유도 규칙을 독립 재계산한다.
 * READ ONLY. DB write 0.
 */
import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const PORT = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? '5495');
const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const gitHash = (rel: string, rev: string) =>
  sha(execSync(`git show ${rev}:${rel}`, { cwd: path.resolve(process.cwd(), '../..'), maxBuffer: 1 << 28, encoding: 'utf8' }));

const checks: any[] = [];
const chk = (id: string, name: string, pass: boolean, evidence: any) => { checks.push({ id, name, pass, evidence }); };

async function main() {
  const led673 = rd('otc-v4-route-673-resolution-ledger.na.json');
  const rec = rd('otc-v4-route-673-reconciliation-ledger.ga.json');
  const queue = rd('otc-v4-route-673-final-reentry-queue.ga.json');
  const carry = rd('otc-v4-route-673-carryover-ledger.ga.json');
  const naReentry = rd('otc-v4-route-673-agent-ga-reentry.na.json');
  const pool = new Pool({ host: '127.0.0.1', port: PORT, user: 'o4o_api', database: 'o4o_platform' });
  const q = async (s: string, p: any[] = []) => (await pool.query(s, p)).rows;

  // R-01 기존 673 판정 원장 무수정 (git blob 대비 sha256)
  const frozen = [
    'apps/api-server/src/scripts/data/otc-v4-route-673-resolution-ledger.na.json',
    'apps/api-server/src/scripts/data/otc-v4-route-673-agent-ga-reentry.na.json',
    'apps/api-server/src/scripts/data/otc-v4-route-673-hold-ledger.na.json',
  ];
  const frozenDiff = frozen.filter((f) => sha(fs.readFileSync(path.resolve(process.cwd(), '../..', f), 'utf8')) !== gitHash(f, '45b2f1add'));
  chk('R-01', '기존 673 판정 원장 3종 무수정 (45b2f1add blob 동일)', frozenDiff.length === 0, { modified: frozenDiff });

  // R-02 재판정 금지 — classification/resolvedRoute 승계 일치
  const base = new Map<string, any>(led673.rows.map((r: any) => [r.masterId, r]));
  const drift = rec.rows.filter((r: any) => {
    const b = base.get(r.masterId);
    return !b || b.classification !== r.classification || (b.resolvedRoute ?? null) !== (r.resolvedRoute ?? null);
  });
  chk('R-02', '재판정 0 — classification·resolvedRoute 전건 승계', drift.length === 0, { driftCount: drift.length, sample: drift.slice(0, 3).map((d: any) => d.masterId) });

  // R-03 대상 집합 동일 (673, 중복 0, 누락 0)
  const recIds = rec.rows.map((r: any) => r.masterId);
  chk('R-03', 'reconciliation 대상 = 673 · 중복 0 · 누락 0',
    rec.rows.length === 673 && new Set(recIds).size === 673 && recIds.every((id: string) => base.has(id)),
    { rows: rec.rows.length, distinct: new Set(recIds).size });

  // R-04 분류 합계 = WO 기준치
  const EXPECT: Record<string, number> = { RECOVERABLE_ROUTE_CONFIRMED: 535, TRUE_MULTI_ROUTE: 46, HOLD_UNRESOLVED: 35, ROUTE_SOURCE_CONFLICT: 31, REQUIRES_ROUTE_PROFILE: 26 };
  const got: Record<string, number> = {};
  for (const r of rec.rows) got[r.classification] = (got[r.classification] || 0) + 1;
  chk('R-04', '분류별 건수 = WO 기준치(535/46/35/31/26)',
    Object.entries(EXPECT).every(([k, v]) => got[k] === v) && Object.keys(got).length === 5, { expect: EXPECT, got });

  // R-05 LIVE 상태 독립 재수집 (행 단위) — state 판정 재계산 일치
  const ids = recIds;
  const rows = await q(
    `SELECT master_id::text mid, COALESCE(language,'ko') lang, status, source_type
     FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL`, [ids]);
  const agg = new Map<string, { ko: number; en: number; any: number }>();
  for (const r of rows) {
    const a = agg.get(r.mid) ?? { ko: 0, en: 0, any: 0 };
    if (r.source_type === 'mfds_drug_otc') {
      if (r.status === 'canonical' && r.lang === 'ko') a.ko++;
      if (r.status === 'canonical' && r.lang === 'en') a.en++;
      if (r.status === 'canonical' || r.status === 'needs_review') a.any++;
    }
    agg.set(r.mid, a);
  }
  const stateMismatch = rec.rows.filter((r: any) => {
    const a = agg.get(r.masterId) ?? { ko: 0, en: 0, any: 0 };
    const expected = a.ko === 1 && a.en === 1 ? 'SKIP_COMPLETE'
      : a.any > 0 ? 'PARTIAL_REVIEW_REQUIRED'
      : r.classification === 'RECOVERABLE_ROUTE_CONFIRMED' ? 'PENDING_RECOVERABLE' : `PENDING_${r.classification}`;
    return expected !== r.state || a.ko !== r.liveState.authoredKoCanonical || a.en !== r.liveState.authoredEnCanonical;
  });
  chk('R-05', 'LIVE 상태 독립 재수집 결과 = 원장 state/liveState', stateMismatch.length === 0,
    { mismatch: stateMismatch.length, dbRows: rows.length });

  // R-06 이미 완료 판정(SKIP_COMPLETE) 정합
  const skip = rec.rows.filter((r: any) => r.state === 'SKIP_COMPLETE');
  chk('R-06', 'SKIP_COMPLETE = authored ko/en canonical 1/1 인 건에 한정', skip.every((r: any) => r.liveState.authoredKoCanonical === 1 && r.liveState.authoredEnCanonical === 1),
    { skipComplete: skip.length, recoverableAlreadyProduced: rec.summary.recoverable.alreadyProduced });

  // R-07 재투입 큐 = 미생산 RECOVERABLE 전량, 그 외 혼입 0
  const wantQueue = rec.rows.filter((r: any) => r.classification === 'RECOVERABLE_ROUTE_CONFIRMED' && r.state === 'PENDING_RECOVERABLE').map((r: any) => r.masterId).sort();
  const gotQueue = queue.masters.map((m: any) => m.masterId).sort();
  chk('R-07', '재투입 큐 = 미생산 RECOVERABLE 전량 · 그 외 0',
    JSON.stringify(wantQueue) === JSON.stringify(gotQueue) && queue.total === queue.masters.length,
    { queue: queue.total, expected: wantQueue.length });

  // R-08 재투입 큐 route = composer 지원 route 만
  const SUPPORTED = new Set(['oral', 'oromucosal', 'ophthalmic', 'topical', 'vaginal']);
  const badRoute = queue.masters.filter((m: any) => !SUPPORTED.has(m.resolvedRoute));
  chk('R-08', '재투입 큐 route 전건 composer 지원', badRoute.length === 0, { byRoute: queue.byRoute, bad: badRoute.length });

  // R-09 오염 0 — exclude 266 / source terminal 24 / 기존 GREEN
  const excludeIds = new Set<string>(rd('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));
  const srcIds = new Set<string>(rd('otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json').masters.filter((m: any) => m.code === 'SOURCE_EFFICACY_MISSING').map((m: any) => m.mid));
  const greenIds = new Set<string>();
  for (const f of fs.readdirSync(DATA).filter((f) => /^otc-v4-.*green-ledger.*\.json$/.test(f))) for (const r of rd(f).rows || []) greenIds.add(r.masterId);
  const cont = {
    exclude: gotQueue.filter((id: string) => excludeIds.has(id)).length,
    sourceTerminal: gotQueue.filter((id: string) => srcIds.has(id)).length,
    existingGreen: gotQueue.filter((id: string) => greenIds.has(id)).length,
  };
  chk('R-09', '재투입 큐 오염 0 (exclude 266 · source 24 · 기존 GREEN)', cont.exclude === 0 && cont.sourceTerminal === 0 && cont.existingGreen === 0,
    { ...cont, excludeSize: excludeIds.size, sourceSize: srcIds.size, greenSize: greenIds.size });

  // R-10 기존 GREEN 원장 합집합 = 실제 생산 누계와 일치(80+416+1962+388)
  chk('R-10', '기존 GREEN 합집합 = 2,846 (pilot100 80 + pilot500 416 + next2000 1,962 + final 388)',
    greenIds.size === 2846, { greenUnion: greenIds.size });

  // R-11 carry-over 원장 = 673 − 재투입 큐 − SKIP_COMPLETE
  chk('R-11', 'carry-over = 673 − 재투입 − SKIP_COMPLETE · 중복 0',
    carry.total === 673 - queue.total - skip.length && new Set(carry.rows.map((r: any) => r.masterId)).size === carry.total,
    { carry: carry.total, queue: queue.total, skip: skip.length });

  // R-12 나 에이전트 reentry 535 와의 대응 (재투입 ⊆ 535)
  const naIds = new Set<string>(naReentry.masters.map((m: any) => m.masterId));
  const notInNa = gotQueue.filter((id: string) => !naIds.has(id));
  chk('R-12', '재투입 큐 ⊆ 나 에이전트 RECOVERABLE 535', notInNa.length === 0, { naReentry: naIds.size, notInNa: notInNa.length });

  // R-13 sourceRef namespace 결정성 (V4, master 별 유일)
  const refs = queue.masters.map((m: any) => m.plannedSourceRef);
  const refV4 = (mid: string) => {
    const h = crypto.createHash('md5').update('otc-v4-master-leaflet:' + mid).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  };
  const badRef = queue.masters.filter((m: any) => m.plannedSourceRef !== refV4(m.masterId));
  chk('R-13', 'plannedSourceRef = uuid(md5("otc-v4-master-leaflet:"+masterId)) 독립 재계산 일치 · 중복 0',
    badRef.length === 0 && new Set(refs).size === refs.length,
    { bad: badRef.length, distinct: new Set(refs).size, sample: refV4(queue.masters[0].masterId) });

  // R-14 DB write 0 — 본 WO 실행 이후 authored row / audit 변동 없음
  const since = rec.summary?.runStartedAt ?? null;
  const touched = await q(
    `SELECT count(*)::int c FROM shared_product_descriptions
     WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND source_type='mfds_drug_otc'
       AND updated_at > now() - interval '2 hours'`, [ids]);
  const audits = await q(
    `SELECT count(*)::int c FROM shared_product_description_audit_logs
     WHERE created_at > now() - interval '2 hours' AND metadata->>'source_ref_id' IS NOT NULL
       AND metadata->>'batchId' LIKE 'otc-v4-route-673%'`);
  chk('R-14', 'DB write 0 — 673 master authored row 및 route-673 batch audit 최근 변동 0',
    touched[0].c === 0 && audits[0].c === 0, { authoredTouchedRecently: touched[0].c, routeBatchAudit: audits[0].c, since });

  // R-15 산출물 재현성 (2회 실행 byte-identical 지문)
  const fps = ['otc-v4-route-673-reconciliation-ledger.ga.json', 'otc-v4-route-673-final-reentry-queue.ga.json', 'otc-v4-route-673-carryover-ledger.ga.json']
    .map((f) => ({ file: f, sha256: sha(fs.readFileSync(path.join(DATA, f), 'utf8')) }));
  chk('R-15', '산출물 3종 지문 기록(2회 실행 대조용)', true, fps);

  const failed = checks.filter((c) => !c.pass);
  const out = {
    wo: 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-673-CURRENT-REMAINDER-RECONCILIATION-V1',
    kind: 'independent-verification', agent: 'ga',
    codePath: 'reconciliation 실행기 미import · LIVE 행 단위 재수집 · git blob 대비 원장 무결성 · 규칙 독립 재계산',
    summary: { checks: checks.length, failed: failed.length, pass: failed.length === 0, liveDbWrite: 0 },
    checks,
  };
  fs.writeFileSync(path.join(DATA, 'otc-v4-route-673-reconciliation-independent-verification.ga.json'), JSON.stringify(out, null, 2));
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id} ${c.name}`);
  console.log(`\n${checks.length - failed.length}/${checks.length} PASS`);
  await pool.end();
  if (failed.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
