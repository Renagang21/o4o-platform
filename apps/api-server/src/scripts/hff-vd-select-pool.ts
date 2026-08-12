/**
 * 비타민 D 단일형 생산 라인 — 대상 풀 선정 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-vd-select-pool.ts
 *
 * WO-O4O-HFF-DESCRIPTION-VITAMIN-D-PRODUCTION-LINE-V1 §6/§7
 * raw JSONL(G:드라이브) 파싱 → 비타민 D **단일 기능성 · 고형(정/캡슐) 완제품** 만 적격.
 * 제외/이관: 복합(HOLD_MULTI) · 액상드롭(HOLD_UNSUPPORTED) · 원문이상(HOLD_SOURCE_ABNORMAL)
 *          · grounding 부족(HOLD_GROUNDING) · 벌크 · 기존 20 사용분.
 * 산출: scratchpad/vd-pool.json (적격 seed + grounding) + scratchpad/vd-hold.json (HOLD 레지스트리) + 콘솔 통계.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseBasis, parseServing, isBulkMaterial, parseCfu, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const OUT_DIR = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';

// 기존 20 파일럿 사용 신고번호 (제외)
const USED_20 = new Set([
  '200400200061020','200400170211026','202100162297','2021001622910','20070017035836',
  '20070017035591','200400200142093','200400200083278','2021001622992','20190016403177',
  '2016000600517','20040017106320','200400150831276','200400170061107','20190009483363',
  '20120019007472','2020001635475','2022002000214','20040020028852','20172880236432',
]);

type HoldCode = 'HOLD_MULTI_FUNCTIONAL' | 'HOLD_UNSUPPORTED_DIMENSION' | 'HOLD_SOURCE_ABNORMAL' | 'HOLD_GROUNDING' | 'HOLD_DATA_CONFLICT' | 'HOLD_EXPORT_ONLY' | 'BULK' | 'NOT_VD' | 'DUP' | 'USED';

interface Seed {
  statementNo: string;
  productName: string;
  manufacturer: string;
  source: { mainFunction: string; baseStandard: string; intake: string; caution: string; dosageForm: string; storage: string; shelfLife: string };
  grounding: {
    declaredAmount: { value: number; unit: string; basisAmount: number; basisUnit: string } | null;
    serving: { unitType: string; unitWeight: number | null; unitWeightUnit: string | null; unitsPerServing: number | null; servingTotalWeight: number | null; servingTotalWeightUnit: string | null; servingsPerDay: number | null; servingsPerDayMax: number | null } | null;
    calculationAllowed: boolean;
    ageBandsRaw: string | null;
  };
  compose: { servingUnitKo: string | null; ratio: string; hasColiform: boolean; directGrounded: boolean };
  flags: { hasIU: boolean; hasCfuToken: boolean; osteoporosis: boolean; ageBands: boolean; multiDaily: boolean; waterInSource: boolean; chew: boolean; melt: boolean };
}

// ── 다른 기능성 원료가 표시량 스펙을 가지는가 → 복합 (칼슘·인 흡수 prose 는 VD 기능 텍스트라 오탐 안 함) ──
// 표시량 앞 라벨이 비-VD 영양소면 별도 기능성 원료.
const OTHER_NUTRIENT = /(비타민\s?[ABCEK]\b|비타민\s?B\d|아연|칼슘|마그네슘|엽산|판토텐산|나이아신|비오틴|셀[레렌]|구리|망간|크롬|몰리브[덴덴]|요오드|철분?|오메가|EPA|DHA|루테인|프로바이오틱스|유산균|코엔자임|밀크씨슬|감마리놀렌|GLA|홍삼|프로폴리스|가르시니아|MSM)/;

// MAIN_FNCTN 스캔용 — VD 공식 기능 텍스트에 등장하는 칼슘·인(phosphorus)은 **제외**해야 오탐이 없다.
// (VD 기능: "칼슘과 인이 흡수되고 이용되는데 필요"). 그 외 기능성 원료 토큰이 있으면 복합.
const NON_VD_INGREDIENT = /(유산균|프로바이오틱스|아연|마그네슘|엽산|철분|비타민\s?A|비타민\s?B|비타민\s?C|비타민\s?E|비타민\s?K|나이아신|비오틴|판토텐산|셀[레렌]|구리|망간|크롬|요오드|몰리브|오메가|EPA|DHA|루테인|지아잔틴|MSM|홍삼|밀크씨슬|가르시니아|GLA|감마리놀[레]?[ㄴ렌]|코엔자임|콜라겐|글루코사민|쏘팔메토|보스웰리아|여주|크릴|은행잎|테아닌|스피루리나|클로렐라|차전자|이눌린|프락토올리고|난소화성|키토산|코큐텐|CoQ10|비타민D를\s*포함한)/i;

// ── 강한 단일 판정: MAIN_FNCTN 에서 VD 공식 기능 문구 + 라벨을 제거하고 잔여 실질 텍스트가 있으면 복합 ──
// VD 공식 기능은 고정 3문장이므로, 다른 기능성 원료가 있으면 그 원료의 기능 문장이 잔여로 남는다.
function vdResidual(mainFn: string): string {
  let t = normalizeSource(mainFn);
  // VD 3대 기능 문구 제거(띄어쓰기 관대)
  t = t.replace(/칼슘과?\s*인이?\s*흡수되고\s*이용되는\s*데?\s*필요/g, ' ');
  t = t.replace(/뼈의?\s*형성과\s*유지에\s*필요/g, ' ');
  t = t.replace(/골다공증\s*발생?\s*위험\s*감소에?\s*도움을?\s*(줄\s*수\s*있음|줌|주는\s*데\s*도움|줄\s*수\s*있습니다)?/g, ' ');
  t = t.replace(/도움을?\s*줄?\s*수?\s*있음/g, ' ');
  // VD 라벨/마커 제거
  t = t.replace(/비타민\s?D3?/g, ' ').replace(/vitamin\s?d3?/gi, ' ');
  t = t.replace(/\[[^\]]*\]/g, ' ');
  t = t.replace(/[*·・ㆍ①②③④⑤⑥⑦⑧⑨⑩⑪⑫㉠㉡\-()（）:：,./0-9%~＊「」『』]/g, ' ');
  t = t.replace(/[a-zA-Z]/g, ' '); // 잔여 영문(vitamin d 등) 제거
  return t.replace(/\s+/g, '').trim();
}

function isMultiFunctional(base: string, mainFn: string): boolean {
  const b0 = normalizeSource(base);
  // ⓪ MAIN_FNCTN 잔여 실질 텍스트(한글) 4자 초과 → 다른 기능성 원료 존재 = 복합
  if (vdResidual(mainFn).length > 4) return true;
  // ⓪-b BASE_STANDARD 에 성분별 "표시량(N…)" 스펙이 2개 이상 = 복합(라벨 denylist 무관하게 검출)
  if ((b0.match(/표시량\s*\(?\s*[\d]/g) ?? []).length >= 2) return true;
  const b = normalizeSource(base);
  // ① 표시량 스펙마다 앞 라벨(14자) 검사 — 칼슘·마그네슘 등 별도 표시량 = 복합
  const re = /표시량/g; let m: RegExpExecArray | null;
  while ((m = re.exec(b)) !== null) {
    const before = b.slice(Math.max(0, m.index - 14), m.index);
    if (OTHER_NUTRIENT.test(before)) return true;
  }
  // ② 다중 브래킷 라벨 [비타민D][칼슘] 형태
  const brackets = (b.match(/\[([^\]]+)\]/g) ?? []).filter((x) => !/성상|기준|규격/.test(x));
  if (brackets.filter((x) => OTHER_NUTRIENT.test(x)).length >= 1) return true;
  // ③ MAIN_FNCTN 에 비-VD 기능성 원료 토큰(칼슘·인 제외) → 복합. 프로바이오틱스+VD 등 CFU 표기 누수 차단.
  const mfn = normalizeSource(mainFn);
  if (NON_VD_INGREDIENT.test(mfn)) return true;
  // ④ 프로바이오틱스 CFU 스펙이 BASE_STANDARD 에 있으면(표시량 미인접이어도) 복합
  if (/프로바이오틱스\s*수|유산균\s*수|CFU\s*\/\s*g\s*이상/.test(b)) return true;
  return false;
}

// ── 액상·드롭·시럽 → 미지원 차원 ──
function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`;
  if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true;
  if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true;
  return false;
}

// ── 비타민 D 표시량 추출 (㎍/mcg/ug/μg/IU/mg) ──
function extractVdDeclared(base: string): { value: number; unit: string; basisAmount: number; basisUnit: string } | null {
  const b = normalizeSource(base); // ㎎→mg, 전각→반각. ㎍ 유지.
  const uNorm = (u: string): string => {
    const x = u.replace(/\s/g, '');
    if (/^(㎍|mcg|ug|μg|μ)$/i.test(x)) return 'μg';
    if (/^iu$/i.test(x)) return 'IU';
    if (/^mg$/i.test(x)) return 'mg';
    if (/^g$/i.test(x)) return 'g';
    return x;
  };
  // 형태 1: 비타민D : 표시량(5 ㎍/0.4 g)의 80~180%
  let m = b.match(/비타민\s?D3?\s*[:：]?\s*표시량\s*\(\s*([\d.]+)\s*(㎍|mcg|ug|μg|IU|iu|mg)\s*\/\s*([\d.]+)\s*(mg|g)\s*\)/i);
  // 형태 2: 표시량(5㎍/0.4g) — 라벨 없이(단일이라 비타민D 로 간주)
  if (!m) m = b.match(/표시량\s*\(\s*([\d.]+)\s*(㎍|mcg|ug|μg|IU|iu|mg)\s*\/\s*([\d.]+)\s*(mg|g)\s*\)/i);
  // 형태 3: 비타민D : 10 ㎍ / 2 g (표시량의 80-180%)
  if (!m) m = b.match(/비타민\s?D3?\s*[:：]?\s*([\d.]+)\s*(㎍|mcg|ug|μg|IU|iu|mg)\s*\/\s*([\d.]+)\s*(mg|g)\s*\(\s*표시량/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = uNorm(m[2]);
  const basisAmount = parseFloat(m[3]);
  const basisUnit = uNorm(m[4]);
  if (!(value > 0) || !(basisAmount > 0)) return null;
  return { value, unit, basisAmount, basisUnit };
}

// 가드 parseServing 이 못 읽는 단위(개·매·스푼·젤리·필름) 포함 자체 파서.
const SERVE_UNIT = '(?:연질캡슐|경질캡슐|캡슐|캅셀|정|포|스틱|병|필름|매|개|젤리|구미|스푼|스쿱|알|봉|편|환|팩)';
function parseServingUnit(srv: string): { count: number | null; unit: string | null } {
  const s = normalizeSource(srv);
  const m = s.match(new RegExp(`1회에?\\s*([\\d]+)\\s*${SERVE_UNIT}`))
    ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}(?:씩|을|를|\\(|,|\\s)`))
    ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}`));
  if (!m) return { count: null, unit: null };
  const um = m[0].match(new RegExp(SERVE_UNIT));
  return { count: parseInt(m[1], 10), unit: um ? um[0] : null };
}

function servingUnitType(name: string, sungsang: string, srv: string, unit: string | null): string {
  const t = `${sungsang} ${srv} ${name}`;
  if (/젤리|구미|gummy/i.test(t) || unit === '젤리' || unit === '구미') return 'gummy';
  if (/필름/.test(t) || unit === '매') return 'film';
  if (/연질캡슐|소프트캡슐|softgel/i.test(t)) return 'softgel';
  if (/츄[어정]|씹/.test(srv) || /츄[어정]/.test(t)) return 'chewable';
  if (/캡슐|캅셀/.test(t) || unit === '캡슐' || unit === '캅셀') return 'capsule';
  if (/분말|과립|스틱|스푼/.test(t) || unit === '포' || unit === '스틱' || unit === '스푼' || unit === '스쿱') return 'powder';
  if (/정제|타블렛/.test(t) || unit === '정') return 'tablet';
  return 'tablet';
}

// ─────────────────────────────────────────────────────────────────────────────
interface RawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; DISTB_PD?: string; SUNGSANG?: string; SRV_USE?: string; PRSRV_PD?: string; INTAKE_HINT1?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }

const counts: Record<string, number> = {};
const bump = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };
const eligible: Seed[] = [];
const holds: Array<{ statementNo: string; productName: string; holdCode: HoldCode; reason: string }> = [];
const seenStmt = new Set<string>();
let totalRows = 0;

const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim();
  if (!l) continue;
  let obj: RawItem;
  try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it: RawItem = obj.item ?? obj; // fetch 메타 래핑 관대
  totalRows++;
  {
  const name = (it.PRDUCT ?? '').trim();
  const stmt = (it.STTEMNT_NO ?? '').trim();
  const mf = normalizeSource(it.MAIN_FNCTN ?? '');
  const base = it.BASE_STANDARD ?? '';
  const srv = it.SRV_USE ?? '';
  const sungsang = it.SUNGSANG ?? '';

  // 비타민 D 기능성 여부
  if (!/비타민\s?D/.test(mf) && !/비타민\s?D/.test(normalizeSource(base))) { bump('NOT_VD'); continue; }
  bump('vd_mention');

  if (!stmt) { bump('NO_STMT'); continue; }
  if (USED_20.has(stmt)) { bump('USED'); continue; }
  if (seenStmt.has(stmt)) { bump('DUP'); continue; }
  seenStmt.add(stmt);

  // 복합
  if (isMultiFunctional(base, it.MAIN_FNCTN ?? '')) { bump('HOLD_MULTI'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_MULTI_FUNCTIONAL', reason: '비-VD 기능성 원료 존재(표시량/브래킷/MAIN_FNCTN/CFU)' }); continue; }
  // 벌크
  const bulk = isBulkMaterial(srv);
  if (bulk.bulk) { bump('BULK'); holds.push({ statementNo: stmt, productName: name, holdCode: 'BULK', reason: bulk.reason }); continue; }
  // 수출전용 — 국내 매장 소비자 대상 아님
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export|export\s*only/i.test(`${name} ${srv} ${sungsang}`)) { bump('HOLD_EXPORT_ONLY'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_EXPORT_ONLY', reason: '수출전용' }); continue; }
  // 액상/드롭
  if (isLiquidDrop(name, sungsang, srv)) { bump('HOLD_UNSUPPORTED'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_UNSUPPORTED_DIMENSION', reason: '액상·드롭·mL 기반' }); continue; }

  // grounding: declaredAmount
  const declared = extractVdDeclared(base);
  if (!declared) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '비타민D 표시량 추출 실패' }); continue; }

  // 원문 이상: parseBasis ABNORMAL, 또는 declared basis 와 parseBasis 불일치.
  // ⚠️ 가드 PRE-SRC-BASIS 가 parseBasis 로 교차검증하므로, 가드가 PARSED 하지 못하면(ABSENT/PARSE_FAILED)
  //    정상 제품이 REVIEW 로 뜬다. 적격 조건 = parseBasis PARSED + 내 추출값과 일치.
  const pb = parseBasis(base);
  if (pb.kind === 'ABNORMAL') { bump('HOLD_SOURCE_ABNORMAL'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_SOURCE_ABNORMAL', reason: pb.reason }); continue; }
  if (pb.kind !== 'PARSED') { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: `가드 parseBasis ${pb.kind}` }); continue; }
  const declBasisMg = declared.basisUnit === 'g' ? declared.basisAmount * 1000 : declared.basisAmount;
  const pbMg = pb.value.unit === 'g' ? pb.value.amount * 1000 : pb.value.amount;
  if (Math.abs(declBasisMg - pbMg) > Math.max(1, pbMg * 1e-6)) {
    bump('HOLD_DATA_CONFLICT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_DATA_CONFLICT', reason: `기준량 불일치 declared ${declBasisMg}mg vs parse ${pbMg}mg` }); continue;
  }

  // serving — 자체 파서(개·매·스푼 등 포함) + 가드 parseServing(횟수). 둘 다 못 읽으면 HOLD_GROUNDING.
  const ps = parseServing(srv);
  const myUnit = parseServingUnit(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  if (myUnit.count == null && perDay == null) {
    bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '섭취 단위·횟수 파싱 실패' }); continue;
  }
  const uType = servingUnitType(name, sungsang, srv, myUnit.unit);
  const serving = { unitType: uType, unitWeight: null, unitWeightUnit: null, unitsPerServing: myUnit.count, servingTotalWeight: ps.kind === 'PARSED' ? ps.value.servingTotal : null, servingTotalWeightUnit: ps.kind === 'PARSED' ? ps.value.servingTotalUnit : null, servingsPerDay: perDay, servingsPerDayMax: ps.kind === 'PARSED' ? ps.value.servingsPerDayMax : null };

  // CFU 토큰 존재(세균수 등) → 가드 REVIEW 유발 가능 신호
  const cfu = parseCfu(base);
  const hasCfuToken = cfu.kind !== 'ABSENT';

  // 연령별 섭취량 원문 유무
  const ageBands = /[0-9]+\s*(세|개월)\s*(이상|미만|이하|~|-)/.test(normalizeSource(srv));
  const multiDaily = (serving.servingsPerDay ?? 1) > 1 || (serving.servingsPerDayMax ?? 0) > 1;
  const waterInSource = /물|음용수/.test(normalizeSource(srv)) && !/물\s*없이/.test(normalizeSource(srv));
  const chew = /씹어/.test(normalizeSource(srv));
  const melt = /녹여|녹인|입에서/.test(normalizeSource(srv));

  // 표시량 규격 비율 (80~180% 등) — 원문에서 추출, 없으면 VD 표준 80~180%
  const nb = normalizeSource(base);
  const RATIO_N = String.raw`[\d]+(?:\.[\d]+)?\s*[~\-∼]\s*[\d]+(?:\.[\d]+)?`;
  const ratioM = nb.match(new RegExp(String.raw`표시량[^)]*\)\s*의\s*(${RATIO_N})\s*%`)) ?? nb.match(new RegExp(String.raw`(${RATIO_N})\s*%`));
  const ratio = ratioM ? `${ratioM[1].replace(/\s/g, '').replace(/[∼-]/g, '~').replace(/\.0+(?=~|$)/g, '')}%` : '80~180%';
  const hasColiform = /대장균군\s*[:：]?\s*음성/.test(nb);
  const directGrounded = /그대로|직접|털어서/.test(normalizeSource(srv)) && !waterInSource;

  eligible.push({
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(),
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    grounding: { declaredAmount: declared, serving, calculationAllowed: false, ageBandsRaw: ageBands ? normalizeSource(srv) : null },
    compose: { servingUnitKo: myUnit.unit ? (/(연질|경질)?캡슐|캅셀/.test(myUnit.unit) ? '캡슐' : myUnit.unit) : null, ratio, hasColiform, directGrounded },
    flags: { hasIU: declared.unit === 'IU', hasCfuToken, osteoporosis: /골다공증/.test(mf), ageBands, multiDaily, waterInSource, chew, melt },
  });
  bump('ELIGIBLE');
  }
}

fs.writeFileSync(`${OUT_DIR}/vd-pool.json`, JSON.stringify(eligible, null, 1));
fs.writeFileSync(`${OUT_DIR}/vd-hold.json`, JSON.stringify(holds, null, 1));

console.log('═══ 비타민 D 단일형 대상 풀 선정 ═══\n');
console.log(`raw 총 레코드         ${totalRows}`);
console.log(`비타민 D 언급         ${counts['vd_mention'] ?? 0}`);
console.log(`─────────────────────────────`);
console.log(`✅ ELIGIBLE(적격)     ${counts['ELIGIBLE'] ?? 0}`);
console.log(`   USED(기존 20)      ${counts['USED'] ?? 0}`);
console.log(`   DUP(신고번호 중복)  ${counts['DUP'] ?? 0}`);
console.log(`   HOLD_MULTI(복합)   ${counts['HOLD_MULTI'] ?? 0}`);
console.log(`   HOLD_UNSUPPORTED(액상) ${counts['HOLD_UNSUPPORTED'] ?? 0}`);
console.log(`   HOLD_GROUNDING     ${counts['HOLD_GROUNDING'] ?? 0}`);
console.log(`   HOLD_SOURCE_ABNORMAL ${counts['HOLD_SOURCE_ABNORMAL'] ?? 0}`);
console.log(`   HOLD_DATA_CONFLICT ${counts['HOLD_DATA_CONFLICT'] ?? 0}`);
console.log(`   HOLD_EXPORT_ONLY   ${counts['HOLD_EXPORT_ONLY'] ?? 0}`);
console.log(`   BULK               ${counts['BULK'] ?? 0}`);
console.log(`   NO_STMT            ${counts['NO_STMT'] ?? 0}`);
console.log(`─────────────────────────────`);

const el = eligible;
const iu = el.filter((x) => x.flags.hasIU).length;
const cfuTok = el.filter((x) => x.flags.hasCfuToken).length;
const osteo = el.filter((x) => x.flags.osteoporosis).length;
const age = el.filter((x) => x.flags.ageBands).length;
const md = el.filter((x) => x.flags.multiDaily).length;
const noWater = el.filter((x) => !x.flags.waterInSource).length;
const noServing = el.filter((x) => x.grounding.serving?.unitsPerServing == null).length;
console.log(`적격 내 신호: IU ${iu} · CFU토큰 ${cfuTok} · 골다공증 ${osteo} · 연령별 ${age} · 다회섭취 ${md} · 물근거없음 ${noWater} · 섭취단위 미파싱 ${noServing}`);
console.log(`단위 분포:`, JSON.stringify(el.reduce((a: Record<string, number>, x) => { const u = x.grounding.declaredAmount!.unit; a[u] = (a[u] ?? 0) + 1; return a; }, {})));
console.log(`제형 분포:`, JSON.stringify(el.reduce((a: Record<string, number>, x) => { const u = x.grounding.serving!.unitType; a[u] = (a[u] ?? 0) + 1; return a; }, {})));
console.log(`\n샘플 8:`);
el.slice(0, 8).forEach((x) => console.log(`  ${x.grounding.declaredAmount!.value}${x.grounding.declaredAmount!.unit}/${x.grounding.declaredAmount!.basisAmount}${x.grounding.declaredAmount!.basisUnit} · ${x.grounding.serving!.unitType} · ${x.productName.slice(0, 28)}`));
console.log(`\n→ ${OUT_DIR}/vd-pool.json (${eligible.length}) · vd-hold.json (${holds.length})`);
