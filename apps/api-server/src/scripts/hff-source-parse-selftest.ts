/**
 * READ-ONLY 결정적 self-test — WO-O4O-HFF-SOURCE-PARSER-EXPANSION-C-V2.
 *   npx tsx src/scripts/hff-source-parse-selftest.ts
 * DB 미접촉. 실패 시 exit 1. C 소유(hff-source-parse.ts 전용 fixture/test).
 *
 * 검증 3축:
 *  ①  REG  — 기존 export(parseSpecs) 회귀 0: 하드코딩 baseline 과 원료별 키/값 완전일치(additive 보증).
 *  ②  FIB  — parseFiberSources: 식이섬유 원료별 표시량 보존 · 일반라벨 추정 0 · 교차연결 0 · aggregate 분리.
 *  ③  DET  — 동일 입력 2회 실행 결과 바이트 동일(결정성).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSpecs, parseFiberSources } from './hff-source-parse.js';
import type { FiberParse } from './hff-source-parse.js';

const FX = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'hff-source-parse.fixtures.json'), 'utf8'));
let pass = 0, fail = 0; const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => { if (cond) pass++; else { fail++; fails.push(msg); } };
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

// ── ① parseSpecs 회귀/하드닝 baseline ──
// key => value|unit|basisAmount|basisUnit.
//  STABLE = mg|g 기준량 · X~Y% 비율 (기존 정상 데이터) → **바이트 동일 유지 필수**(드리프트 0 증명).
//  HARDENED = mL 기준량 · `X% 이상` 하한 백분율 (WO-...-LIQUID: SPEC_RE 확장으로 신규 매칭) → 신규 기대값.
const SPECS_STABLE: Record<string, Record<string, string>> = {
  '프락토올리고당-라벨직접(줄바꿈형·타원료동반 공통)': { '칼슘': '230|mg|30|g', '마그네슘': '110|mg|30|g', '아연': '3.4|mg|30|g', '식이섬유': '3700|mg|30|g' },
  '㎎표기(프락토 라벨직접)': { '식이섬유': '3000|mg|4000|mg', '아연': '8.5|mg|4000|mg', '셀레늄': '55|μg|4000|mg' },
};
const SPECS_HARDENED: Record<string, Record<string, string>> = {
  '차전자단독(일반라벨+fn식별, X%이상)': { '식이섬유': '8000|mg|10000|mg' },
  '난소화성단독(ml기준+X%이상, 일반라벨+fn식별)': { '비타민B6': '1.5|mg|100|mL', '식이섬유': '4200|mg|100|mL' },
  '다원료동반(프락토+난소화성 원료별보존, ml기준, 일반라인 공존)': { '식이섬유': '7|g|250|mL', '비타민C': '100|mg|250|mL' },
  '폴리덱스트로스단독(base일반라벨, 원료는 fn에서만)': { '식이섬유': '4.5|g|15|g' },
  '총량+개별(귀리; 총·영양소는 aggregate 분리)': { '식이섬유': '13.4|g|34|g' },
};
for (const f of FX.fiber as Array<{ case: string; base: string }>) {
  const stable = SPECS_STABLE[f.case]; const hardened = SPECS_HARDENED[f.case];
  const expect = stable ?? hardened; if (!expect) continue;
  const sp = parseSpecs(f.base);
  const got: Record<string, string> = {};
  for (const [k, v] of sp.byKey) got[k] = `${v.value}|${v.unit}|${v.basisAmount}|${v.basisUnit}`;
  ok(JSON.stringify(got) === JSON.stringify(expect), `${stable ? 'REG-STABLE 드리프트' : 'REG-HARDENED 불일치'} [${f.case}] expected=${JSON.stringify(expect)} got=${JSON.stringify(got)}`);
}

// ── ①b SPEC_RE 하드닝 단위 픽스처(mL 기준량 · X% 이상 · 반복행) ──
for (const t of (FX.specHardening ?? []) as Array<{ case: string; base: string; label: string; expect: string }>) {
  const sp = parseSpecs(t.base); const v = sp.byKey.get(t.label);
  const got = v ? `${v.value}|${v.unit}|${v.basisAmount}|${v.basisUnit}|${v.ratio}` : 'MISS';
  ok(got === t.expect, `SPEC-HARDEN [${t.case}] ${t.label} want=${t.expect} got=${got}`);
}

// ── ② parseFiberSources 계약 검증 ──
function checkFiber(kase: string, fp: FiberParse, e: Record<string, unknown>): void {
  if (Array.isArray(e.sources)) ok(JSON.stringify([...fp.sources].sort()) === JSON.stringify([...(e.sources as string[])].sort()), `FIB sources [${kase}] want=${JSON.stringify(e.sources)} got=${JSON.stringify(fp.sources)}`);
  if (e.bySourceEmpty) ok(fp.bySource.size === 0, `FIB bySource 비어야함 [${kase}] got=${[...fp.bySource.keys()]}`);
  if (e.bySource) for (const [k, ev] of Object.entries(e.bySource as Record<string, { value: number; unit: string; basisAmount: number; basisUnit: string }>)) {
    const arr = fp.bySource.get(k); ok(!!arr && arr.length >= 1, `FIB bySource 원료누락 [${kase}] ${k}`);
    if (arr && arr[0]) { const s = arr[0]; ok(near(s.value, ev.value) && s.unit === ev.unit && near(s.basisAmount, ev.basisAmount) && s.basisUnit === ev.basisUnit, `FIB bySource 값불일치 [${kase}] ${k} want=${JSON.stringify(ev)} got=${s.value}|${s.unit}|${s.basisAmount}|${s.basisUnit}`); }
  }
  if (e.bySourceCount) for (const [k, n] of Object.entries(e.bySourceCount as Record<string, number>)) ok((fp.bySource.get(k)?.length ?? 0) === n, `FIB bySourceCount [${kase}] ${k} want=${n} got=${fp.bySource.get(k)?.length ?? 0}`);
  if (e.bySourceValues) for (const [k, vals] of Object.entries(e.bySourceValues as Record<string, number[]>)) { const got = (fp.bySource.get(k) ?? []).map((s) => s.value); ok(JSON.stringify(got) === JSON.stringify(vals), `FIB bySourceValues [${kase}] ${k} want=${JSON.stringify(vals)} got=${JSON.stringify(got)}`); }
  if (typeof e.genericCount === 'number') ok(fp.generic.length === e.genericCount, `FIB genericCount [${kase}] want=${e.genericCount} got=${fp.generic.length}`);
  if (typeof e.genericMin === 'number') ok(fp.generic.length >= (e.genericMin as number), `FIB genericMin [${kase}] want>=${e.genericMin} got=${fp.generic.length}`);
  if (e.generic0) { const g = fp.generic[0]; const ev = e.generic0 as { value: number; unit: string; basisAmount: number; basisUnit: string; ratioIncludes?: string };
    ok(!!g, `FIB generic0 없음 [${kase}]`);
    if (g) { ok(near(g.value, ev.value) && g.unit === ev.unit && near(g.basisAmount, ev.basisAmount) && g.basisUnit === ev.basisUnit, `FIB generic0 값 [${kase}] want=${JSON.stringify(ev)} got=${g.value}|${g.unit}|${g.basisAmount}|${g.basisUnit}`);
      if (ev.ratioIncludes) ok(g.ratio.includes(ev.ratioIncludes), `FIB generic0 ratio [${kase}] want~${ev.ratioIncludes} got=${g.ratio}`); } }
  if (Array.isArray(e.fnSources)) ok(JSON.stringify([...fp.fnSources].sort()) === JSON.stringify([...(e.fnSources as string[])].sort()), `FIB fnSources [${kase}] want=${JSON.stringify(e.fnSources)} got=${JSON.stringify(fp.fnSources)}`);
  if (Array.isArray(e.aggregateLabelsInclude)) for (const lbl of e.aggregateLabelsInclude as string[]) ok(fp.aggregate.some((s) => s.label.replace(/\s/g, '').includes(lbl.replace(/\s/g, ''))), `FIB aggregate 라벨누락 [${kase}] ${lbl} got=${fp.aggregate.map((s) => s.label)}`);
  if (Array.isArray(e.mustNotSource)) for (const s of e.mustNotSource as string[]) ok(!fp.sources.includes(s), `FIB 금지원료 출현(sources) [${kase}] ${s}`);
  if (Array.isArray(e.mustNotSourceInBySource)) for (const s of e.mustNotSourceInBySource as string[]) ok(!fp.bySource.has(s), `FIB 금지원료 출현(bySource) [${kase}] ${s}`);
  if (Array.isArray(e.crossLink)) for (const cl of e.crossLink as Array<{ source?: string; generic?: number; valueNot: number[] }>) {
    const specs = cl.source != null ? (fp.bySource.get(cl.source) ?? []) : cl.generic != null ? [fp.generic[cl.generic]] : [];
    for (const s of specs) if (s) for (const bad of cl.valueNot) ok(!near(s.value, bad), `FIB 교차연결 [${kase}] ${cl.source ?? 'generic'} value=${s.value} 는 타원료/섭취량 값 ${bad} 과 일치(누출)`);
  }
}
for (const f of [...(FX.fiber as Array<Record<string, unknown>>), ...(FX.displayAmount as Array<Record<string, unknown>>)]) {
  checkFiber(f.case as string, parseFiberSources(f.base as string, (f.fn as string) ?? ''), f.expect as Record<string, unknown>);
}

// ── ③ 결정성: 전체 fixture 2회 실행 → 직렬화 동일 ──
const serialize = (fp: FiberParse): string => JSON.stringify({ bySource: [...fp.bySource.entries()], generic: fp.generic, aggregate: fp.aggregate, fnSources: fp.fnSources, sources: fp.sources });
for (const f of [...(FX.fiber as Array<Record<string, unknown>>), ...(FX.displayAmount as Array<Record<string, unknown>>)]) {
  const a = serialize(parseFiberSources(f.base as string, (f.fn as string) ?? ''));
  const b = serialize(parseFiberSources(f.base as string, (f.fn as string) ?? ''));
  ok(a === b, `DET 비결정적 [${f.case}]`);
}

console.log(`\nPASS=${pass} FAIL=${fail}`);
if (fail) { console.error('\nFAILURES:\n' + fails.map((x) => '  - ' + x).join('\n')); process.exit(1); }
console.log('ALL GREEN ✓ (REG parseSpecs 불변 · FIB 원료별보존/추정0/교차0/aggregate분리 · DET 결정적)');
