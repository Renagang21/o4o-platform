/**
 * Agent C — 미등록 라벨 Combo 단일 패스 signature 수확기 (read-only, DB write 0).
 * WO-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1.
 *   npx tsx src/scripts/hff-combo-c-unreg-harvest.ts --out <dir> [--produced <stmts.json>] [--nmin 2 --nmax 6]
 *
 * hff-combo-c-harvest 를 기반으로 하되 **C 미등록 원료(injectC)** 를 런타임 additive 로 확장한다.
 *  - CLS/FUNCTIONAL_META 주입 → parseSpecs 가 C 라벨 인식, metaOf 가 C 원료 표시명 반환.
 *  - 기능성 귀속: C 키는 belongsC(C 전용 grounded 세트), 등록 키는 공용 fnBelongsTo.
 *  - EN: mapFunctionEnC(C 도메인 정본) ?? mapFunctionEn(공용) — 미매핑 원자 하나라도 있으면 제품 skip(보류).
 *  - **도메인 필터**: signature 에 C 미등록 원료가 1개 이상 있어야 수확(등록전용 combo=기생산·A/B 소유 회피).
 * 공용 파서/registry/compose 무편집. 각 검사 게이트는 공용 select 계약과 동일(1:1).
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, fnBelongsTo, normFn } from './hff-nutrient-registry.js';
import { resolveSource, type HffRawItem } from './hff-raw-source.js';
import { parseSpecs, splitFunctions } from './hff-source-parse.js';
import { mapFunctionEnC } from './hff-sf-c-en-overlay.js';
import { injectC, belongsC, C_KEYS } from './hff-combo-c-unreg-registry.js';

injectC(); // ⚠️ parseSpecs/metaOf 호출 전 필수

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out'); if (!OUT) throw new Error('--out <dir> 필요');
const PRODUCED = arg('produced');
const NMIN = parseInt(arg('nmin', '2'), 10); const NMAX = parseInt(arg('nmax', '6'), 10);
const producedSet: Set<string> = PRODUCED && fs.existsSync(PRODUCED) ? new Set(JSON.parse(fs.readFileSync(PRODUCED, 'utf8')) as string[]) : new Set();
fs.mkdirSync(path.join(OUT, 'sig'), { recursive: true });

const metaOf = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
const belongs = (f: string, k: string): boolean => (C_KEYS.has(k) ? belongsC(f, k) : fnBelongsTo(f, k));
const mapEn = (f: string): string | null => mapFunctionEnC(f) ?? mapFunctionEn(f);

// select.ts 와 동일 (1:1)
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

interface Row { count: number; mention: number; eligible: number; fresh: number; seeds: unknown[] }
const groups = new Map<string, Row>();
const seenStmtBySig = new Map<string, Set<string>>();

const src = resolveSource(process.argv, process.env);
let scanned = 0;
for await (const it of src.gen as AsyncGenerator<HffRawItem>) {
  scanned++;
  const base = it.BASE_STANDARD ?? ''; const name = (it.PRDUCT ?? '').trim(); const srv = it.SRV_USE ?? ''; const sungsang = it.SUNGSANG ?? ''; const stmt = (it.STTEMNT_NO ?? '').trim();
  const sp = parseSpecs(base);
  const keys = [...sp.byKey.keys()].sort();
  if (keys.length < NMIN || keys.length > NMAX) continue;
  if (sp.unknownLabels.length > 0) continue;                    // 미분류 스펙 → HOLD (select 계약)
  if (!keys.some((k) => C_KEYS.has(k))) continue;               // C 미등록 원료 0 → 등록전용 combo(기생산)/타 도메인 → skip
  const sig = keys.join('|');
  if (keys.some((k) => !metaOf(k))) continue;                   // 전부 registry(+C) 지원해야 생산 가능
  let row = groups.get(sig); if (!row) { row = { count: 0, mention: 0, eligible: 0, fresh: 0, seeds: [] }; groups.set(sig, row); seenStmtBySig.set(sig, new Set()); }
  row.mention++;
  if (!stmt || seenStmtBySig.get(sig)!.has(stmt)) continue; seenStmtBySig.get(sig)!.add(stmt);
  if (/[0-9][0-9,.]*\s*[조억만천]/.test(name)) continue;
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) continue;
  if (isLiquidDrop(name, sungsang, srv)) continue;
  if (isBulkMaterial(srv).bulk) continue;
  let badAmt = false; for (const k of keys) { const a = sp.byKey.get(k)!; if (!a || a.ratio === '표시량 이상' || !(a.value > 0) || !(a.basisAmount > 0)) badAmt = true; }
  if (badAmt) continue;
  const allFns = splitFunctions(it.MAIN_FNCTN ?? '');
  const ingredients: Array<{ key: string; labelKo: string; labelEn: string; declaredAmount: unknown; functionsKo: string[]; functionsEn: string[] }> = [];
  let attrFail = false; const attributed = new Set<string>();
  for (const k of keys) {
    const fkRaw = allFns.filter((f) => belongs(f, k)); fkRaw.forEach((f) => attributed.add(f));
    const seenN = new Set<string>(); const fk: string[] = []; const fe: string[] = [];
    for (const f of fkRaw) { const nk = normFn(f); if (seenN.has(nk)) continue; const en = mapEn(f); if (en == null) { fe.push(null as unknown as string); fk.push(f); continue; } seenN.add(nk); fk.push(f); fe.push(en); }
    if (fk.length === 0 || fe.some((e) => e == null)) { attrFail = true; break; }
    const a = sp.byKey.get(k)!;
    ingredients.push({ key: k, labelKo: metaOf(k)!.displayKo, labelEn: metaOf(k)!.displayEn, declaredAmount: { value: a.value, unit: a.unit, basisAmount: a.basisAmount, basisUnit: a.basisUnit, ratio: a.ratio }, functionsKo: fk, functionsEn: fe });
  }
  const unattributed = allFns.filter((f) => !attributed.has(f));
  if (attrFail || unattributed.length > 0) continue;
  const ps = parseServing(srv); const myUnit = parseServingUnit(srv);
  const perDay = ps.kind === 'PARSED' ? ps.value.servingsPerDay : (normalizeSource(srv).match(/1일\s*([\d]+)\s*회/) ? parseInt(normalizeSource(srv).match(/1일\s*([\d]+)\s*회/)![1], 10) : null);
  if (myUnit.count == null && perDay == null) continue;
  const waterInSource = /물|음용수/.test(normalizeSource(srv)) && !/물\s*없이/.test(normalizeSource(srv));
  const seed = {
    statementNo: stmt, productName: name, manufacturer: (it.ENTRPS ?? '').trim(), ingredients,
    source: { mainFunction: (it.MAIN_FNCTN ?? '').trim(), baseStandard: base.trim(), intake: srv.trim(), caution: (it.INTAKE_HINT1 ?? '').trim(), dosageForm: sungsang.trim(), storage: (it.PRSRV_PD ?? '').trim(), shelfLife: (it.DISTB_PD ?? '').trim() },
    serving: { unitType: servingUnitType(name, sungsang, srv, myUnit.unit), servingUnitKo: myUnit.unit ? (/(연질|경질)?캡슐|캅셀/.test(myUnit.unit) ? '캡슐' : myUnit.unit) : null, unitsPerServing: myUnit.count, servingsPerDay: perDay },
    compose: { hasColiform: /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base)), directGrounded: /그대로|직접|털어서/.test(normalizeSource(srv)) && !waterInSource },
    flags: { waterInSource, chew: /씹어/.test(normalizeSource(srv)), melt: /녹여|녹인|입에서/.test(normalizeSource(srv)) },
  };
  row.eligible++; row.seeds.push(seed);
  if (!producedSet.has(stmt)) row.fresh++;
}

const index: Array<{ sig: string; n: number; mention: number; eligible: number; fresh: number; file: string }> = [];
const safe = (s: string) => s.replace(/[^가-힣A-Za-z0-9]+/g, '_');
for (const [sig, row] of groups) {
  if (row.eligible === 0) continue;
  const file = `sig/${safe(sig)}.json`;
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(row.seeds, null, 1));
  index.push({ sig, n: sig.split('|').length, mention: row.mention, eligible: row.eligible, fresh: row.fresh, file });
}
index.sort((a, b) => b.fresh - a.fresh);
fs.writeFileSync(path.join(OUT, 'harvest-index.json'), JSON.stringify({ scanned, groups: index.length, totalEligible: index.reduce((a, r) => a + r.eligible, 0), totalFresh: index.reduce((a, r) => a + r.fresh, 0), index }, null, 1));
console.log(`scanned ${scanned} · signatures(eligible>0) ${index.length} · totalEligible ${index.reduce((a, r) => a + r.eligible, 0)} · totalFresh ${index.reduce((a, r) => a + r.fresh, 0)}`);
console.log('top fresh:', index.slice(0, 25).map((r) => `${r.sig}=${r.fresh}`).join(' · '));
