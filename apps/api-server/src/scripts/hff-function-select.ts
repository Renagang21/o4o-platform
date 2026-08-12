/**
 * HFF 단일 기능성 원료 그룹 — 대상 풀 선정 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-function-select.ts --nutrient MSM --out <path>
 *
 * WO-O4O-HFF-LARGE-FUNCTION-GROUPS-...-V1 PART A
 * 단일 기능성 = BASE_STANDARD 기능성 스펙("라벨 : N/basis 의 ratio") **정확히 1개 = 대상 원료**, 비타민·미네랄 표시량 0.
 * 기능성 ko = MAIN_FNCTN 추출(원문), en = 레지스트리 컴포넌트 매핑(미매핑→HOLD_GROUNDING).
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { FUNCTIONAL_META, mapFunctionEn } from './hff-nutrient-registry.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const NUTRIENT = arg('nutrient'); const OUT = arg('out');
if (!NUTRIENT || !FUNCTIONAL_META[NUTRIENT]) throw new Error(`--nutrient (${Object.keys(FUNCTIONAL_META).join('/')})`);
if (!OUT) throw new Error('--out 필요');
const META = FUNCTIONAL_META[NUTRIENT];

const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|3-MCPD|엽록소/;
const DONE_VM = /비타민\s?[A-EK]|비타민\s?B|아연|마그네슘|칼슘|철분|엽산|셀레늄|셀렌|나이아신|판토텐|비오틴|구리|망간|크롬|몰리브|요오드|토코페롤|레티놀/i;
const FUNC: Array<{ key: string; re: RegExp }> = [
  { key: '오메가3', re: /EPA|DHA|오메가|중성지질|정제어유/i }, { key: '루테인', re: /루테인|지아잔틴|황반/i },
  { key: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스|흰무늬엉겅퀴/i }, { key: '쏘팔메토', re: /쏘팔메토|소팔메토/i },
  { key: 'MSM', re: /MSM|엠에스엠|메틸설포닐메탄|디메틸설폰|식이유황/i }, { key: '코엔자임Q10', re: /코엔자임|코큐텐|Q10|유비퀴논/i },
  { key: '감마리놀렌산', re: /감마리놀렌|달맞이꽃|보라지/i }, { key: '은행잎', re: /은행잎|징코|플라보놀/i },
  { key: '프로폴리스', re: /프로폴리스|총\s*플라보노이드|플라보노이드/i }, { key: '가르시니아', re: /가르시니아|hydroxycitric|HCA/i },
  { key: '글루코사민', re: /글루코사민/i }, { key: '식이섬유', re: /식이섬유|차전자|난소화성말토덱스트린|귀리|이눌린|프락토올리고/i },
  { key: '대두이소플라본', re: /이소플라본|대두배아/i }, { key: '테아닌', re: /테아닌/i }, { key: '녹차', re: /녹차|카테킨|EGCG|갈산에피갈로/i },
  { key: '알로에', re: /알로에/i }, { key: '옥타코사놀', re: /옥타코사놀/i },
];
function classify(label: string): string | null { for (const f of FUNC) if (f.re.test(label)) return f.key; return null; }

const SPEC = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU)\s*\)?\s*\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*(?:의\s*[\d.]+\s*[~∼-]\s*[\d.]+\s*%|이상)/gi;

function extractFuncSpec(base: string): { funcs: Set<string>; vm: number; unknown: number; declared: { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string } | null } {
  const b = normalizeSource(base); const funcs = new Set<string>(); let vm = 0, unknown = 0;
  let declared: { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string } | null = null;
  const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(㎍|mcg|ug|μg)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; return x.toLowerCase() === 'g' ? 'g' : 'mg'; };
  const numOf = (s: string) => parseFloat(s.replace(/,/g, ''));
  let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(b)) !== null) {
    const label = m[1].trim();
    if (NONFUNC.test(label)) continue;
    if (DONE_VM.test(label)) { vm++; continue; }
    const k = classify(label);
    if (!k) { unknown++; continue; }
    funcs.add(k);
    if (k === NUTRIENT) {
      const ratioM = m[0].match(/([\d.]+\s*[~∼-]\s*[\d.]+)\s*%/);
      declared = { value: numOf(m[2]), unit: uNorm(m[3]), basisAmount: numOf(m[4]), basisUnit: uNorm(m[5]), ratio: ratioM ? `${ratioM[1].replace(/\s/g, '').replace(/[∼-]/g, '~')}%` : '표시량 이상' };
    }
  }
  return { funcs, vm, unknown, declared };
}

function extractFunctions(mainFn: string): string[] {
  let t = normalizeSource(mainFn);
  t = t.replace(/\[[^\]]*\]/g, ' ');
  const parts = t.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|\((?:가|나|다|라|마|바|사|\d+)\)|(?:^|\s)\d+[).]|(?<=필요|있음|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\s*[.,。、/]?\s+(?=[가-힣])/)
    .map((x) => x.trim().replace(/^[-•*\s:：·]+/, '').replace(/[.。]+$/, '').trim())
    // "라벨 : " 접두 제거(도움/개선/필요 앞) — 밀크씨슬추출물 : 간 건강에 도움
    .map((x) => x.replace(/^[가-힣A-Za-z0-9()-]{2,25}\s*[:：]\s*(?=.*(도움|개선|필요|유지|억제|완화|증진|보호))/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성/.test(x));
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
  const { funcs, vm, unknown, declared } = extractFuncSpec(base);
  if (!funcs.has(NUTRIENT)) continue;
  bump('mention');
  if (funcs.size >= 2 || vm > 0 || unknown > 0) { bump('HOLD_MULTI'); continue; }
  if (!stmt || seen.has(stmt)) { bump('DUP'); continue; }
  seen.add(stmt);
  // 제품명에 수량 스케일어(조/억/만/천)가 있으면 가드 H-COUNT 가 조인트('조'인트) 등을 phantom 수량으로 오탐 → 격리
  if (/[0-9][0-9,.]*\s*[조억만천]/.test(name)) { bump('HOLD_IDENTITY'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_IDENTITY', reason: '제품명 수량 스케일어(가드 phantom count 유발)' }); continue; }
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { bump('EXPORT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_EXPORT_ONLY', reason: '수출전용' }); continue; }
  if (isLiquidDrop(name, sungsang, srv)) { bump('HOLD_UNSUPPORTED'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_UNSUPPORTED_DIMENSION', reason: '액상·mL' }); continue; }
  if (isBulkMaterial(srv).bulk) { bump('BULK'); holds.push({ statementNo: stmt, productName: name, holdCode: 'BULK', reason: isBulkMaterial(srv).reason }); continue; }
  if (!declared || declared.ratio === '표시량 이상') { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '지표성분 표시량/비율 추출 실패' }); continue; }
  const fnsKo = extractFunctions(it.MAIN_FNCTN ?? '');
  const fnsEn = fnsKo.map((f) => mapFunctionEn(f));
  if (fnsKo.length === 0 || fnsEn.some((e) => e == null)) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: `기능성 미매핑: ${fnsKo.filter((_, i) => fnsEn[i] == null).join('|') || '추출 0'}` }); continue; }
  const ps = parseServing(srv); const myUnit = parseServingUnit(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  if (myUnit.count == null && perDay == null) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '섭취 파싱 실패' }); continue; }
  const uType = servingUnitType(name, sungsang, srv, myUnit.unit);
  const waterInSource = /물|음용수/.test(normalizeSource(srv)) && !/물\s*없이/.test(normalizeSource(srv));
  eligible.push({
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(), nutrient: NUTRIENT,
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    grounding: { declaredAmount: { value: declared.value, unit: declared.unit, basisAmount: declared.basisAmount, basisUnit: declared.basisUnit }, serving: { unitType: uType, unitWeight: null, unitWeightUnit: null, unitsPerServing: myUnit.count, servingTotalWeight: ps.kind === 'PARSED' ? ps.value.servingTotal : null, servingTotalWeightUnit: ps.kind === 'PARSED' ? ps.value.servingTotalUnit : null, servingsPerDay: perDay, servingsPerDayMax: ps.kind === 'PARSED' ? ps.value.servingsPerDayMax : null }, calculationAllowed: false, ageBandsRaw: null },
    functions: { ko: fnsKo, en: fnsEn as string[] },
    compose: { servingUnitKo: myUnit.unit ? (/(연질|경질)?캡슐|캅셀/.test(myUnit.unit) ? '캡슐' : myUnit.unit) : null, ratio: declared.ratio, hasColiform: /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base)), directGrounded: /그대로|직접|털어서/.test(normalizeSource(srv)) && !waterInSource },
    flags: { hasIU: declared.unit === 'IU', riskReduction: false, waterInSource, chew: /씹어/.test(normalizeSource(srv)), melt: /녹여|녹인|입에서/.test(normalizeSource(srv)) },
  });
  bump('ELIGIBLE');
}
fs.writeFileSync(OUT, JSON.stringify(eligible, null, 1));
fs.writeFileSync(OUT.replace(/\.json$/, '.hold.json'), JSON.stringify(holds, null, 1));
console.log(`═══ ${NUTRIENT} 단일 기능성 원료 선정 ═══`);
console.log(`mention ${counts['mention'] ?? 0} · ELIGIBLE ${counts['ELIGIBLE'] ?? 0} · HOLD_MULTI ${counts['HOLD_MULTI'] ?? 0} · 액상 ${counts['HOLD_UNSUPPORTED'] ?? 0} · 벌크 ${counts['BULK'] ?? 0} · 수출 ${counts['EXPORT'] ?? 0} · grounding ${counts['HOLD_GROUNDING'] ?? 0}`);
const el = eligible as Array<{ grounding: { serving: { unitType: string } }; functions: { ko: string[] } }>;
const fDist: Record<string, number> = {}; for (const x of el) fDist[x.grounding.serving.unitType] = (fDist[x.grounding.serving.unitType] ?? 0) + 1;
console.log(`제형 ${JSON.stringify(fDist)}`);
console.log(`→ ${OUT} (${eligible.length}) · hold (${holds.length})`);
