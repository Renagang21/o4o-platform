/**
 * HFF M2/M3 복합형 — 조합별 대상 풀 선정 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-combo-select.ts --combo "비타민D,아연" --out <path>
 *
 * WO-...-LARGE-FUNCTION-GROUPS-...-V1 PART B §5
 * 제품 스펙 집합 == 지정 조합(정확히). 원료별 표시량·기능성 **독립 추출**(수치·기능성 혼입 0).
 * 기능성 귀속 = INGREDIENT_FN(원료 공식 기능성 집합) 매칭. 부원료/미귀속 기능성 → HOLD.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, fnBelongsTo } from './hff-nutrient-registry.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const COMBO = arg('combo'); const OUT = arg('out');
if (!COMBO || !OUT) throw new Error('--combo "A,B" --out 필요');
const TARGET = COMBO.split(/[,+]/).map((x) => x.trim());
const metaOf = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
for (const k of TARGET) if (!metaOf(k)) throw new Error(`미지원 원료: ${k}`);
const TARGET_SET = [...TARGET].sort().join('|');

const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|엽록소/;
const CLS: Array<{ k: string; re: RegExp }> = [
  { k: '비타민C', re: /비타민\s?C\b/i }, { k: '비타민D', re: /비타민\s?D\b/i }, { k: '비타민B12', re: /비타민\s?B\s?12|코발라민/i },
  { k: '비타민B6', re: /비타민\s?B\s?6|피리독/i }, { k: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i }, { k: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { k: '비타민A', re: /비타민\s?A\b|레티놀|베타카로/i }, { k: '비타민E', re: /비타민\s?E\b|토코페롤/i }, { k: '비타민K', re: /비타민\s?K\b|메나퀴논/i },
  { k: '엽산', re: /엽산|폴[레리]?산/i }, { k: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i }, { k: '판토텐산', re: /판토텐/i }, { k: '비오틴', re: /비오틴|바이오틴/i },
  { k: '아연', re: /아연/i }, { k: '마그네슘', re: /마그네슘/i }, { k: '철', re: /철분|헴철|철\s*[:：(]|피로인산철|푸마르산철/i }, { k: '칼슘', re: /칼슘/i },
  { k: '셀레늄', re: /셀레늄|셀렌/i }, { k: '구리', re: /구리/i }, { k: '망간', re: /망간/i }, { k: '크롬', re: /크[로롬]/i }, { k: '몰리브덴', re: /몰리브/i }, { k: '요오드', re: /요오드|아이오딘/i },
  { k: '오메가3', re: /EPA|DHA|정제어유/i }, { k: '루테인', re: /루테인|지아잔틴|황반/i }, { k: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스/i },
  { k: 'MSM', re: /MSM|엠에스엠|메틸설포닐|디메틸설폰/i }, { k: '코엔자임Q10', re: /코엔자임|코큐텐|Q10|유비퀴논/i }, { k: '가르시니아', re: /가르시니아|hydroxycitric|HCA/i },
  { k: '글루코사민', re: /글루코사민/i }, { k: '식이섬유', re: /식이섬유|차전자|난소화성말토덱스트린|귀리|이눌린|프락토올리고/i }, { k: '옥타코사놀', re: /옥타코사놀/i }, { k: '프로폴리스', re: /프로폴리스|총\s*플라보노이드/i },
];
function classify(label: string): string | null { for (const c of CLS) if (c.re.test(label)) return c.k; return null; }

const SPEC = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*(?:의\s*[\d.]+\s*[~∼\-]\s*[\d.]+\s*%|이상)/gi;
function extractSpecs(base: string): { byKey: Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string }>; unknown: number; nonTarget: boolean } {
  const b = normalizeSource(base); const byKey = new Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string }>(); let unknown = 0; let nonTarget = false;
  const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(㎍|mcg|ug|μg)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; return x.toLowerCase() === 'g' ? 'g' : 'mg'; };
  const numOf = (s: string) => parseFloat(s.replace(/,/g, ''));
  let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(b)) !== null) {
    const label = m[1].trim(); if (NONFUNC.test(label)) continue;
    const k = classify(label); if (!k) { unknown++; continue; }
    if (!TARGET.includes(k)) { nonTarget = true; continue; }
    if (byKey.has(k)) continue;
    const ratioM = m[0].match(/([\d.]+\s*[~∼\-]\s*[\d.]+)\s*%/);
    byKey.set(k, { value: numOf(m[2]), unit: uNorm(m[3]), basisAmount: numOf(m[4]), basisUnit: uNorm(m[5]), ratio: ratioM ? `${ratioM[1].replace(/\s/g, '').replace(/[∼\-]/g, '~')}%` : '표시량 이상' });
  }
  return { byKey, unknown, nonTarget };
}

function extractFunctions(mainFn: string): string[] {
  let t = normalizeSource(mainFn); t = t.replace(/\[[^\]]*\]/g, ' ');
  return [...new Set(t.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|\((?:가|나|다|라|마|바|사|\d+)\)|(?:^|\s)\d+[).]|(?<=필요|있음|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\s*[.,。、/]?\s+(?=[가-힣])/)
    .map((x) => x.trim().replace(/^[-•*\s:：·]+/, '').replace(/[.。]+$/, '').replace(/^[가-힣A-Za-z0-9()\-]{2,25}\s*[:：]\s*(?=.*(도움|개선|필요|유지|억제|완화|증진|보호))/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성|합성/.test(x)))];
}
const SERVE_UNIT = '(?:연질캡슐|경질캡슐|캡슐|캅셀|정|포|스틱|병|필름|매|개|젤리|구미|스푼|스쿱|알|봉|편|환|팩)';
function parseServingUnit(srv: string): { count: number | null; unit: string | null } {
  const s = normalizeSource(srv);
  const m = s.match(new RegExp(`1회에?\\s*([\\d]+)\\s*${SERVE_UNIT}`)) ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}(?:씩|을|를|\\(|,|\\s)`)) ?? s.match(new RegExp(`([\\d]+)\\s*${SERVE_UNIT}`));
  if (!m) return { count: null, unit: null }; const um = m[0].match(new RegExp(SERVE_UNIT)); return { count: parseInt(m[1], 10), unit: um ? um[0] : null };
}
function servingUnitType(name: string, sungsang: string, srv: string, unit: string | null): string {
  const t = `${sungsang} ${srv} ${name}`;
  if (/젤리|구미/i.test(t) || unit === '젤리' || unit === '구미') return 'gummy'; if (/필름/.test(t) || unit === '매') return 'film';
  if (/연질캡슐|소프트캡슐/i.test(t)) return 'softgel'; if (/츄[어정]|씹/.test(srv)) return 'chewable';
  if (/캡슐|캅셀/.test(t) || unit === '캡슐' || unit === '캅셀') return 'capsule'; if (/분말|과립|스틱|스푼/.test(t) || unit === '포' || unit === '스틱' || unit === '스푼') return 'powder'; return 'tablet';
}
function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`; if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true; if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true; return false;
}

interface RawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; DISTB_PD?: string; SUNGSANG?: string; SRV_USE?: string; PRSRV_PD?: string; INTAKE_HINT1?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }
const counts: Record<string, number> = {}; const bump = (k: string) => { counts[k] = (counts[k] ?? 0) + 1; };
const eligible: unknown[] = []; const holds: Array<{ statementNo: string; productName: string; holdCode: string; reason: string }> = []; const seen = new Set<string>();

const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue; let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj;
  const base = it.BASE_STANDARD ?? ''; const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? ''; const stmt = (it.STTEMNT_NO ?? '').trim();
  const { byKey, unknown, nonTarget } = extractSpecs(base);
  const keys = [...byKey.keys()].sort().join('|');
  if (keys !== TARGET_SET) continue; // 스펙 집합이 정확히 조합과 일치해야
  bump('mention');
  if (nonTarget || unknown > 0) { bump('HOLD_MULTI'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_MULTI_FUNCTIONAL', reason: '추가 기능성 원료/미분류 스펙' }); continue; }
  if (!stmt || seen.has(stmt)) { bump('DUP'); continue; } seen.add(stmt);
  if (/[0-9][0-9,.]*\s*[조억만천]/.test(name)) { bump('HOLD_IDENTITY'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_IDENTITY', reason: '제품명 수량 스케일어' }); continue; }
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { bump('EXPORT'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_EXPORT_ONLY', reason: '수출전용' }); continue; }
  if (isLiquidDrop(name, sungsang, srv)) { bump('HOLD_UNSUPPORTED'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_UNSUPPORTED_DIMENSION', reason: '액상·mL·겔' }); continue; }
  if (isBulkMaterial(srv).bulk) { bump('BULK'); holds.push({ statementNo: stmt, productName: name, holdCode: 'BULK', reason: 'bulk' }); continue; }
  // 원료별 declaredAmount 검증 (ratio 확정)
  let badAmt = false; for (const k of TARGET) { const a = byKey.get(k)!; if (!a || a.ratio === '표시량 이상' || !(a.value > 0) || !(a.basisAmount > 0)) badAmt = true; }
  if (badAmt) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '원료 표시량/비율 추출 실패' }); continue; }
  // 기능성 귀속
  const allFns = extractFunctions(it.MAIN_FNCTN ?? '');
  const ingredients: Array<{ key: string; labelKo: string; labelEn: string; declaredAmount: unknown; functionsKo: string[]; functionsEn: string[] }> = [];
  let attrFail = false; const attributed = new Set<string>();
  for (const k of TARGET) {
    const fk = allFns.filter((f) => fnBelongsTo(f, k)); fk.forEach((f) => attributed.add(f));
    const fe = fk.map((f) => mapFunctionEn(f));
    if (fk.length === 0 || fe.some((e) => e == null)) { attrFail = true; break; }
    ingredients.push({ key: k, labelKo: metaOf(k).displayKo, labelEn: metaOf(k).displayEn, declaredAmount: byKey.get(k)!, functionsKo: [...new Set(fk)], functionsEn: [...new Set(fe as string[])] });
  }
  const unattributed = allFns.filter((f) => !attributed.has(f));
  if (attrFail || unattributed.length > 0) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: attrFail ? '원료 기능성 귀속/매핑 실패' : `부원료/미귀속 기능성: ${unattributed.slice(0, 2).join('|').slice(0, 40)}` }); continue; }
  // serving
  const ps = parseServing(srv); const myUnit = parseServingUnit(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  if (myUnit.count == null && perDay == null) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '섭취 파싱 실패' }); continue; }
  const waterInSource = /물|음용수/.test(normalizeSource(srv)) && !/물\s*없이/.test(normalizeSource(srv));
  eligible.push({
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(), ingredients,
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    serving: { unitType: servingUnitType(name, sungsang, srv, myUnit.unit), servingUnitKo: myUnit.unit ? (/(연질|경질)?캡슐|캅셀/.test(myUnit.unit) ? '캡슐' : myUnit.unit) : null, unitsPerServing: myUnit.count, servingsPerDay: perDay },
    compose: { hasColiform: /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base)), directGrounded: /그대로|직접|털어서/.test(normalizeSource(srv)) && !waterInSource },
    flags: { waterInSource, chew: /씹어/.test(normalizeSource(srv)), melt: /녹여|녹인|입에서/.test(normalizeSource(srv)) },
  });
  bump('ELIGIBLE');
}
fs.writeFileSync(OUT, JSON.stringify(eligible, null, 1));
fs.writeFileSync(OUT.replace(/\.json$/, '.hold.json'), JSON.stringify(holds, null, 1));
console.log(`═══ ${COMBO} 복합형 선정 ═══`);
console.log(`mention ${counts['mention'] ?? 0} · ELIGIBLE ${counts['ELIGIBLE'] ?? 0} · HOLD_MULTI ${counts['HOLD_MULTI'] ?? 0} · 액상 ${counts['HOLD_UNSUPPORTED'] ?? 0} · 벌크 ${counts['BULK'] ?? 0} · 수출 ${counts['EXPORT'] ?? 0} · grounding ${counts['HOLD_GROUNDING'] ?? 0} · 정체 ${counts['HOLD_IDENTITY'] ?? 0}`);
console.log(`→ ${OUT} (${eligible.length}) · hold (${holds.length})`);
