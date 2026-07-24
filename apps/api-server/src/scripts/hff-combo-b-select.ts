/**
 * Agent B 소유 — 조합별 대상 풀 선정 (read-only, DB write 0)
 *   npx tsx src/scripts/hff-combo-b-select.ts --combo "비타민D,아연" --statement-nos-file <f> --out <path>
 *
 * 공용 `hff-combo-select.ts` 의 **게이트 체인·seed 계약을 그대로 복제**하되, spec 해석만
 * B 전용 additive resolver(`hff-spec-b-resolve.ts` · `parseSpecsB`)로 교체한다. 차이는 `extractSpecs` 한 곳뿐이다.
 *
 * 왜 사본인가: 공용 select 가 내부에서 `parseSpecs` 를 직접 호출하므로 B 전용 해석을 주입할 지점이 없다.
 * 공용 파일은 한 줄도 수정하지 않는다(WO 제약). composer·Guard·apply 는 공용을 그대로 재사용한다.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, fnBelongsTo, normFn } from './hff-nutrient-registry.js';
import { resolveSource, dbStmtNosSource } from './hff-raw-source.js';
import { DataSource } from 'typeorm';
import { splitFunctions } from './hff-source-parse.js';
import { parseSpecsB } from './hff-spec-b-resolve.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const COMBO = arg('combo'); const OUT = arg('out');
if (!COMBO || !OUT) throw new Error('--combo "A,B" --out 필요');
const TARGET = COMBO.split(/[,+]/).map((x) => x.trim());
const metaOf = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
for (const k of TARGET) if (!metaOf(k)) throw new Error(`미지원 원료: ${k}`);
const TARGET_SET = [...TARGET].sort().join('|');
const EXCLUDE_TAKEN = process.argv.includes('--exclude-taken');

/** B resolver 결과를 기존 select 계약(TARGET 한정 byKey + unknown + nonTarget)으로 투영 */
function extractSpecs(base: string): { byKey: Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string }>; unknown: number; nonTarget: boolean } {
  const sp = parseSpecsB(base);
  const byKey = new Map<string, { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string }>();
  let nonTarget = false;
  for (const [k, v] of sp.byKey) {
    if (!TARGET.includes(k)) { nonTarget = true; continue; }
    byKey.set(k, { value: v.value, unit: v.unit, basisAmount: v.basisAmount, basisUnit: v.basisUnit, ratio: v.ratio });
  }
  return { byKey, unknown: sp.unknownLabels.length, nonTarget };
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

const STMT_FILE = arg('statement-nos-file');
let src: { kind: string; gen: AsyncGenerator<RawItem>; label: string };
if (STMT_FILE) {
  const raw = fs.readFileSync(STMT_FILE, 'utf8').trim();
  let stmtNos: string[];
  try { const j = JSON.parse(raw); stmtNos = Array.isArray(j) ? j.map(String) : (j.statementNos ?? j.ids ?? []).map(String); }
  catch { stmtNos = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }
  const port = parseInt(process.env.PROXY_PORT ?? '5442', 10);
  console.error(`[source] statementNo 직접주입 (${stmtNos.length}건, ILIKE 스캔 생략)`);
  src = { kind: 'stmtnos', gen: dbStmtNosSource(port, process.env.DB_USERNAME, process.env.DB_PASSWORD, process.env.DB_NAME, stmtNos) as AsyncGenerator<RawItem>, label: `stmtnos:${stmtNos.length}` };
} else {
  src = resolveSource(process.argv, process.env, undefined) as { kind: string; gen: AsyncGenerator<RawItem>; label: string };
}
for await (const it of src.gen as AsyncGenerator<RawItem>) {
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
  let badAmt = false; for (const k of TARGET) { const a = byKey.get(k)!; if (!a || a.ratio === '표시량 이상' || !(a.value > 0) || !(a.basisAmount > 0)) badAmt = true; }
  if (badAmt) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: '원료 표시량/비율 추출 실패' }); continue; }
  // 기능성 귀속 — 공용과 동일한 TARGET 스코프 registry 귀속(전역 명시-구조 귀속으로 바꾸지 말 것).
  const allFns = splitFunctions(it.MAIN_FNCTN ?? '');
  const ingredients: Array<{ key: string; labelKo: string; labelEn: string; declaredAmount: unknown; functionsKo: string[]; functionsEn: string[] }> = [];
  let attrFail = false; const attributed = new Set<string>();
  for (const k of TARGET) {
    const fkRaw = allFns.filter((f) => fnBelongsTo(f, k)); fkRaw.forEach((f) => attributed.add(f));
    const seenN = new Set<string>(); const fk: string[] = []; const fe: string[] = [];
    for (const f of fkRaw) { const nk = normFn(f); if (seenN.has(nk)) continue; const en = mapFunctionEn(f); if (en == null) { fe.push(null as unknown as string); fk.push(f); continue; } seenN.add(nk); fk.push(f); fe.push(en); }
    if (fk.length === 0 || fe.some((e) => e == null)) { attrFail = true; break; }
    ingredients.push({ key: k, labelKo: metaOf(k).displayKo, labelEn: metaOf(k).displayEn, declaredAmount: byKey.get(k)!, functionsKo: fk, functionsEn: fe });
  }
  const unattributed = allFns.filter((f) => !attributed.has(f));
  if (attrFail || unattributed.length > 0) { bump('HOLD_GROUNDING'); holds.push({ statementNo: stmt, productName: name, holdCode: 'HOLD_GROUNDING', reason: attrFail ? '원료 기능성 귀속/매핑 실패' : `부원료/미귀속 기능성: ${unattributed.slice(0, 2).join('|').slice(0, 40)}` }); continue; }
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
// taken-exclusion: 사전승격(master 연결) 또는 canonical STORE SPD 존재 후보 사전 제외
let takenExcluded = 0;
if (EXCLUDE_TAKEN && eligible.length) {
  const stmts = eligible.map((e) => String((e as { statementNo: string }).statementNo));
  const port = parseInt(process.env.PROXY_PORT ?? '5442', 10);
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 120000 } });
  await ds.initialize();
  try {
    const taken: Array<{ stmt: string }> = await ds.query(
      `SELECT DISTINCT s AS stmt FROM (
         SELECT raw_payload::jsonb->'source'->>'STTEMNT_NO' AS s
           FROM product_candidates
          WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
            AND raw_payload::jsonb->'source'->>'STTEMNT_NO' = ANY($1)
            AND matched_product_master_id IS NOT NULL
         UNION
         SELECT m.mfds_permit_number AS s
           FROM product_masters m
           JOIN shared_product_descriptions sp ON sp.master_id=m.id
          WHERE m.mfds_permit_number = ANY($1)
            AND sp.description_type='STORE' AND sp.status='canonical' AND sp.deleted_at IS NULL
       ) x WHERE s IS NOT NULL`, [stmts]);
    const takenSet = new Set(taken.map((t) => t.stmt));
    if (takenSet.size) {
      const before = eligible.length;
      for (let i = eligible.length - 1; i >= 0; i--) if (takenSet.has(String((eligible[i] as { statementNo: string }).statementNo))) eligible.splice(i, 1);
      takenExcluded = before - eligible.length;
    }
  } finally { await ds.destroy(); }
}

fs.writeFileSync(OUT, JSON.stringify(eligible, null, 1));
fs.writeFileSync(OUT.replace(/\.json$/, '.hold.json'), JSON.stringify(holds, null, 1));
console.log(`═══ ${COMBO} (B resolver) 선정 ═══`);
console.log(`mention ${counts['mention'] ?? 0} · ELIGIBLE ${counts['ELIGIBLE'] ?? 0} · HOLD_MULTI ${counts['HOLD_MULTI'] ?? 0} · 액상 ${counts['HOLD_UNSUPPORTED'] ?? 0} · 벌크 ${counts['BULK'] ?? 0} · 수출 ${counts['EXPORT'] ?? 0} · grounding ${counts['HOLD_GROUNDING'] ?? 0} · 정체 ${counts['HOLD_IDENTITY'] ?? 0}${EXCLUDE_TAKEN ? ` · taken제외 ${takenExcluded}` : ''}`);
console.log(`→ ${OUT} (${eligible.length}) · hold (${holds.length})`);
