/**
 * HFF 2~3원료 복합형(M2/M3) 조합 인벤토리 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-combo-inventory.ts
 *
 * WO-...-LARGE-FUNCTION-GROUPS-...-V1 PART B §9
 * 제품의 기능성 원료 스펙 집합(비타민·미네랄 표시량 + 기능성원료 지표성분 ratio)을 분류해
 * 조합 키(정렬 집합)별로 M2(2)·M3(3)·MX(≥4) 집계. 고형·비수출·비벌크만. 산출: scratchpad/combo-inventory.json.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';

const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|엽록소/;
// 영양소·기능성 원료 통합 분류 (구체적 우선)
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
function classify(label: string): string | null { for (const c of CLS) if (c.re.test(label)) return c.k; return null; }

// 스펙(비타민 표시량 or 기능성 지표성분 ratio) 라벨 집합
const SPEC = /([가-힣A-Za-z0-9()\-·]{2,22}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU|억|CFU)\s*\)?\s*(?:\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*)?(?:의\s*[\d.]+\s*[~∼-]\s*[\d.]+\s*%|이상|표시량)/gi;

interface RawItem { PRDUCT?: string; STTEMNT_NO?: string; SUNGSANG?: string; SRV_USE?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }
const combos: Record<string, { count: number; stmts: string[] }> = {};
let total = 0, m2 = 0, m3 = 0, mx = 0, single = 0;
const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue;
  let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj; total++;
  const base = normalizeSource(it.BASE_STANDARD ?? ''); const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? '';
  const set = new Set<string>(); let unknown = 0; let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(base)) !== null) { const lbl = m[1].trim(); if (NONFUNC.test(lbl)) continue; const k = classify(lbl); if (k) set.add(k); else unknown++; }
  if (set.size <= 1) { if (set.size === 1) single++; continue; }
  if (unknown > 0) continue; // 미분류 스펙 있으면 조합 확정 불가
  // 제형 필터
  if (/액상|드롭|시럽|앰플|스포이드|농축액/.test(`${name} ${sungsang}`) || /\bmL\b|㎖/.test(sungsang)) continue;
  if (isBulkMaterial(srv).bulk) continue;
  if (/전량\s*수출|수출\s*전용|수출용/.test(`${name} ${srv}`)) continue;
  if (set.size >= 4) { mx++; continue; }
  if (set.size === 2) m2++; else m3++;
  const key = [...set].sort().join(' + ');
  (combos[key] ??= { count: 0, stmts: [] }); combos[key].count++;
  if (combos[key].stmts.length < 2000) { const s = (it.STTEMNT_NO ?? '').trim(); if (s) combos[key].stmts.push(s); }
}
const sorted = Object.entries(combos).sort((a, b) => b[1].count - a[1].count);
fs.writeFileSync(`${OUT}/combo-inventory.json`, JSON.stringify(Object.fromEntries(sorted.map(([k, v]) => [k, v])), null, 1));
console.log('═══ HFF 2~3원료 복합형(M2/M3) 조합 인벤토리 ═══\n');
console.log(`raw ${total} · 단일(1스펙) ${single} · M2 ${m2} · M3 ${m3} · MX(≥4,제외) ${mx}\n`);
console.log('상위 조합(고형·비수출·비벌크, 스펙 전부 분류된 것):');
console.log('조합                                     제품수  원료수');
for (const [k, v] of sorted.slice(0, 30)) { const n = k.split(' + ').length; console.log(`${k.padEnd(40)} ${String(v.count).padStart(5)}   ${n}`); }
console.log(`\n→ ${OUT}/combo-inventory.json (조합 ${sorted.length})`);
