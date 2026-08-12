/**
 * READ-ONLY(DB write 0) — 액상·젤·앰플·병·포·스틱 HFF **단일 기능성** 후보 selector (C 전용, stmt-shard).
 *   npx tsx src/scripts/hff-liquid-c-select.ts --stmt-file <shard2-nottaken.json> --out <dir> [--emit-pool]
 *
 * WO-O4O-HFF-LIQUID-BULK-PRODUCTION-C-V1. 기존 solid selector(nutrient/sf)가 **전량 제외**하던
 * 액상·용기분할 제형을 대상으로 한다. 공용 parser/registry/composer/apply **무수정** — 본 selector 만 C 전용.
 *
 * 핵심 계약(WO):
 *  - 제형·1회 섭취량·1일 섭취횟수가 **명확한** 후보만 pool 편입. 모호하면 HOLD.
 *  - **총 내용량(mL/g)** 과 **기능성 원료 표시량(mg/g per mL·g)** 을 분리한다. 총량을 원료량으로 쓰지 않는다.
 *  - 단일 기능성 = 표시량 스펙 중 **composable 원료(NUTRIENT_META|FUNCTIONAL_META) 정확히 1종**.
 *  - 산출 pool 스키마 = nutrient-compose NSeed (basisUnit 에 mL 허용) → 기존 composeNutrient+Guard+apply 재사용.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseBasis, parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { classify } from './hff-source-parse.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, isRiskReductionFn } from './hff-nutrient-registry.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const STMT_FILE = arg('stmt-file'); const OUTDIR = arg('out'); const EMIT = process.argv.includes('--emit-pool');
if (!STMT_FILE || !OUTDIR) throw new Error('--stmt-file, --out 필요');
fs.mkdirSync(OUTDIR, { recursive: true });
const scope = new Set<string>(JSON.parse(fs.readFileSync(STMT_FILE, 'utf8')).map(String));

// composable = 설명서 생성 가능한 등록 원료(공용 registry) 키
const composable = (k: string | null): boolean => !!k && (!!NUTRIENT_META[k] || !!FUNCTIONAL_META[k]);

// 액상·용기분할 제형 판별(WO 대상). 고형 태블릿·캡슐은 기존 트랙 소관이므로 제외.
const LIQUID_FORM = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤\b|젤상|젤리|구미|파우치|스틱|병|㎖|\bmL\b|\bml\b/i;
const SERVE_CONTAINER = '(?:병|포|스틱|앰플|파우치|매|봉|팩|㎖|mL|ml|방울)';

/** C-local: label : [표시량](V unit / B bunit) — bunit 에 mL 허용. 총 내용량 라인은 라벨이 성상/내용량이라 composable 아님 → 제외. */
function specAmounts(base: string): Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; evidence: string }> {
  const b = normalizeSource(base).replace(/㎎/g, 'mg').replace(/㎍/g, 'μg').replace(/㎖/g, 'mL');
  const N = String.raw`[\d][\d,.]*`; const numOf = (s: string) => parseFloat(s.replace(/,/g, ''));
  const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(mcg|ug|μg|μ)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; if (/^(ml)$/i.test(x)) return 'mL'; return /^g$/i.test(x) ? 'g' : 'mg'; };
  // 라벨(원료명) : [표시량] ( V unit [수식어] / B bunit )  — 두 배치 순서 모두
  const RE = new RegExp(
    String.raw`([가-힣A-Za-z0-9()·\-]{2,20})\s*[:：]\s*(?:표시량\s*)?\(?\s*(${N})\s*(mg|g|μg|mcg|ug|IU|iu)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*(${N})\s*(mg|g|mL|ml)`,
    'gi',
  );
  const out = new Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; evidence: string }>();
  let m: RegExpExecArray | null;
  while ((m = RE.exec(b)) !== null) {
    const label = m[1].trim(); const k = classify(label); if (!composable(k)) continue;
    const value = numOf(m[2]); const basisAmount = numOf(m[4]);
    if (!(value > 0) || !(basisAmount > 0)) continue;
    if (!out.has(k!)) out.set(k!, { value, unit: uNorm(m[3]), basisAmount, basisUnit: uNorm(m[5]), evidence: m[0].trim() });
  }
  return out;
}

