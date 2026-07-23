/**
 * READ-ONLY — B fixture 10종 회귀검증 (C parser 74c9e8f2d 기준). DB write 0 · DB 접속 불요.
 *   npx tsx src/scripts/hff-fiber-fixture-regression.ts --fixtures <fiber-fixtures.json>
 *
 * 검증: 원료별 표시량 보존 · 다원료 비붕괴 · generic 비추정 · 타도메인 비누락(parseSpecs 불변)
 *      · X%이상 · deterministic rerun.
 */
import fs from 'node:fs';
import { parseFiberSources, parseSpecs } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const FIX = arg('fixtures'); if (!FIX) throw new Error('--fixtures 필요');
const fixtures = JSON.parse(fs.readFileSync(FIX, 'utf8')) as Array<{ case: string; stmt: string; name: string; base: string; fn?: string; expectedSources?: string[] }>;

let pass = 0, fail = 0; const results: Array<Record<string, unknown>> = [];
const serialize = (p: ReturnType<typeof parseFiberSources>): string => JSON.stringify({ s: [...p.bySource.entries()].map(([k, v]) => [k, v.map((x) => [x.value, x.unit, x.basisAmount, x.basisUnit, x.ratio])]), g: p.generic.length, a: p.aggregate.length, src: p.sources.sort() });

for (const f of fixtures) {
  const p1 = parseFiberSources(f.base, f.fn ?? '');
  const p2 = parseFiberSources(f.base, f.fn ?? '');           // deterministic rerun
  const det = serialize(p1) === serialize(p2);
  const checks: string[] = []; let ok = true;
  if (!det) { ok = false; checks.push('NON_DETERMINISTIC'); }
  const exp = (f.expectedSources ?? []).filter((s) => s !== '이눌린치커리');
  const expNorm = (f.expectedSources ?? []).map((s) => s === '이눌린치커리' ? '이눌린' : s);
  if (f.case.startsWith('generic')) {
    // generic 은 특정 원료로 추정 금지: bySource 의 구체원료 캡처가 없어야(라벨 자체가 generic)
    if (p1.bySource.size > 0) { ok = false; checks.push(`GENERIC_MISATTRIBUTED:${[...p1.bySource.keys()]}`); }
  } else {
    // 기대 원료가 sources(라벨 or fn 신호)에 포함되는가
    for (const s of expNorm) if (!p1.sources.includes(s) && !p1.sources.some((x) => s.includes(x) || x.includes(s))) { ok = false; checks.push(`SOURCE_MISSING:${s}`); }
    // 다원료 비붕괴: 기대 2+ 원료면 sources 도 2+ 유지
    if (expNorm.length >= 2 && p1.sources.length < 2) { ok = false; checks.push('MULTI_COLLAPSED'); }
  }
  // 원료별 표시량: 같은 라벨 라인 캡처 시 evidence 에 자기 라벨 포함(교차연결 불가 구조 확인)
  for (const [src, specs] of p1.bySource) for (const sp of specs) if (!sp.evidence.includes(sp.label.split(/\s/)[0].slice(0, 3))) { ok = false; checks.push(`EVIDENCE_LABEL_MISMATCH:${src}`); }
  // 타도메인 비누락: parseSpecs(불변 경로) 산출 키 유지(타원료동반 케이스에서 파트너 존재)
  const other = parseSpecs(f.base).byKey;
  if (f.case === '타원료동반' && other.size === 0 && !/식이섬유/.test([...other.keys()].join())) checks.push('WARN_NO_PARTNER_SPEC');
  // X%이상 포맷
  if (f.case === 'X이상형') { const any = [...p1.bySource.values()].flat().concat(p1.generic, p1.aggregate); if (!any.some((x) => /이상/.test(x.ratio))) { ok = false; checks.push('X_ISANG_NOT_PARSED'); } }
  if (ok) pass++; else fail++;
  results.push({ case: f.case, stmt: f.stmt, ok, checks, sources: p1.sources, bySource: [...p1.bySource.keys()], generic: p1.generic.length, aggregate: p1.aggregate.length, deterministic: det });
}
console.log('JSON_FIXREG_BEGIN');
console.log(JSON.stringify({ fixtures: fixtures.length, PASS: pass, FAIL: fail, results }, null, 2));
console.log('JSON_FIXREG_END');
if (fail) process.exit(2);
