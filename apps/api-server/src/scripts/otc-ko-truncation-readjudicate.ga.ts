/**
 * WO-O4O-OTC-KO-TRUNCATION-FALSE-POSITIVE-FIX-RECURRENCE-GUARD-AND-RELEASE-V1
 *   — **전수 재판정 (READ-ONLY)**
 *
 * 같은 입력(KO canonical 5,000 문서)에 구 판정기와 신 판정기를 각각 돌려
 *   해제 / 계속 차단 / 신규 차단 / reason code 변화 / 영향 문서 수를 산출한다.
 *
 * DB 는 변경하지 않는다(`SET default_transaction_read_only = on`).
 *   KO·EN·zh·ja canonical, ProductMaster, zh 대응표·HOLD 원장 일절 무변경.
 *
 * 신 판정기의 책임 경계는 otc-ko-truncation-policy.ga.ts 헤더 참조 —
 *   "이 유닛을 번역해도 되는가" 이지 "이 문서 KO 가 완결됐는가" 가 아니다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, uid, legacyIsTruncatedKo as isTruncatedKo } from './otc-zh-slots.ga.js';
import { judgeDoc, roleOf, type ReasonCode, type Verdict } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

type UnitAgg = {
  id: string; kind: string; role: string; len: number; docs: Set<string>; masters: Set<string>;
  oldBlocked: boolean; newBlocked: boolean; reason: ReasonCode;
  deriveKind?: string; groupWithNext?: boolean; koTail: string; sampleDoc: string;
};

async function main(): Promise<void> {
  assertSpec();   // 회귀시험이 깨지면 재판정 자체를 진행하지 않는다.

  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const audit = JSON.parse(fs.readFileSync(P('otc-ko-truncated-unit-audit.ga.json'), 'utf8'));
  const prevCause = new Map<string, string>(audit.units.map((u: any) => [u.id, u.cause]));
  const prevRestore = new Map<string, string>(audit.units.map((u: any) => [u.id, u.restore]));
  const zhMap = JSON.parse(fs.readFileSync(P('otc-zh-unit-map.ga.json'), 'utf8'));
  const zhDone = new Set(Object.keys(zhMap.zh || {}));
  const zhHold = new Set(Object.keys(zhMap.hold || {}));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5680', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const ids = man.map((m) => m.koId);
  const rows = new Map<string, { content: string; master: string }>();
  for (let i = 0; i < ids.length; i += 500) {
    const r = await pool.query(
      `SELECT id, master_id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
      [ids.slice(i, i + 500)]);
    for (const x of r.rows) rows.set(x.id, { content: x.content || '', master: x.master_id });
  }
  await pool.end();

  /* ── 전수 재판정 ───────────────────────────────────────────────────────── */
  const units = new Map<string, UnitAgg>();
  let scannedDocs = 0, scannedSlots = 0;
  for (const m of man) {
    const row = rows.get(m.koId);
    if (!row || !row.content) continue;
    scannedDocs++;
    const sl = slots(row.content);
    const vs: Verdict[] = judgeDoc(row.content, sl);
    for (let i = 0; i < sl.length; i++) {
      scannedSlots++;
      const s = sl[i], v = vs[i];
      const oldB = isTruncatedKo(s.kind, s.text);
      if (!oldB && !v.blocked) continue;                    // 양쪽 모두 통과 — 관심 대상 아님
      const id = uid(s.kind, s.text);
      let u = units.get(id);
      if (!u) {
        u = { id, kind: s.kind, role: roleOf(s.kind), len: s.text.length, docs: new Set(), masters: new Set(),
          oldBlocked: oldB, newBlocked: v.blocked, reason: v.reason, koTail: s.text.slice(-38),
          sampleDoc: m.koId, deriveKind: v.deriveFrom?.kind, groupWithNext: v.groupWithNextIndex != null };
        units.set(id, u);
      }
      /* 같은 유닛이라도 문서 문맥에 따라 파생 근거가 없을 수 있다 → 보수적으로 차단 쪽을 채택 */
      if (v.blocked) { u.newBlocked = true; u.reason = v.reason; u.deriveKind = undefined; }
      u.docs.add(m.koId); u.masters.add(row.master);
    }
  }

  /* ── 집계 ──────────────────────────────────────────────────────────────── */
  const released: UnitAgg[] = [], stillBlocked: UnitAgg[] = [], newlyBlocked: UnitAgg[] = [];
  for (const u of units.values()) {
    if (u.oldBlocked && !u.newBlocked) released.push(u);
    else if (u.oldBlocked && u.newBlocked) stillBlocked.push(u);
    else if (!u.oldBlocked && u.newBlocked) newlyBlocked.push(u);
  }
  const docsOf = (a: UnitAgg[]): number => new Set(a.flatMap((u) => [...u.docs])).size;
  const mastersOf = (a: UnitAgg[]): number => new Set(a.flatMap((u) => [...u.masters])).size;

  const reasonAll: Record<string, number> = {}, reasonReleased: Record<string, number> = {},
    reasonBlocked: Record<string, number> = {}, causeToNew: Record<string, number> = {};
  for (const u of units.values()) inc(reasonAll, u.reason);
  for (const u of released) { inc(reasonReleased, u.reason); inc(causeToNew, `${prevCause.get(u.id) || 'NEW'} → 해제/${u.reason}`); }
  for (const u of stillBlocked) { inc(reasonBlocked, u.reason); inc(causeToNew, `${prevCause.get(u.id) || 'NEW'} → 차단/${u.reason}`); }

  /* 구 원장 732 유닛의 전수 대조 — 하나도 빠뜨리지 않는다 */
  const oldSet = new Set<string>(audit.units.map((u: any) => u.id));
  const reproduced = [...units.values()].filter((u) => u.oldBlocked).map((u) => u.id);
  const missingFromRerun = [...oldSet].filter((id) => !reproduced.includes(id));

  /* ── R1 190 재분류: SUMMARY(표시용 파생) vs ACTUAL(본문 실절단) ─────────── */
  const r1 = JSON.parse(fs.readFileSync(P('otc-ko-truncated-r1-restore-candidates.ga.json'), 'utf8')).candidates as any[];
  const r1Summary: any[] = [], r1Actual: any[] = [];
  for (const c of r1) {
    const u = units.get(c.id);
    const isDisplay = roleOf(String(c.id).split(':')[0]) === 'display';
    const rec = { id: c.id, kind: c.kind, docs: c.docs, masters: c.masters, before: c.before,
      reason: u ? u.reason : 'NOT_APPLICABLE', blockedNow: u ? u.newBlocked : false,
      deriveFromKind: u?.deriveKind ?? null, fullSourceKind: c.evidence?.sameDocFullKind ?? null,
      note: '' as string };
    if (isDisplay && rec.reason === 'DISPLAY_SUMMARY_ELLIPSIS') {
      rec.note = 'KO 무변경. 카드 길이·역할 유지. 같은 문서 완결본에서 번역만 파생한다.';
      r1Summary.push(rec);
    } else {
      rec.note = '표시용 요약이 아니거나 파생 근거가 없다. 자동 복원하지 않고 HOLD 를 유지한다.';
      r1Actual.push(rec);
    }
  }

  /* ── zh 후속 생산에서 추가로 풀리는 모집단 ─────────────────────────────── */
  const zhNewlyAvailable = released.filter((u) => !zhDone.has(u.id) && !zhHold.has(u.id));
  const zhDerived = released.filter((u) => u.reason === 'DISPLAY_SUMMARY_ELLIPSIS');
  const zhGroups = released.filter((u) => u.reason === 'STRUCTURAL_SPLIT');

  /* 문서 회계: 해제 유닛과 차단 유닛이 같은 문서에 공존할 수 있으므로 단순 합이 아니다.
     실제 "차단 해제된 문서" = 이전에 차단 유닛이 있었는데 지금은 하나도 없는 문서. */
  const docsBefore = new Set([...units.values()].filter((u) => u.oldBlocked).flatMap((u) => [...u.docs]));
  const docsAfter = new Set([...stillBlocked, ...newlyBlocked].flatMap((u) => [...u.docs]));
  const fullyUnblockedDocs = [...docsBefore].filter((d) => !docsAfter.has(d));

  const summary = {
    mode: 'READ-ONLY / DB write 0',
    scannedDocs, scannedSlots,
    docAccounting: { blockedDocsBefore: docsBefore.size, blockedDocsAfter: docsAfter.size,
      fullyUnblockedDocs: fullyUnblockedDocs.length },
    old: { blockedUnits: [...units.values()].filter((u) => u.oldBlocked).length,
      blockedDocs: docsOf([...units.values()].filter((u) => u.oldBlocked)) },
    now: { blockedUnits: stillBlocked.length + newlyBlocked.length,
      blockedDocs: docsOf([...stillBlocked, ...newlyBlocked]) },
    released: { units: released.length, docs: docsOf(released), masters: mastersOf(released) },
    stillBlocked: { units: stillBlocked.length, docs: docsOf(stillBlocked), masters: mastersOf(stillBlocked) },
    newlyBlocked: { units: newlyBlocked.length, docs: docsOf(newlyBlocked),
      ids: newlyBlocked.slice(0, 40).map((u) => ({ id: u.id, reason: u.reason, tail: u.koTail })) },
    reproduction: { oldLedgerUnits: oldSet.size, reproducedNow: reproduced.length, missingFromRerun },
    reasonAll, reasonReleased, reasonBlocked, causeTransition: causeToNew,
    prevCauseOfReleased: released.reduce((a: Record<string, number>, u) => { inc(a, prevCause.get(u.id) || 'NEW'); return a; }, {}),
    prevCauseOfStillBlocked: stillBlocked.reduce((a: Record<string, number>, u) => { inc(a, prevCause.get(u.id) || 'NEW'); return a; }, {}),
    prevRestoreOfStillBlocked: stillBlocked.reduce((a: Record<string, number>, u) => { inc(a, prevRestore.get(u.id) || 'NEW'); return a; }, {}),
    r1: { total: r1.length, summary: r1Summary.length, actual: r1Actual.length,
      summaryDocs: new Set(r1Summary.flatMap((x) => (units.get(x.id) ? [...units.get(x.id)!.docs] : []))).size },
    zh: { newlyAvailableUnits: zhNewlyAvailable.length, newlyAvailableDocs: docsOf(zhNewlyAvailable),
      derivedCardUnits: zhDerived.length, structuralGroupUnits: zhGroups.length },
  };

  const detail = [...units.values()].map((u) => ({
    id: u.id, kind: u.kind, role: u.role, len: u.len, docs: u.docs.size, masters: u.masters.size,
    oldBlocked: u.oldBlocked, newBlocked: u.newBlocked, reason: u.reason,
    prevCause: prevCause.get(u.id) || null, prevRestore: prevRestore.get(u.id) || null,
    deriveFromKind: u.deriveKind ?? null, groupWithNext: !!u.groupWithNext, koTail: u.koTail,
    verdict: u.oldBlocked && !u.newBlocked ? 'RELEASED' : u.newBlocked && !u.oldBlocked ? 'NEWLY_BLOCKED' : u.newBlocked ? 'STILL_BLOCKED' : 'OK',
  })).sort((a, b) => b.docs - a.docs);

  fs.writeFileSync(P('otc-ko-truncation-readjudication.ga.json'), JSON.stringify({ summary, units: detail }, null, 2), 'utf8');
  fs.writeFileSync(P('otc-ko-truncation-r1-reclassification.ga.json'),
    JSON.stringify({ note: 'R1 190 재분류 — SUMMARY 는 KO 무변경·카드 파생 번역, ACTUAL 은 HOLD 유지',
      total: r1.length, summaryCount: r1Summary.length, actualCount: r1Actual.length,
      summary: r1Summary, actual: r1Actual }, null, 2), 'utf8');
  fs.writeFileSync(P('otc-zh-release-population.ga.json'),
    JSON.stringify({ note: 'zh 후속 생산에서 새 판정기로 추가 확보되는 유닛 모집단 (번역·apply 미수행)',
      units: zhNewlyAvailable.length, docs: docsOf(zhNewlyAvailable),
      derivedCards: zhDerived.length, structuralGroups: zhGroups.length,
      list: zhNewlyAvailable.map((u) => ({ id: u.id, kind: u.kind, docs: u.docs.size, reason: u.reason,
        deriveFromKind: u.deriveKind ?? null, koTail: u.koTail })).sort((a, b) => b.docs - a.docs) }, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