// 기능성 문구 추출(nutrient-select 와 동일 규칙)
function extractFunctions(mainFn: string, displayKo: string): string[] {
  let t = normalizeSource(mainFn).replace(/\[[^\]]*\]/g, ' ');
  t = t.replace(new RegExp(`[-•*]?\\s*${displayKo.replace(/\s/g, '\\s?')}\\s*[:：\\-]`, 'g'), ' ');
  return [...new Set(t.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|\((?:가|나|다|라|마|바|사|\d+)\)|(?:^|\s)\d+[).]|(?<=필요|있음|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\s*[.,。、/]?\s+(?=[가-힣])/)
    .map((x) => x.trim().replace(/^[-•*\s:：·]+/, '').replace(/[.。]+$/, '').trim())
    .filter((x) => x.length >= 4 && /필요|도움|보호|유지|생성|합성|개선|억제|완화|증진/.test(x)))];
}

const SERVE_UNIT_KO = '(?:병|포|스틱|앰플|파우치|매|봉|팩|캡슐|캅셀|정|스푼|스쿱|방울|㎖|mL|ml)';
function parseServingUnit(srv: string): { count: number | null; unit: string | null } {
  const s = normalizeSource(srv);
  const m = s.match(new RegExp(`1회에?\\s*([\\d]+)\\s*${SERVE_UNIT_KO}`)) ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT_KO}(?:씩|을|를|\\(|,|\\s|$)`));
  if (!m) return { count: null, unit: null };
  const um = m[0].match(new RegExp(SERVE_UNIT_KO)); let u = um ? um[0] : null;
  if (u === 'mL' || u === 'ml' || u === '㎖') u = 'mL'; if (u === '캅셀') u = '캡슐';
  return { count: parseInt(m[1], 10), unit: u };
}

interface RawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; DISTB_PD?: string; SUNGSANG?: string; SRV_USE?: string; PRSRV_PD?: string; INTAKE_HINT1?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }

const counts: Record<string, number> = {}; const bump = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };
const eligible: unknown[] = []; const holds: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = [];
const formHist: Record<string, number> = {}; const ingHist: Record<string, number> = {};
const seen = new Set<string>();

const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue;
  let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj;
  const stmt = (it.STTEMNT_NO ?? '').trim();
  if (!stmt || !scope.has(stmt) || seen.has(stmt)) continue;
  const base = it.BASE_STANDARD ?? ''; const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? '';
  // 액상·용기분할 제형만
  if (!LIQUID_FORM.test(`${name} ${sungsang} ${srv}`)) continue;
  seen.add(stmt); bump('liquid');
  const specs = specAmounts(base);
  if (specs.size === 0) { bump('HOLD_NO_INGREDIENT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_NO_COMPOSABLE_SPEC', reason: '기능성 원료 표시량 미검출(총량만/미등록)' }); continue; }
  if (specs.size >= 2) { bump('MULTI'); continue; } // 다원료 액상 = 별도(combo) 대상, 본 배치 제외
  const [ing, da] = [...specs.entries()][0];
  const meta = NUTRIENT_META[ing] ?? FUNCTIONAL_META[ing];
  bump('single'); ingHist[ing] = (ingHist[ing] ?? 0) + 1;
  // 수출/벌크
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { bump('EXPORT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_EXPORT_ONLY', reason: '수출전용' }); continue; }
  if (isBulkMaterial(srv).bulk) { bump('BULK'); holds.push({ statementNo: stmt, productName: name, holdCode: 'BULK', reason: isBulkMaterial(srv).reason }); continue; }
  // 서빙 명확성: 1회 단위 count + 1일 횟수
  const myUnit = parseServingUnit(srv); const ps = parseServing(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  const hasContainerServe = new RegExp(`1회에?\\s*[\\d]+\\s*${SERVE_CONTAINER}|[\\d]+\\s*${SERVE_CONTAINER}(?:씩|을|를)`).test(normalizeSource(srv));
  if ((myUnit.count == null && !hasContainerServe) || perDay == null) { bump('HOLD_SERVING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_SERVING_UNCLEAR', reason: `1회/1일 섭취 불명확 (unit=${myUnit.unit}·perDay=${perDay})` }); continue; }
  // 총량↔원료량 혼동 방지: 원료 표시량 basisUnit 이 mL 인데 value 단위가 mL/g(=총량 오인) 이면 배제.
  if (da.unit === 'mL') { bump('HOLD_AMBIGUOUS'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_AMOUNT_AMBIGUOUS', reason: '원료 표시량 단위가 mL(총량 오인 위험)' }); continue; }
  // grounding 기능성 매핑
  const fnsKo = extractFunctions(it.MAIN_FNCTN ?? '', meta.displayKo);
  const fnsEn = fnsKo.map((f) => mapFunctionEn(f));
  if (fnsKo.length === 0 || fnsEn.some((e) => e == null)) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: `기능성 미매핑: ${fnsKo.filter((_, i) => fnsEn[i] == null).join('|') || '추출0'}` }); continue; }
  const nb = normalizeSource(base);
  const RATIO_N = String.raw`[\d]+(?:\.[\d]+)?\s*[~\-∼]\s*[\d]+(?:\.[\d]+)?`;
  const ratioM = nb.match(new RegExp(String.raw`표시량[^)]*\)\s*의?\s*(${RATIO_N})\s*%`)) ?? nb.match(new RegExp(String.raw`(${RATIO_N})\s*%`)) ?? nb.match(/(\d+)\s*%\s*이상/);
  const ratio = ratioM ? (ratioM[0].includes('이상') ? `${ratioM[1]}% 이상` : `${ratioM[1].replace(/\s/g, '').replace(/[∼-]/g, '~')}%`) : '80~120%';
  const uType = /젤리|구미/.test(`${sungsang} ${srv}`) ? 'gummy' : 'liquid';
  const servingUnitKo = myUnit.unit ?? (hasContainerServe ? (normalizeSource(srv).match(new RegExp(SERVE_CONTAINER))?.[0] ?? '병') : '병');
  formHist[servingUnitKo] = (formHist[servingUnitKo] ?? 0) + 1;
  eligible.push({
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(), nutrient: ing,
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    grounding: { declaredAmount: { value: da.value, unit: da.unit, basisAmount: da.basisAmount, basisUnit: da.basisUnit }, serving: { unitType: uType, unitWeight: null, unitWeightUnit: null, unitsPerServing: myUnit.count ?? 1, servingTotalWeight: ps.kind === 'PARSED' ? ps.value.servingTotal : null, servingTotalWeightUnit: ps.kind === 'PARSED' ? ps.value.servingTotalUnit : null, servingsPerDay: perDay, servingsPerDayMax: ps.kind === 'PARSED' ? ps.value.servingsPerDayMax : null }, calculationAllowed: false, ageBandsRaw: null },
    functions: { ko: fnsKo, en: fnsEn as string[] },
    compose: { servingUnitKo, ratio, hasColiform: /대장균군\s*[:：]?\s*음성/.test(nb), directGrounded: false },
    flags: { hasIU: da.unit === 'IU', riskReduction: fnsKo.some(isRiskReductionFn), waterInSource: false, chew: false, melt: false },
  });
  bump('ELIGIBLE');
}

const summary = { scope: scope.size, liquid: counts['liquid'] ?? 0, single: counts['single'] ?? 0, multi: counts['MULTI'] ?? 0, ELIGIBLE: counts['ELIGIBLE'] ?? 0,
  HOLD: { noIngredient: counts['HOLD_NO_INGREDIENT'] ?? 0, serving: counts['HOLD_SERVING'] ?? 0, amountAmbiguous: counts['HOLD_AMBIGUOUS'] ?? 0, grounding: counts['HOLD_GROUNDING'] ?? 0, bulk: counts['BULK'] ?? 0, export: counts['EXPORT'] ?? 0 },
  ingredientHist: ingHist, servingFormHist: formHist };
fs.writeFileSync(`${OUTDIR}/census.json`, JSON.stringify(summary, null, 1));
fs.writeFileSync(`${OUTDIR}/holds.json`, JSON.stringify(holds, null, 1));
if (EMIT) fs.writeFileSync(`${OUTDIR}/pool.json`, JSON.stringify(eligible, null, 1));
console.log('LIQUID_CENSUS', JSON.stringify(summary, null, 2));
if (EMIT) console.log(`→ pool ${eligible.length} · holds ${holds.length}`);
