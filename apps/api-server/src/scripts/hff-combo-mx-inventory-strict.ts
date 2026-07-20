/**
 * HFF higher-N(5~8원료) 복합형 조합 STRICT 인벤토리 — DB source, read-only, DB write 0.
 *   PROXY_PORT=5442 DB_USERNAME=... DB_PASSWORD=... DB_NAME=... \
 *     npx tsx src/scripts/hff-combo-mx-inventory-strict.ts --lo 5 --hi 8 --out <path>
 *
 * WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1 §6.
 * mx-inventory 의 loose SPEC(억/CFU 허용·basis 옵션)은 고-N 조합을 과대집계한다(§5 주의).
 * 본 스크립트는 hff-combo-select 의 **엄격 SPEC**(value unit / basis unit + %|이상, basis 필수)과
 * **동일 CLS(classify)** 를 그대로 이식하여, select 가 실제로 인정할 full-set(정확 조합)을 예측한다.
 * unknown(미분류 엄격스펙)>0 제품은 select 에서 HOLD_MULTI/attribution 불명확 → clean 그룹에서 제외하되 집계.
 * 고형·비수출·비벌크·비액상만. write 0.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { resolveSource, type HffRawItem } from './hff-raw-source.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const LO = parseInt(arg('lo', '5'), 10);
const HI = parseInt(arg('hi', '8'), 10);
const OUT = arg('out');

// ── select 와 동일한 NONFUNC / CLS / 엄격 SPEC (drift 금지: hff-combo-select.ts 와 1:1) ──
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
const classify = (label: string): string | null => { for (const c of CLS) if (c.re.test(label)) return c.k; return null; };
// select 의 엄격 SPEC: 반드시 "value unit / basis unit" + (의 X~Y% | 이상)
const SPEC = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU)\s*(?:RE|α-?TE|NE|DFE)?\s*\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*(?:의\s*[\d.]+\s*[~∼\-]\s*[\d.]+\s*%|이상)/gi;

function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`;
  if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true;
  if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true;
  return false;
}

interface Group { count: number; realBasis: number; shelfOnly: number; stmts: string[] }
const clean: Record<string, Group> = {};           // set.size in [LO,HI], unknown==0
const byNClean: Record<number, number> = {};        // clean 제품 수 (원료 수별)
const byNUnknown: Record<number, number> = {};      // set.size in [LO,HI] 이지만 unknown>0 (attribution 불명확)
let scanned = 0, solidDrop = 0;

const src = resolveSource(process.argv, process.env, undefined); // 전량 fetch (prefilter 없음)
for await (const it of src.gen as AsyncGenerator<HffRawItem>) {
  scanned++;
  const base = normalizeSource(it.BASE_STANDARD ?? '');
  const name = (it.PRDUCT ?? '').trim();
  const srv = it.SRV_USE ?? '';
  const sungsang = it.SUNGSANG ?? '';
  const stmt = (it.STTEMNT_NO ?? '').trim();

  const set = new Set<string>();
  let unknown = 0, realBasis = true;
  let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(base)) !== null) {
    const lbl = m[1].trim();
    if (NONFUNC.test(lbl)) continue;
    const k = classify(lbl);
    if (k) { if (!set.has(k)) { set.add(k); if (!/의\s*[\d.]+\s*[~∼\-]\s*[\d.]+\s*%/.test(m[0])) realBasis = false; } }
    else unknown++;
  }
  if (set.size < LO || set.size > HI) continue;

  // 제형/수출/벌크 필터 (select 와 동일 기준)
  if (isLiquidDrop(name, sungsang, srv)) { solidDrop++; continue; }
  if (isBulkMaterial(srv).bulk) { solidDrop++; continue; }
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { solidDrop++; continue; }

  if (unknown > 0) { byNUnknown[set.size] = (byNUnknown[set.size] ?? 0) + 1; continue; }

  byNClean[set.size] = (byNClean[set.size] ?? 0) + 1;
  const key = [...set].sort().join(' + ');
  const g = (clean[key] ??= { count: 0, realBasis: 0, shelfOnly: 0, stmts: [] });
  g.count++;
  if (realBasis) g.realBasis++; else g.shelfOnly++;
  if (g.stmts.length < 50 && stmt) g.stmts.push(stmt);
}

const sorted = Object.entries(clean).sort((a, b) => b[1].count - a[1].count);
const out = {
  scanned,
  range: [LO, HI],
  byIngredientCountClean: byNClean,
  byIngredientCountUnknownDropped: byNUnknown,
  solidExportBulkDropped: solidDrop,
  cleanComboTypes: sorted.length,
  cleanCandidateTotal: Object.values(byNClean).reduce((a, b) => a + b, 0),
  topGroups: sorted.slice(0, 40).map(([k, v]) => ({ combo: k, n: k.split(' + ').length, count: v.count, realBasis: v.realBasis, shelfOnly: v.shelfOnly })),
};
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ ...out, groupsFull: sorted.map(([k, v]) => ({ combo: k, n: k.split(' + ').length, count: v.count, realBasis: v.realBasis, shelfOnly: v.shelfOnly, sampleStmts: v.stmts })) }, null, 1));
console.log('JSON_MXSTRICT_BEGIN');
console.log(JSON.stringify(out, null, 1));
console.log('JSON_MXSTRICT_END');
