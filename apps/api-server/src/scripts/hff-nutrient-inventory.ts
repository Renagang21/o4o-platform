/**
 * HFF 단일 비타민·미네랄 그룹 인벤토리 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-nutrient-inventory.ts
 *
 * WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1 §4
 * 단일 기능성 = BASE_STANDARD 에 성분 표시량 스펙이 **정확히 1개**. 그 라벨 = 그 영양소.
 * 영양소별 적격(고형·비벌크·비수출·grounding) 잔여를 집계해 우선순위표 산출. 비타민 C·D 제외(완료).
 * 산출: scratchpad/nutrient-inventory.json + 콘솔 우선순위표.
 */
import fs from 'node:fs';
import readline from 'node:readline';
import { parseBasis, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

const RAW = 'G:/내 드라이브/자료실/public-data-api-samples/mfds-health-functional-food-info-raw.jsonl';
const OUT = 'C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad';

// 영양소 라벨 → canonical key. 순서 중요(더 구체적인 것 먼저: 비타민B12 전에 비타민B1 오면 오분류).
const NUTRIENTS: Array<{ key: string; re: RegExp }> = [
  { key: '비타민C', re: /비타민\s?C\b/i },
  { key: '비타민D', re: /비타민\s?D\b/i },
  { key: '비타민B12', re: /비타민\s?B\s?12|시아노코발라민|코발라민/i },
  { key: '비타민B6', re: /비타민\s?B\s?6|피리독[신살]/i },
  { key: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i },
  { key: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { key: '비타민A', re: /비타민\s?A\b|레티놀|베타카로틴|베타-?카로[티틴]/i },
  { key: '비타민E', re: /비타민\s?E\b|토코페롤/i },
  { key: '비타민K', re: /비타민\s?K\b|비타민\s?K1|비타민\s?K2|메나퀴논|필로퀴논/i },
  { key: '엽산', re: /엽산|폴[레리]?산|folate|folic/i },
  { key: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i },
  { key: '판토텐산', re: /판토텐산|판토텐/i },
  { key: '비오틴', re: /비오틴|바이오틴/i },
  { key: '아연', re: /아연/i },
  { key: '마그네슘', re: /마그네슘/i },
  { key: '철', re: /철분|철\s*[:(]|헴철|\b철\b/i },
  { key: '칼슘', re: /칼슘/i },
  { key: '셀레늄', re: /셀레늄|셀렌/i },
  { key: '구리', re: /구리/i },
  { key: '망간', re: /망간/i },
  { key: '크롬', re: /크[로롬]/i },
  { key: '몰리브덴', re: /몰리브[덴덴]/i },
  { key: '요오드', re: /요오드|아이오딘/i },
];

function classifyLabel(label: string): string | null {
  for (const n of NUTRIENTS) if (n.re.test(label)) return n.key;
  return null;
}

// BASE_STANDARD 에서 표시량 스펙의 라벨 집합 추출 (표시량 앞 ~16자).
function specNutrients(base: string): { nutrients: Set<string>; unknown: number } {
  const b = normalizeSource(base);
  const nutrients = new Set<string>();
  let unknown = 0;
  const re = /표시량/g; let m: RegExpExecArray | null;
  while ((m = re.exec(b)) !== null) {
    const before = b.slice(Math.max(0, m.index - 18), m.index);
    // 비-영양소 마커(성상/대장균군/붕해/납/카드뮴 등)는 표시량 앞에 안 옴 → 라벨만 분류
    const k = classifyLabel(before);
    if (k) nutrients.add(k); else unknown++;
  }
  return { nutrients, unknown };
}

function isLiquidDrop(name: string, sungsang: string, srv: string): boolean {
  const t = `${name} ${sungsang}`;
  if (/액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액/.test(t)) return true;
  if (/\d\s*(?:방울|drop)/.test(srv)) return true;
  if (/\bmL\b|\bml\b|㎖/.test(sungsang)) return true;
  return false;
}

interface RawItem { ENTRPS?: string; PRDUCT?: string; STTEMNT_NO?: string; SUNGSANG?: string; SRV_USE?: string; MAIN_FNCTN?: string; BASE_STANDARD?: string; item?: RawItem }

interface GroupStat { eligible: number; multiExcluded: number; liquid: number; bulk: number; export: number; grounding: number; units: Record<string, number>; stmts: string[] }
const groups: Record<string, GroupStat> = {};
const g = (k: string): GroupStat => (groups[k] ??= { eligible: 0, multiExcluded: 0, liquid: 0, bulk: 0, export: 0, grounding: 0, units: {}, stmts: [] });

let total = 0, noSpec = 0;
const rl = readline.createInterface({ input: fs.createReadStream(RAW, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  const l = line.trim(); if (!l) continue;
  let obj: RawItem; try { obj = JSON.parse(l) as RawItem; } catch { continue; }
  const it = obj.item ?? obj; total++;
  const base = it.BASE_STANDARD ?? '';
  const name = (it.PRDUCT ?? '').trim();
  const srv = it.SRV_USE ?? '';
  const sungsang = it.SUNGSANG ?? '';
  const { nutrients, unknown } = specNutrients(base);
  if (nutrients.size === 0) { noSpec++; continue; }
  // 복합: 표시량 스펙 영양소 ≥2, 또는 미분류 표시량 존재
  if (nutrients.size >= 2 || unknown > 0) {
    for (const k of nutrients) g(k).multiExcluded++;
    continue;
  }
  const key = [...nutrients][0];
  if (key === '비타민C' || key === '비타민D') continue; // 완료
  const gs = g(key);
  // 제외 사유
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) { gs.export++; continue; }
  if (isLiquidDrop(name, sungsang, srv)) { gs.liquid++; continue; }
  if (isBulkMaterial(srv).bulk) { gs.bulk++; continue; }
  const pb = parseBasis(base);
  if (pb.kind !== 'PARSED') { gs.grounding++; continue; }
  // 적격
  gs.eligible++;
  const stmt = (it.STTEMNT_NO ?? '').trim(); if (stmt) gs.stmts.push(stmt);
}

const sorted = Object.entries(groups).sort((a, b) => b[1].eligible - a[1].eligible);
fs.writeFileSync(`${OUT}/nutrient-inventory.json`, JSON.stringify(Object.fromEntries(sorted.map(([k, v]) => [k, { ...v, stmts: v.stmts.slice(0, 5000) }])), null, 1));

console.log('═══ HFF 단일 비타민·미네랄 그룹 인벤토리 (비타민 C·D 제외) ═══\n');
console.log(`raw ${total} · 표시량 스펙 없음 ${noSpec}\n`);
console.log('영양소       적격  복합제외  액상  벌크  수출  grounding');
console.log('─────────────────────────────────────────────────────────');
for (const [k, v] of sorted) {
  if (v.eligible === 0 && v.multiExcluded === 0) continue;
  console.log(`${k.padEnd(10)} ${String(v.eligible).padStart(5)} ${String(v.multiExcluded).padStart(8)} ${String(v.liquid).padStart(5)} ${String(v.bulk).padStart(5)} ${String(v.export).padStart(5)} ${String(v.grounding).padStart(9)}`);
}
const totalEligible = sorted.reduce((a, [, v]) => a + v.eligible, 0);
console.log('─────────────────────────────────────────────────────────');
console.log(`적격 합계(단일 영양소, VC·VD 제외): ${totalEligible}`);
console.log(`\n우선순위(적격 잔여 큰 순): ${sorted.filter(([, v]) => v.eligible >= 20).map(([k, v]) => `${k}(${v.eligible})`).join(' · ')}`);
console.log(`→ ${OUT}/nutrient-inventory.json`);
