/**
 * HFF 대규모 단일 기능성 원료 그룹 인벤토리 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-function-inventory.ts
 *
 * WO-O4O-HFF-LARGE-FUNCTION-GROUPS-...-V1 §4
 * 기능성 원료 스펙 = BASE_STANDARD 의 "라벨 : N unit/basis 의 N~M%" 또는 "라벨 표시량(N/basis)".
 * (중금속·품질 스펙은 "이하"라 제외.) 단일 기능성 = 그런 스펙이 **정확히 1개**. 그 라벨=기능성 원료.
 * 비타민·미네랄 19그룹+VC+VD 는 완료 → 별도 표기. 산출: scratchpad/function-inventory.json.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';

// 비-기능성 스펙 라벨(제외) — 성상·중금속·품질
const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|위생지표|미생물|이산화황|벤조피렌|3-MCPD/;

// 완료된 비타민·미네랄 (별도 카운트)
const DONE_VM = /비타민\s?[A-EK]|비타민\s?B|아연|마그네슘|칼슘|철|엽산|셀레늄|셀렌|나이아신|판토텐|비오틴|구리|망간|크롬|몰리브|요오드|토코페롤|레티놀/i;

// 기능성 원료 canonical 분류
const FUNC: Array<{ key: string; re: RegExp }> = [
  { key: '오메가3', re: /EPA|DHA|오메가|중성지질|정제어유|오메가-?3/i },
  { key: '루테인', re: /루테인|지아잔틴|황반/i },
  { key: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스|흰무늬엉겅퀴/i },
  { key: '쏘팔메토', re: /쏘팔메토|소팔메토|전립선/i },
  { key: 'MSM', re: /MSM|엠에스엠|메틸설포닐메탄|디메틸설폰|식이유황/i },
  { key: '코엔자임Q10', re: /코엔자임|코큐텐|Q10|유비퀴논/i },
  { key: '감마리놀렌산', re: /감마리놀렌|GLA|달맞이꽃|보라지/i },
  { key: '은행잎', re: /은행잎|징코|플라보놀배당체/i },
  { key: '프로폴리스', re: /프로폴리스|플라보노이드/i },
  { key: '가르시니아', re: /가르시니아|hydroxycitric|HCA/i },
  { key: '글루코사민', re: /글루코사민/i },
  { key: '콘드로이친', re: /콘드로이[친틴]/i },
  { key: '식이섬유', re: /식이섬유|차전자|난소화성말토덱스트린|귀리|이눌린|프락토올리고|difructose/i },
  { key: '대두이소플라본', re: /이소플라본|대두배아/i },
  { key: '테아닌', re: /테아닌/i },
  { key: '가르시니아', re: /가르시니아/i },
  { key: '녹차', re: /녹차|카테킨|EGCG/i },
  { key: '알로에', re: /알로에/i },
  { key: '옥타코사놀', re: /옥타코사놀/i },
  { key: '크레아틴', re: /크레아틴/i },
  { key: '콜라겐', re: /콜라겐/i },
  { key: '보스웰리아', re: /보스웰리아/i },
  { key: '베타글루칸', re: /베타글루칸/i },
  { key: '홍국', re: /홍국|모나콜린/i },
  { key: '헛개', re: /헛개|호벤/i },
  { key: '아연효모', re: /스피루리나|클로렐라/i },
  { key: '가시오갈피', re: /가시오갈피|시베리안진생/i },
  { key: '초록입홍합', re: /초록입홍합|그린리프드/i },
];
function classify(label: string): string | null { for (const f of FUNC) if (f.re.test(label)) return f.key; return null; }

// 기능성 스펙 추출: "라벨 : N unit/basis 의 N~M%" (표시량 유무 무관, ratio 있는 것)
const SPEC = /([가-힣A-Za-z0-9()\-·]{2,20}?)\s*[:：]\s*(?:표시량\s*\(?)?\s*([\d][\d,.]*)\s*(mg|g|㎍|μg|mcg|IU|억|CFU)\s*\)?\s*\/\s*([\d][\d,.]*)\s*(mg|g)\s*\)?\s*(?:의|이상)?\s*(?:[\d.]+\s*[~∼-]\s*[\d.]+\s*%|이상)/gi;

interface RawItem { PRDUCT?: string; STTEMNT_NO?: string; SUNGSANG?: string; SRV_USE?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }
interface Stat { single: number; multi: number; vmMixed: number; liquid: number; stmts: string[] }
const groups: Record<string, Stat> = {};
const g = (k: string): Stat => (groups[k] ??= { single: 0, multi: 0, vmMixed: 0, liquid: 0, stmts: [] });

let total = 0, doneVM = 0, noFunc = 0;
const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue;
  let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj; total++;
  const base = normalizeSource(it.BASE_STANDARD ?? '');
  const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? '';
  // 기능성 스펙 라벨 수집
  const funcs = new Set<string>(); let vm = 0, unknown = 0;
  let m: RegExpExecArray | null; SPEC.lastIndex = 0;
  while ((m = SPEC.exec(base)) !== null) {
    const label = m[1].trim();
    if (NONFUNC.test(label)) continue;
    if (DONE_VM.test(label)) { vm++; continue; }
    const k = classify(label);
    if (k) funcs.add(k); else unknown++;
  }
  if (funcs.size === 0) { if (vm > 0) doneVM++; else noFunc++; continue; }
  const liquid = /액상|드롭|시럽|앰플|스포이드|농축액/.test(`${name} ${sungsang}`) || /\bmL\b|㎖/.test(sungsang);
  if (funcs.size === 1 && vm === 0 && unknown === 0) {
    const k = [...funcs][0];
    if (liquid) { g(k).liquid++; continue; }
    g(k).single++; const stmt = (it.STTEMNT_NO ?? '').trim(); if (stmt) g(k).stmts.push(stmt);
  } else { for (const k of funcs) g(k).multi++; }
}

const sorted = Object.entries(groups).sort((a, b) => b[1].single - a[1].single);
fs.writeFileSync(`${OUT}/function-inventory.json`, JSON.stringify(Object.fromEntries(sorted.map(([k, v]) => [k, { ...v, stmts: v.stmts.slice(0, 3000) }])), null, 1));
console.log('═══ HFF 대규모 단일 기능성 원료 그룹 인벤토리 ═══\n');
console.log(`raw ${total} · 비타민미네랄(완료군) ${doneVM} · 기능성스펙 없음 ${noFunc}\n`);
console.log('기능성원료        단일   복합   액상');
console.log('──────────────────────────────────────');
for (const [k, v] of sorted) { if (v.single + v.multi < 5) continue; console.log(`${k.padEnd(14)} ${String(v.single).padStart(5)} ${String(v.multi).padStart(6)} ${String(v.liquid).padStart(5)}`); }
const totalSingle = sorted.reduce((a, [, v]) => a + v.single, 0);
console.log('──────────────────────────────────────');
console.log(`단일 기능성 원료 적격(추정) 합계: ${totalSingle}`);
console.log(`우선순위(단일 ≥20): ${sorted.filter(([, v]) => v.single >= 20).map(([k, v]) => `${k}(${v.single})`).join(' · ')}`);
console.log(`→ ${OUT}/function-inventory.json`);
