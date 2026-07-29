/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — 누적 예외 원장 병합 → agent-na 단일 인계 원장 (에이전트 가, READ-ONLY · DB 접근 0)
 *
 * 병합 대상: pilot 100 20 + pilot 500 84 + next2000 38 + finalall(정상 잔여 전량) 신규분
 *
 * ⚠️ 각 배치의 예외 원장은 **run 별 불변 파일**을 우선 사용한다.
 *    무접미 파일은 멱등 재실행이 덮어쓸 수 있어 정본이 아니다(pilot 500 에서 실측된 사고).
 *
 * 원인별 그룹 축(WO §9): route / source / composer / numeric·age·duration / identity /
 *                        canonical·sourceRef / professional / 기타
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-exception-consolidate.ga.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './otc-v4-master-leaflet-contract.ga.js';
import { WO_500 } from './otc-v4-pilot-500-contract.ga.js';

const P = (f: string): string => path.join(DATA_DIR, f);
const OUT = P('otc-v4-exception-consolidated-na.ga.json');

/** run 별 불변 파일이 있으면 그중 예외가 가장 많은 run 을 정본으로 쓴다(생산 run = 예외 확정 run). */
function pickLedger(prefix: string, fallbacks: string[]): { file: string; json: any } {
  const dir = fs.readdirSync(DATA_DIR);
  const runs = dir.filter((f) => f.startsWith(prefix) && /\.run-\d{8}T\d{6}\.ga\.json$/.test(f));
  const cands = [...runs, ...fallbacks.filter((f) => fs.existsSync(P(f)))];
  let best: { file: string; json: any } | null = null;
  for (const f of cands) {
    const j = JSON.parse(fs.readFileSync(P(f), 'utf8'));
    const n = (j.rows || []).length;
    if (!best || n > (best.json.rows || []).length) best = { file: f, json: j };
  }
  if (!best) throw new Error(`예외 원장을 찾을 수 없음: ${prefix}`);
  return best;
}

const GROUP: Array<{ group: string; codes: string[] }> = [
  { group: 'route', codes: ['ROUTE_UNRESOLVED', 'ROUTE_CONFLICT'] },
  { group: 'source', codes: ['SOURCE_EFFICACY_MISSING', 'SOURCE_DOSAGE_MISSING'] },
  { group: 'composer', codes: ['COMPOSER_SECTION_UNSUPPORTED'] },
  { group: 'numeric-age-duration', codes: ['NUMERIC_PARSE_FAILED', 'AGE_PARSE_FAILED', 'DURATION_PARSE_FAILED'] },
  { group: 'identity', codes: ['IDENTITY_MISSING', 'IDENTITY_CONFLICT'] },
  { group: 'canonical-sourceref', codes: ['EXISTING_CANONICAL_CONFLICT', 'SOURCE_REF_CONFLICT'] },
  { group: 'professional', codes: ['PROFESSIONAL_USE'] },
  { group: 'translation', codes: ['TRANSLATION_VALIDATION_FAILED'] },
  { group: 'other', codes: ['OTHER_REVIEW_REQUIRED'] },
];
const groupOf = (code: string): string => GROUP.find((g) => g.codes.includes(code))?.group ?? 'other';

