/**
 * HFF 단일 영양소 그룹 — 대상 풀 선정 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-nutrient-select.ts --nutrient 아연 --out <path>
 *
 * WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1 §4~§6
 * 단일 기능성 = BASE_STANDARD 표시량 스펙 **정확히 1개 = 대상 영양소**. 고형·비벌크·비수출·grounding.
 * 기능성 ko = MAIN_FNCTN 추출(grounded), en = 레지스트리 매핑(미매핑→HOLD_GROUNDING).
 * 산출: <out> pool.json + <out>.hold.json.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseBasis, parseServing, isBulkMaterial, parseCfu, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, mapFunctionEn, isRiskReductionFn } from './hff-nutrient-registry.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const NUTRIENT = arg('nutrient');
const OUT = arg('out');
if (!NUTRIENT || !NUTRIENT_META[NUTRIENT]) throw new Error(`--nutrient 필요 (${Object.keys(NUTRIENT_META).join('/')})`);
if (!OUT) throw new Error('--out 필요');
const META = NUTRIENT_META[NUTRIENT];

// 표시량 스펙 라벨 분류 (nutrient-agnostic)
const NLABEL: Array<{ key: string; re: RegExp }> = [
  { key: '비타민C', re: /비타민\s?C\b/i }, { key: '비타민D', re: /비타민\s?D\b/i },
  { key: '비타민B12', re: /비타민\s?B\s?12|코발라민/i }, { key: '비타민B6', re: /비타민\s?B\s?6|피리독/i },
  { key: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i }, { key: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { key: '비타민A', re: /비타민\s?A\b|레티놀|베타카로틴|베타-?카로/i }, { key: '비타민E', re: /비타민\s?E\b|토코페롤/i },
  { key: '비타민K', re: /비타민\s?K\b|메나퀴논|필로퀴논/i }, { key: '엽산', re: /엽산|폴[레리]?산/i },
  { key: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i }, { key: '판토텐산', re: /판토텐/i },
  { key: '비오틴', re: /비오틴|바이오틴/i }, { key: '아연', re: /아연/i }, { key: '마그네슘', re: /마그네슘/i },
  { key: '철', re: /철분|헴철|철\s*[:：(（]|피로인산철|푸마르산철|구연산철/i }, { key: '칼슘', re: /칼슘/i }, { key: '셀레늄', re: /셀레늄|셀렌/i },
  { key: '구리', re: /구리/i }, { key: '망간', re: /망간/i }, { key: '크롬', re: /크[로롬]/i },
  { key: '몰리브덴', re: /몰리브/i }, { key: '요오드', re: /요오드|아이오딘/i },
];
function classifyLabel(s: string): string | null { for (const n of NLABEL) if (n.re.test(s)) return n.key; return null; }
function specNutrients(base: string): { set: Set<string>; unknown: number } {
  const b = normalizeSource(base); const set = new Set<string>(); let unknown = 0;
  const re = /표시량/g; let m: RegExpExecArray | null;
  while ((m = re.exec(b)) !== null) { const before = b.slice(Math.max(0, m.index - 18), m.index); const k = classifyLabel(before); if (k) set.add(k); else unknown++; }
  return { set, unknown };
}

function extractDeclared(base: string): { value: number; unit: string; basisAmount: number; basisUnit: string } | null {
  const b = normalizeSource(base);
  const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(㎍|mcg|ug|μg|μ)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; if (/^mg$/i.test(x)) return 'mg'; if (/^g$/i.test(x)) return 'g'; return x; };
  const N = String.raw`[\d][\d,.]*`; const numOf = (s: string) => parseFloat(s.replace(/,/g, ''));
  const m = b.match(new RegExp(String.raw`표시량\s*\(\s*(${N})\s*(㎍|mcg|ug|μg|IU|iu|mg|g)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*(${N})\s*(mg|g)\s*\)`, 'i'))
    ?? b.match(new RegExp(String.raw`(${N})\s*(㎍|mcg|ug|μg|IU|iu|mg|g)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*(${N})\s*(mg|g)\s*\(\s*표시량`, 'i'))
    ?? b.match(new RegExp(String.raw`표시량\s*[:：]?\s*(${N})\s*(㎍|mcg|ug|μg|IU|iu|mg|g)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*(${N})\s*(mg|g)`, 'i'));
  if (!m) return null;
  const value = numOf(m[1]); const unit = uNorm(m[2]); const basisAmount = numOf(m[3]); const basisUnit = uNorm(m[4]);
  if (!(value > 0) || !(basisAmount > 0)) return null;
  return { value, unit, basisAmount, basisUnit };
}

// MAIN_FNCTN → 기능성 문구 배열 (라벨 제거 + 마커 분할)
function extractFunctions(mainFn: string): string[] {
  let t = normalizeSource(mainFn);
  t = t.replace(/\[[^\]]*\]/g, ' ');
  // 라벨 제거: "아연 :" / "아연 -" / "아연:" (표시 이름 변이)
  t = t.replace(new RegExp(`[-•*]?\\s*${META.displayKo.replace(/\s/g, '\\s?')}\\s*[:：\\-]`, 'g'), ' ');
  const parts = t
    // 마커 분할: ①②③ · (가) · (1) · 1) · 1. · 그리고 **기능 종결어 뒤(쉼표 포함) + 한글**(마커 없는 나열).
    // ⚠️ bare 쉼표로 분할하지 않는다 — "지방, 탄수화물, 단백질 대사…" 처럼 기능 내부 나열 쉼표가 있다(비오틴·판토텐산).
    .split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|\((?:가|나|다|라|마|바|사|\d+)\)|(?:^|\s)\d+[).]|(?<=필요|있음|줌|도움|보호|유지|생성|합성|발달)\s*[.,。、/]?\s+(?=[가-힣])/)
    .map((x) => x.trim().replace(/^[-•*\s:：·]+/, '').replace(/[.。]+$/, '').trim())
    .filter((x) => x.length >= 4 && /필요|도움|보호|유지|생성|합성/.test(x));
  return [...new Set(parts)];
}

const SERVE_UNIT = '(?:연질캡슐|경질캡슐|캡슐|캅셀|정|포|스틱|병|필름|매|개|젤리|구미|스푼|스쿱|알|봉|편|환|팩)';
function parseServingUnit(srv: string): { count: number | null; unit: string | null } {
  const s = normalizeSource(srv);
  const m = s.match(new RegExp(`1회에?\\s*([\\d]+)\\s*${SERVE_UNIT}`)) ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}(?:씩|을|를|\\(|,|\\s)`)) ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}`));
  if (!m) return { count: null, unit: null };
  const um = m[0].match(new RegExp(SERVE_UNIT)); return { count: parseInt(m[1], 10), unit: um ? um[0] : null };
}
function servingUnitType(name: string, sungsang: string, srv: string, unit: string | null): string {
  const t = `${sungsang} ${srv} ${name}`;
  if (/젤리|구미|gummy/i.test(t) || unit === '젤리' || unit === '구미') return 'gummy';
  if (/필름/.test(t) || unit === '매') return 'film';
  if (/연질캡슐|소프트캡슐|softgel/i.test(t)) return 'softgel';
  if (/츄[어정]|씹/.test(srv)) return 'chewable';
  if (/캡슐|캅셀/.test(t) || unit === '캡슐' || unit === '캅셀') return 'capsule';
  if (/분말|과립|스틱|스푼/.test(t) || unit === '포' || unit === '스틱' || unit === '스푼' || unit === '스쿱') return 'powder';
  return 'tablet';
}
function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`;
  if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true;
  if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true;
  return false;
}

interface RawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; DISTB_PD?: string; SUNGSANG?: string; SRV_USE?: string; PRSRV_PD?: string; INTAKE_HINT1?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }

const counts: Record<string, number> = {}; const bump = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };
const eligible: unknown[] = []; const holds: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = [];
const seen = new Set<string>();

const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue;
  let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj;
  const base = it.BASE_STANDARD ?? ''; const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? ''; const stmt = (it.STTEMNT_NO ?? '').trim();
  const { set, unknown } = specNutrients(base);
  if (set.size === 0 || !set.has(NUTRIENT)) continue;
  bump('mention');
  if (set.size >= 2 || unknown > 0) { bump('HOLD_MULTI'); continue; }
  if (!stmt || seen.has(stmt)) { bump('DUP'); continue; }
  seen.add(stmt);
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { bump('EXPORT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_EXPORT_ONLY', reason: '수출전용' }); continue; }
  if (isLiquidDrop(name, sungsang, srv)) { bump('HOLD_UNSUPPORTED'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_UNSUPPORTED_DIMENSION', reason: '액상·드롭·mL' }); continue; }
  if (isBulkMaterial(srv).bulk) { bump('BULK'); holds.push({ statementNo: stmt, productName: name, holdCode: 'BULK', reason: isBulkMaterial(srv).reason }); continue; }
  const declared = extractDeclared(base);
  if (!declared) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '표시량 추출 실패' }); continue; }
  const pb = parseBasis(base);
  if (pb.kind === 'ABNORMAL') { bump('HOLD_ABNORMAL'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_SOURCE_ABNORMAL', reason: pb.reason }); continue; }
  if (pb.kind !== 'PARSED') { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: `parseBasis ${pb.kind}` }); continue; }
  const declBasisMg = declared.basisUnit === 'g' ? declared.basisAmount * 1000 : declared.basisAmount;
  const pbMg = pb.value.unit === 'g' ? pb.value.amount * 1000 : pb.value.amount;
  if (Math.abs(declBasisMg - pbMg) > Math.max(1, pbMg * 1e-6)) { bump('HOLD_CONFLICT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_DATA_CONFLICT', reason: `기준량 불일치 ${declBasisMg} vs ${pbMg}` }); continue; }
  // 기능성 추출 + en 매핑
  const fnsKo = extractFunctions(it.MAIN_FNCTN ?? '');
  const fnsEn = fnsKo.map((f) => mapFunctionEn(f));
  if (fnsKo.length === 0 || fnsEn.some((e) => e == null)) {
    bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: `기능성 미매핑: ${fnsKo.filter((_, i) => fnsEn[i] == null).join('|') || '추출 0'}` }); continue;
  }
  // serving
  const ps = parseServing(srv); const myUnit = parseServingUnit(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  if (myUnit.count == null && perDay == null) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '섭취 파싱 실패' }); continue; }
  const uType = servingUnitType(name, sungsang, srv, myUnit.unit);
  const nb = normalizeSource(base);
  const RATIO_N = String.raw`[\d]+(?:\.[\d]+)?\s*[~\-∼]\s*[\d]+(?:\.[\d]+)?`;
  const ratioM = nb.match(new RegExp(String.raw`표시량[^)]*\)\s*의?\s*(${RATIO_N})\s*%`)) ?? nb.match(new RegExp(String.raw`(${RATIO_N})\s*%`));
  const ratio = ratioM ? `${ratioM[1].replace(/\s/g, '').replace(/[∼-]/g, '~').replace(/\.0+(?=~|$)/g, '')}%` : '80~180%';
  const waterInSource = /물|음용수/.test(normalizeSource(srv)) && !/물\s*없이/.test(normalizeSource(srv));

  eligible.push({
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(),
    nutrient: NUTRIENT,
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    grounding: { declaredAmount: declared, serving: { unitType: uType, unitWeight: null, unitWeightUnit: null, unitsPerServing: myUnit.count, servingTotalWeight: ps.kind === 'PARSED' ? ps.value.servingTotal : null, servingTotalWeightUnit: ps.kind === 'PARSED' ? ps.value.servingTotalUnit : null, servingsPerDay: perDay, servingsPerDayMax: ps.kind === 'PARSED' ? ps.value.servingsPerDayMax : null }, calculationAllowed: false, ageBandsRaw: null },
    functions: { ko: fnsKo, en: fnsEn as string[] },
    compose: { servingUnitKo: myUnit.unit ? (/(연질|경질)?캡슐|캅셀/.test(myUnit.unit) ? '캡슐' : myUnit.unit) : null, ratio, hasColiform: /대장균군\s*[:：]?\s*음성/.test(nb), directGrounded: /그대로|직접|털어서/.test(normalizeSource(srv)) && !waterInSource },
    flags: { hasIU: declared.unit === 'IU', riskReduction: fnsKo.some(isRiskReductionFn), waterInSource, chew: /씹어/.test(normalizeSource(srv)), melt: /녹여|녹인|입에서/.test(normalizeSource(srv)) },
  });
  bump('ELIGIBLE');
}

fs.writeFileSync(OUT, JSON.stringify(eligible, null, 1));
fs.writeFileSync(OUT.replace(/\.json$/, '.hold.json'), JSON.stringify(holds, null, 1));
console.log(`═══ ${NUTRIENT} 단일 그룹 선정 ═══`);
console.log(`mention ${counts['mention'] ?? 0} · ELIGIBLE ${counts['ELIGIBLE'] ?? 0} · HOLD_MULTI ${counts['HOLD_MULTI'] ?? 0} · 액상 ${counts['HOLD_UNSUPPORTED'] ?? 0} · 벌크 ${counts['BULK'] ?? 0} · 수출 ${counts['EXPORT'] ?? 0} · grounding ${counts['HOLD_GROUNDING'] ?? 0} · abnormal ${counts['HOLD_ABNORMAL'] ?? 0} · conflict ${counts['HOLD_CONFLICT'] ?? 0}`);
const el = eligible as Array<{ grounding: { declaredAmount: { unit: string }; serving: { unitType: string } }; flags: { hasIU: boolean; riskReduction: boolean } }>;
const uDist: Record<string, number> = {}; const fDist: Record<string, number> = {};
for (const x of el) { uDist[x.grounding.declaredAmount.unit] = (uDist[x.grounding.declaredAmount.unit] ?? 0) + 1; fDist[x.grounding.serving.unitType] = (fDist[x.grounding.serving.unitType] ?? 0) + 1; }
console.log(`단위 ${JSON.stringify(uDist)} · 제형 ${JSON.stringify(fDist)} · IU ${el.filter((x) => x.flags.hasIU).length} · 위험감소기능 ${el.filter((x) => x.flags.riskReduction).length}`);
console.log(`→ ${OUT} (${eligible.length}) · ${OUT.replace(/\.json$/, '.hold.json')} (${holds.length})`);
