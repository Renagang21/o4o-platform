/**
 * HFF MX(4+원료) 복합형 조합 인벤토리 — DB source, read-only, DB write 0.
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-mx-inventory.ts --min 4 --out <path>
 *
 * WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1 §3.1.
 * 각 제품의 기능성 스펙 라벨 집합을 분류 → 크기 ≥min 조합 키(정렬)별 집계. 고형·비수출·비벌크.
 * combo-inventory 의 분류(CLS/SPEC)를 DB source(전량 fetch)로 이식. write 0.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { resolveSource, type HffRawItem } from './hff-raw-source.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const MIN = parseInt(arg('min', '4'), 10); const OUT = arg('out');

const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|엽록소/;
const CLS: Array<{ k: string; re: RegExp }> = [
  { k: '비타민C', re: /비타민\s?C\b/i }, { k: '비타민D', re: /비타민\s?D\b/i }, { k: '비타민B12', re: /비타민\s?B\s?12|코발라민/i },
  { k: '비타민B6', re: /비타민\s?B\s?6|피리독/i }, { k: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i }, { k: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { k: '비타민A', re: /비타민\s?A\b|레티놀|베타카로/i }, { k: '비타민E', re: /비타민\s?E\b|토코페롤/i }, { k: '비타민K', re: /비타민\s?K\b|메나퀴논/i },
  { k: '엽산', re: /엽산|폴[레리]?산/i }, { k: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i }, { k: '판토텐산', re: /판토텐/i }, { k: '비오틴', re: /비오틴|바이오틴/i },
  { k: '아연', re: /아연/i }, { k: '마그네슘', re: /마그네슘/i }, { k: '철', re: /철분|헴철|철\s*[:：(]|피로인산철|푸마르산철/i }, { k: '칼슘', re: /칼슘/i },
  { k: '셀레늄', re: /셀레늄|셀렌/i }, { k: '구리', re: /구리/i }, { k: '망간', re: /망간/i }, { k: '크롬', re: /크[로롬]/i }, { k: '몰리브덴', re: /몰리브/i }, { k: '요오드', re: /요오드|아이오딘/i },
  { k: '오메가3', re: /EPA|DHA|정제어유/i }, { k: '루테인', re: /루테인|지아잔틴|황반/i }, { k: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스/i },
  { k: '쏘팔메토', re: /쏘팔메토|소팔메토/i }, { k: 'MSM', re: /MSM|엠에스엠|메틸설포닐|디메틸설폰/i }, { k: '코엔자임Q10', re: /코엔자임|코큐텐|Q10|유비퀴논/i },
  { k: '감마리놀렌산', re: /감마리놀렌|달맞이꽃|보라지/i }, { k: '은행잎', re: /은행잎|플라보놀/i }, { k: '프로폴리스', re: /프로폴리스|총\s*플라보노이드/i },
  { k: '가르시니아', re: /가르시니아|hydroxycitric|HCA/i }, { k: '글루코사민', re: /글루코사민/i }, { k: '콘드로이친', re: /콘드로이[친틴]/i },
  { k: '식이섬유', re: /식이섬유|차전자|난소화성말토덱스트린|귀리|이눌린|프락토올리고/i }, { k: '대두이소플라본', re: /이소플라본|대두배아/i },
  { k: '테아닌', re: /테아닌/i }, { k: '녹차', re: /녹차|카테킨|EGCG/i }, { k: '옥타코사놀', re: /옥타코사놀/i }, { k: '베타글루칸', re: /베타글루칸/i }, { k: '홍국', re: /홍국|모나콜린/i },
];
const classify = (l: string): string | null => { for (const c of CLS) if (c.re.test(l)) return c.k; return null; };
const SPEC = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU|억|CFU)\s*\)?\s*(?:\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*)?(?:의\s*[\d.]+\s*[~∼-]\s*[\d.]+\s*%|이상|표시량)/gi;

const combos: Record<string, number> = {};
let total = 0;
const byN: Record<number, number> = {};
const src = resolveSource(process.argv, process.env, undefined); // 전량 fetch (prefilter 없음)
for await (const it of src.gen as AsyncGenerator<HffRawItem>) {
  total++;
  const base = normalizeSource(it.BASE_STANDARD ?? ''); const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? '';
  const set = new Set<string>(); let unknown = 0; let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(base)) !== null) { const lbl = m[1].trim(); if (NONFUNC.test(lbl)) continue; const k = classify(lbl); if (k) set.add(k); else unknown++; }
  if (set.size < MIN || unknown > 0) continue;
  if (/액상|드롭|시럽|앰플|스포이드|농축액/.test(`${name} ${sungsang}`) || /\bmL\b|㎖/.test(sungsang)) continue;
  if (isBulkMaterial(srv).bulk) continue;
  if (/전량\s*수출|수출\s*전용|수출용/.test(`${name} ${srv}`)) continue;
  byN[set.size] = (byN[set.size] ?? 0) + 1;
  const key = [...set].sort().join(' + ');
  combos[key] = (combos[key] ?? 0) + 1;
}
const sorted = Object.entries(combos).sort((a, b) => b[1] - a[1]);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(sorted), null, 1));
console.log('JSON_MX_BEGIN');
console.log(JSON.stringify({ scanned: total, minIngredients: MIN, byIngredientCount: byN, comboTypes: sorted.length, top30: sorted.slice(0, 30).map(([k, c]) => ({ combo: k, n: k.split(' + ').length, count: c })) }, null, 1));
console.log('JSON_MX_END');
