/**
 * Agent C 완결형 2차 — 단일 패스 signature 수확기 (read-only, DB write 0).
 *   npx tsx src/scripts/hff-combo-c-harvest.ts --source file --out <dir> [--produced <stmts.json>]
 *
 * hff-combo-select 의 **per-item 로직을 1:1 복제**하되 고정 TARGET 대신 **발견된 signature 로 버킷팅**한다.
 * 공용 하드닝 모듈(parseSpecs/splitFunctions/registry)을 그대로 사용 → 생산 select 와 drift 0 (검증으로 확인).
 * 코퍼스 1회 스캔으로 모든 조합의 production-ready ComboSeed[] 를 동시 산출 → N그룹 재스캔 회피.
 *
 * 산출: <dir>/sig/<sig>.json (ComboSeed[]), <dir>/harvest-index.json (signature별 mention/eligible/freshEligible)
 */
import '../env-loader.js';
import fs from 'node:fs';
import path from 'node:path';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, fnBelongsTo, normFn } from './hff-nutrient-registry.js';
import { resolveSource, type HffRawItem } from './hff-raw-source.js';
import { parseSpecs, splitFunctions } from './hff-source-parse.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out'); if (!OUT) throw new Error('--out <dir> 필요');
const PRODUCED = arg('produced');
const NMIN = parseInt(arg('nmin', '2'), 10); const NMAX = parseInt(arg('nmax', '6'), 10);
const producedSet: Set<string> = PRODUCED && fs.existsSync(PRODUCED) ? new Set(JSON.parse(fs.readFileSync(PRODUCED, 'utf8')) as string[]) : new Set();
fs.mkdirSync(path.join(OUT, 'sig'), { recursive: true });

const metaOf = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
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
  const sig = keys.join('|');
  // 원료가 전부 registry 지원(meta 존재)해야 생산 가능
  if (keys.some((k) => !metaOf(k))) continue;
  let row = groups.get(sig); if (!row) { row = { count: 0, mention: 0, eligible: 0, fresh: 0, seeds: [] }; groups.set(sig, row); seenStmtBySig.set(sig, new Set()); }
  row.mention++;
  if (!stmt || seenStmtBySig.get(sig)!.has(stmt)) continue; seenStmtBySig.get(sig)!.add(stmt);
  if (/[0-9][0-9,.]*\s*[조억만천]/.test(name)) continue;
  if (/전량\s*수출|수출\s*전용|수출용|for\s*export/i.test(`${name} ${srv} ${sungsang}`)) continue;
  if (isLiquidDrop(name, sungsang, srv)) continue;
  if (isBulkMaterial(srv).bulk) continue;
  // declaredAmount 검증
  let badAmt = false; for (const k of keys) { const a = sp.byKey.get(k)!; if (!a || a.ratio === '표시량 이상' || !(a.value > 0) || !(a.basisAmount > 0)) badAmt = true; }
  if (badAmt) continue;
  // 기능성 귀속 (select 와 동일: TARGET 스코프 registry 귀속)
  const allFns = splitFunctions(it.MAIN_FNCTN ?? '');
  const ingredients: Array<{ key: string; labelKo: string; labelEn: string; declaredAmount: unknown; functionsKo: string[]; functionsEn: string[] }> = [];
  let attrFail = false; const attributed = new Set<string>();
  for (const k of keys) {
    const fkRaw = allFns.filter((f) => fnBelongsTo(f, k)); fkRaw.forEach((f) => attributed.add(f));
    const seenN = new Set<string>(); const fk: string[] = []; const fe: string[] = [];
    for (const f of fkRaw) { const nk = normFn(f); if (seenN.has(nk)) continue; const en = mapFunctionEn(f); if (en == null) { fe.push(null as unknown as string); fk.push(f); continue; } seenN.add(nk); fk.push(f); fe.push(en); }
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
console.log('top fresh:', index.slice(0, 20).map((r) => `${r.sig}=${r.fresh}`).join(' · '));