function main(): void {
  const sources = [
    { batch: 'otc-v4-pilot-100', ...pickLedger('otc-v4-pilot-100-exception-handoff-na', ['otc-v4-pilot-100-exception-handoff-na.apply-run1.ga.json', 'otc-v4-pilot-100-exception-handoff-na.ga.json']) },
    { batch: 'otc-v4-pilot-500', ...pickLedger('otc-v4-pilot-500-exception-handoff-na', ['otc-v4-pilot-500-exception-handoff-na.apply-run1.ga.json', 'otc-v4-pilot-500-exception-handoff-na.ga.json']) },
    { batch: 'otc-v4-next2000', ...pickLedger('otc-v4-next2000-exception-handoff-na', ['otc-v4-next2000-exception-handoff-na.ga.json']) },
    { batch: 'otc-v4-finalall', ...pickLedger('otc-v4-finalall-exception-handoff-na', ['otc-v4-finalall-exception-handoff-na.ga.json']) },
  ];

  const rows: any[] = [];
  const perBatch: Record<string, { file: string; total: number }> = {};
  const dupes: string[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    const r = (s.json.rows || []) as any[];
    perBatch[s.batch] = { file: s.file, total: r.length };
    for (const e of r) {
      if (seen.has(e.masterId)) { dupes.push(e.masterId); continue; }
      seen.add(e.masterId);
      rows.push({ ...e, batchId: e.batchId || s.batch, group: groupOf(e.exceptionCode) });
    }
  }
  rows.sort((a, b) => (a.group === b.group
    ? (a.exceptionCode === b.exceptionCode ? (a.masterId < b.masterId ? -1 : 1) : (a.exceptionCode < b.exceptionCode ? -1 : 1))
    : (a.group < b.group ? -1 : 1)));

  const byGroup: Record<string, number> = {};
  const byCode: Record<string, number> = {};
  const byBatch: Record<string, number> = {};
  const retryable = { yes: 0, no: 0 };
  for (const r of rows) {
    byGroup[r.group] = (byGroup[r.group] || 0) + 1;
    byCode[r.exceptionCode] = (byCode[r.exceptionCode] || 0) + 1;
    byBatch[r.batchId] = (byBatch[r.batchId] || 0) + 1;
    if (r.retryable) retryable.yes++; else retryable.no++;
  }

  const allWriteZero = rows.every((r) => r.dbWriteActual === 0);
  const missingFields = rows.filter((r) => !r.masterId || !r.exceptionCode || r.dbWriteActual === undefined).length;

  /**
   * 선정 단계 제외분 — **생산에 투입되지 않았으므로 생산 예외 원장에는 없다.**
   * 그러나 agent-na 가 원인별로 정리해야 하는 대상이므로 인계 원장에 함께 싣는다.
   * (17필드 스키마는 생산 예외에만 있으므로 별도 섹션으로 둔다. DB write 는 애초에 0.)
   */
  const selLedger = P('otc-v4-finalall-selection-ledger.ga.json');
  const selectionExcluded: any[] = [];
  const selByReason: Record<string, number> = {};
  if (fs.existsSync(selLedger)) {
    const sj = JSON.parse(fs.readFileSync(selLedger, 'utf8'));
    for (const e of (sj.excludedDetail || []) as Array<{ masterId: string; productName: string; reason: string; detail: string | null }>) {
      if (seen.has(e.masterId)) continue;            // 이미 생산 예외로 잡힌 master 는 중복 제외
      selByReason[e.reason] = (selByReason[e.reason] || 0) + 1;
      selectionExcluded.push({ ...e, group: groupOf(e.reason), stage: 'selection', dbWriteActual: 0 });
    }
  }

  const out = {
    wo: WO_500, producer: 'agent-ga', consumer: 'agent-na',
    kind: 'consolidated-exception-handoff', liveDbWrite: 0,
    schema: 'otc-v4-master-by-master-exception-handoff v1',
    sourceLedgers: perBatch,
    total: rows.length,
    byBatch, byGroup, byCode, retryable,
    selectionExcludedTotal: selectionExcluded.length,
    selectionExcludedByReason: selByReason,
    combinedNaScope: rows.length + selectionExcluded.length,
    combinedNote: '생산 예외(rows) + 선정 제외(selectionExcluded) = agent-na 가 원인별로 정리할 전체 대상.',
    invariantCheck: {
      allFailedWriteZero: allWriteZero,
      duplicateMasterIds: dupes.length,
      missingRequiredFields: missingFields,
      expectedTotal: Object.values(perBatch).reduce((t, v) => t + v.total, 0),
      totalMatches: rows.length === Object.values(perBatch).reduce((t, v) => t + v.total, 0) - dupes.length,
    },
    handoffContract: {
      note: 'agent-na 는 이 원장을 원인별 그룹 단위로 일괄 처리한다. DB write 는 하지 않는다.',
      order: '정상 잔여 전량 생산 → 누적 예외 원인별 정리 → 복구 대상 최종 생산',
      reentry: '복구된 master 는 agent-ga 정본 실행기에 재투입한다. sourceRef 는 masterRefV4 로 동일하게 결정된다.',
    },
    rows,
    selectionExcluded,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ total: out.total, byBatch, byGroup, byCode, retryable, selectionExcludedTotal: out.selectionExcludedTotal, selectionExcludedByReason: out.selectionExcludedByReason, combinedNaScope: out.combinedNaScope, invariantCheck: out.invariantCheck }, null, 2));
}
main();
