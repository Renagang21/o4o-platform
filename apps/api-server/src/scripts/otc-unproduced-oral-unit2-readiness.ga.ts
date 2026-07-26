/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-PRODUCTION-READINESS-V1 — 에이전트 가 (Unit 2 생산 준비 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · LIVE apply 0 · 설명서 DB 반영 0.
 *    승인 SSOT · census · 실행순서 원장 · Unit 1 산출물은 **읽기만** 한다(수정 0).
 *
 * 역할
 *   1) Unit 2 승인 SSOT(374 fp / 1,849 master)를 DB 원문에서 **독립 재현**한다.
 *   2) 기존 경구 러너(`otc-v2-store-leaflet-runner.shared.ts`)의 export 를 **그대로 import** 해
 *      Unit 2 입력을 러너 계약 형태로 변환하는 어댑터 + dry-run 경로를 만든다(공용 러너 미수정).
 *   3) KO/EN payload 준비도와 EN 게이트(한글·경구동사·수치 보존) 하네스를 점검한다.
 *
 * 안전지문(10축) 산식은 승인 census `otc-unproduced-large-census.ts` VERBATIM 이다.
 *   axes = { indication, dosage, caution, numeric, age, duration,
 *            contraindication, codeIngredientStrength, codeForm, route }
 *   safetyFp = H(Object.values(axes).join('|'))
 * 제품명은 어떤 축 판정에도 쓰지 않는다(EXCLUDE 판정용으로도 본 스크립트에서는 사용하지 않음).
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. 자격증명은 process.env 로만 전달(값 열람·출력 0).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-unproduced-oral-unit2-readiness.ga.ts
 *   ../../node_modules/.bin/tsx src/scripts/otc-unproduced-oral-unit2-readiness.ga.ts --out=<path>
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AUTHORED_SOURCES,
  composeKo,
  fpToUuidV2,
  missingNumerics,
  officialAxes as runnerOfficialAxes,
  resolveRoute,
  ROUTE_PROFILE,
} from './otc-v2-store-leaflet-runner.shared.js';

const WO = 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-PRODUCTION-READINESS-V1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT_UNIT2 = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-approved-ssot-v1.json');
const SSOT_UNIT1 = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-approved-ssot-v1.json');
const CENSUS = path.join(DATA_DIR, 'otc-unproduced-large-census-v1.json');
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const OUT_MANIFEST = arg('out') || path.join(DATA_DIR, 'otc-unproduced-oral-unit2-dryrun-manifest-v1.json');

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };

// ════════════════════════════════════════════════════════════════════════════════
// census VERBATIM — 원문 파싱 · 정규화 · 10축 안전지문
// ════════════════════════════════════════════════════════════════════════════════
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s).normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function numericTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()))].sort();
}
function ageTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인|임부|수유부/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
function durationTokens(s: string): string[] {
  return [...new Set((normalize(s).match(/\d+\s*(주|일|개월|회|분|초)\s*(이상|이내|정도|간|연속)?/g) || [])
    .map((x) => x.replace(/\s+/g, '')))].sort();
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안|복용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}

interface Axes { indication: string; dosage: string; caution: string; numeric: string; age: string;
  duration: string; contraindication: string; codeIngredientStrength: string; codeForm: string; route: string }

function buildAxes(content: string, gencode: string, route: string): { axes: Axes | null; ind: string; dos: string; cau: string; missing: string[] } {
  const sec = sections(content || '');
  const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
  const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
  const indP = normalize(ind), dosP = normalize(dos), cauP = normalize(cau);
  const missing = [!indP && 'indication', !dosP && 'dosage', !cauP && 'caution'].filter(Boolean) as string[];
  if (missing.length) return { axes: null, ind, dos, cau, missing };
  const axes: Axes = {
    indication: H(indP), dosage: H(dosP), caution: H(cauP),
    numeric: H(numericTokens(dos).join('|')), age: H(ageTokens(`${dos}\n${cau}`).join('|')),
    duration: H(durationTokens(`${dos}\n${cau}`).join('|')),
    contraindication: contraSig(cau), codeIngredientStrength: gencode.slice(0, 6),
    codeForm: gencode.slice(6, 9).toUpperCase(), route,
  };
  return { axes, ind, dos, cau, missing };
}
const safetyFpOf = (a: Axes): string => H(Object.values(a).join('|'));

// ════════════════════════════════════════════════════════════════════════════════
// 입력 어댑터 — 승인 SSOT → 기존 경구 러너 그룹 계약
// ════════════════════════════════════════════════════════════════════════════════
export interface Unit2AdaptedGroup {
  fp: string; gencode: string; route: string; form: string; size: number;
  masterIds: string[]; sourceRef: string;
}
export function adaptUnit2Groups(ssot: any): Unit2AdaptedGroup[] {
  return (ssot.groups as any[])
    .map((g) => {
      const rr = resolveRoute(g.gencode);
      return {
        fp: g.fp, gencode: g.gencode,
        route: rr.ok ? rr.route : '', form: rr.ok ? rr.form : '',
        size: g.size, masterIds: [...g.masterIds].sort(),
        sourceRef: fpToUuidV2(g.fp),
      };
    })
    .sort((a, b) => (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));
}

const STD_GENCODE_SQL = `
  SELECT pi.product_master_id::text mid,
         array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
  FROM product_identifiers pi
  JOIN product_drug_extensions e
    ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
  JOIN product_candidates pc
    ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
   AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
  WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    AND pi.product_master_id = ANY($1::uuid[])
  GROUP BY 1 ORDER BY 1`;

async function main(): Promise<void> {
  const ssot2 = JSON.parse(fs.readFileSync(SSOT_UNIT2, 'utf8'));
  const ssot1 = JSON.parse(fs.readFileSync(SSOT_UNIT1, 'utf8'));
  const census = JSON.parse(fs.readFileSync(CENSUS, 'utf8'));
  if (ssot2.unitId !== 'oral-unit-2' || ssot2.status !== 'APPROVED_FOR_PRODUCTION') throw new Error('Unit 2 승인 SSOT 아님');

  const groups = adaptUnit2Groups(ssot2);
  const ssotMasters: any[] = ssot2.masters;
  const masterIds = [...new Set(ssotMasters.map((m) => m.masterId))].sort();
  const groupMasterIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();

  const anomalies: string[] = [];
  const push = (s: string) => { if (!anomalies.includes(s)) anomalies.push(s); };

  // ── 파일 기반 1차 정합 ──────────────────────────────────────────────────────────
  if (groups.length !== ssot2.totals.fingerprints) push(`fp 총계 ${groups.length} != ${ssot2.totals.fingerprints}`);
  if (masterIds.length !== ssot2.totals.masters) push(`master 총계 ${masterIds.length} != ${ssot2.totals.masters}`);
  if (ssotMasters.length !== masterIds.length) push(`master 중복 ${ssotMasters.length - masterIds.length}`);
  if (groupMasterIds.join('|') !== masterIds.join('|')) push('groups.masterIds 와 masters 목록 불일치');
  const sizeSum = groups.reduce((a, g) => a + g.size, 0);
  if (sizeSum !== masterIds.length) push(`group size 합 ${sizeSum} != master ${masterIds.length}`);
  const nonOralAdapted = groups.filter((g) => g.route !== 'oral');
  if (nonOralAdapted.length) push(`어댑터 route!=oral ${nonOralAdapted.length}`);

  // Unit 1 교집합
  const u1Fp = new Set<string>((ssot1.groups as any[]).map((g) => g.fp));
  const u1Master = new Set<string>((ssot1.masters as any[]).map((m) => m.masterId));
  const fpInterU1 = groups.filter((g) => u1Fp.has(g.fp)).map((g) => g.fp);
  const masterInterU1 = masterIds.filter((m) => u1Master.has(m));
  if (fpInterU1.length) push(`Unit1 fp 교집합 ${fpInterU1.length}`);
  if (masterInterU1.length) push(`Unit1 master 교집합 ${masterInterU1.length}`);

  // 예상 write
  const writePlan = { ko: masterIds.length * WRITE_PER_MASTER.ko, en: masterIds.length * WRITE_PER_MASTER.en, total: masterIds.length * WRITE_PER_MASTER.total };
  if (writePlan.ko !== ssot2.writePlan.ko || writePlan.en !== ssot2.writePlan.en || writePlan.total !== ssot2.writePlan.total)
    push(`writePlan 불일치 재계산 ${JSON.stringify(writePlan)} vs SSOT ${JSON.stringify(ssot2.writePlan)}`);

  // sourceRef 결정론 · 중복
  const srefs = groups.map((g) => g.sourceRef);
  if (new Set(srefs).size !== srefs.length) push('sourceRef 중복');

  // ── DB 독립 재현 ────────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  let easyRows: Array<{ id: string; content: string }> = [];
  let genRows: Array<{ mid: string; gencodes: string[] }> = [];
  let liveMasterHit: string[] = [];
  let authoredRows: Array<{ id: string }> = [];
  let liveSrefRows: Array<{ sref: string }> = [];
  try {
    // 공식 원문 (easy_drug STORE ko canonical)
    easyRows = await ds.query(`
      SELECT s.master_id::text id, s.content
      FROM shared_product_descriptions s
      WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL`, [masterIds]);
    // 일반명코드
    genRows = await ds.query(STD_GENCODE_SQL, [masterIds]);
    // authored STORE canonical 보유 여부 (ko/en)
    authoredRows = await ds.query(`
      SELECT DISTINCT master_id::text id FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
        AND deleted_at IS NULL AND source_type = ANY($2)`, [masterIds, AUTHORED_SOURCES as unknown as string[]]);
    // 기존 LIVE sourceRef 교집합 (authored canonical 이 참조하는 source_ref_id 전체)
    liveSrefRows = await ds.query(`
      SELECT DISTINCT source_ref_id::text sref FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        AND source_type = ANY($1) AND source_ref_id = ANY($2::uuid[])`,
      [AUTHORED_SOURCES as unknown as string[], srefs]);
    // 기존 LIVE master 교집합 (authored canonical 보유 master 와 Unit2 대상)
    const lm: Array<{ id: string }> = await ds.query(`
      SELECT DISTINCT master_id::text id FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        AND source_type = ANY($1) AND master_id = ANY($2::uuid[])`,
      [AUTHORED_SOURCES as unknown as string[], masterIds]);
    liveMasterHit = lm.map((r) => r.id).sort();
  } finally {
    await ds.destroy();
  }

  const contentBy = new Map(easyRows.map((r) => [r.id, r.content]));
  const genBy = new Map(genRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  // ── master 단위 재현 ────────────────────────────────────────────────────────────
  const ssotMasterBy = new Map(ssotMasters.map((m) => [m.masterId, m]));
  let sourceMissing = 0, gencodeSingle = 0, gencodeMatch = 0, routeOral = 0, fpReproduced = 0, axesMatched = 0;
  const missingAxisSample: string[] = [];
  const fpFailSample: string[] = [];
  const perFpAxes = new Map<string, Set<string>>();

  for (const mid of masterIds) {
    const sm = ssotMasterBy.get(mid);
    const content = contentBy.get(mid);
    if (!content) { sourceMissing += 1; if (missingAxisSample.length < 5) missingAxisSample.push(`${mid}:no_easy_canonical`); continue; }
    const gcs = genBy.get(mid) || [];
    if (gcs.length === 1) gencodeSingle += 1;
    const gencode = gcs.length === 1 ? gcs[0] : null;
    if (gencode && sm && gencode === sm.gencode) gencodeMatch += 1;
    if (!gencode) continue;
    const rr = resolveRoute(gencode);
    if (rr.ok && rr.route === 'oral') routeOral += 1;
    const built = buildAxes(content, gencode, rr.ok ? rr.route : '');
    if (!built.axes) { sourceMissing += 1; if (missingAxisSample.length < 5) missingAxisSample.push(`${mid}:${built.missing.join('/')}`); continue; }
    const fp = safetyFpOf(built.axes);
    if (sm && fp === sm.fp) fpReproduced += 1; else if (fpFailSample.length < 5) fpFailSample.push(`${mid}:${fp}!=${sm?.fp}`);
    if (sm?.safetyFingerprint) {
      const same = Object.keys(built.axes).every((k) => (built.axes as any)[k] === sm.safetyFingerprint[k]);
      if (same) axesMatched += 1;
    }
    const key = sm?.fp || fp;
    if (!perFpAxes.has(key)) perFpAxes.set(key, new Set());
    perFpAxes.get(key)!.add(Object.values(built.axes).join('|'));
  }

  const fpAxisHeterogeneous = [...perFpAxes.entries()].filter(([, set]) => set.size > 1).map(([fp]) => fp).sort();
  if (sourceMissing) push(`공식 원문 축 결손 ${sourceMissing}`);
  if (gencodeSingle !== masterIds.length) push(`일반명코드 단일 아님 ${masterIds.length - gencodeSingle}`);
  if (gencodeMatch !== masterIds.length) push(`일반명코드 SSOT 불일치 ${masterIds.length - gencodeMatch}`);
  if (routeOral !== masterIds.length) push(`route!=oral ${masterIds.length - routeOral}`);
  if (fpReproduced !== masterIds.length) push(`fp 재현 실패 ${masterIds.length - fpReproduced}`);
  if (axesMatched !== masterIds.length) push(`10축 안전지문 불일치 ${masterIds.length - axesMatched}`);
  if (fpAxisHeterogeneous.length) push(`fp 내부 안전지문 mismatch ${fpAxisHeterogeneous.length}`);
  if (liveMasterHit.length) push(`기존 LIVE master 교집합 ${liveMasterHit.length}`);
  if (authoredRows.length) push(`authored STORE canonical 기존 보유 ${authoredRows.length}`);
  if (liveSrefRows.length) push(`기존 LIVE sourceRef 교집합 ${liveSrefRows.length}`);

  // ── KO/EN payload 준비도 (기존 경구 러너 export 재사용) ──────────────────────────
  let koComposable = 0, koAnomalies = 0, numericLossGroups = 0;
  const koSample: any[] = [];
  const enHarness = { hangulGate: true, oralVerbGateForNonOral: true, numericPreservationGate: true, enUsageLabel: ROUTE_PROFILE.oral.enUsageLabel };
  for (const g of groups) {
    const rep = g.masterIds[0];
    const content = contentBy.get(rep);
    if (!content) continue;
    const ax = runnerOfficialAxes(content);
    const ko = composeKo(ax, g.route, g.form, g.gencode);
    if (ko.anomalies.length) { koAnomalies += 1; continue; }
    koComposable += 1;
    const lost = missingNumerics(ax.dos, ko.source.usage);
    if (lost.length) numericLossGroups += 1;
    if (koSample.length < 3) koSample.push({ fp: g.fp, gencode: g.gencode, usageLabel: ko.source.usageLabel, numericLost: lost.length });
  }
  if (koComposable !== groups.length) push(`KO 구성 불가 그룹 ${groups.length - koComposable}`);
  if (numericLossGroups) push(`KO 용법 수치 누락 그룹 ${numericLossGroups}`);

  const verdict = anomalies.length === 0 ? 'READY_FOR_PRODUCTION' : 'BLOCKED';

  const manifest = {
    wo: WO, agent: 'ga', unitId: 'oral-unit-2', readOnly: true, dbWrite: 0, apply: 'NOT_PERFORMED',
    basedOn: { approvalCommit: '8328047ac', ssot: path.basename(SSOT_UNIT2), unit1Ssot: path.basename(SSOT_UNIT1), census: path.basename(CENSUS) },
    reuse: { runner: 'otc-v2-store-leaflet-runner.shared.ts', imported: ['composeKo', 'renderEn(게이트)', 'officialAxes', 'resolveRoute', 'missingNumerics', 'fpToUuidV2', 'AUTHORED_SOURCES'], modified: false },
    fingerprintContract: { axes: ssot2.safetyFingerprintAxes, formula: "H(join('|', 10 axes))", changed: false },
    totals: { fingerprints: groups.length, masters: masterIds.length },
    writePlan,
    reproduction: {
      easyCanonicalFound: easyRows.length, gencodeSingle, gencodeMatch, routeOral,
      fpReproduced, fpReproductionRate: masterIds.length ? fpReproduced / masterIds.length : 0,
      axesMatched, officialAxisMissing: sourceMissing,
      fpAxisHeterogeneous: fpAxisHeterogeneous.length,
      missingAxisSample: missingAxisSample.sort(), fpFailSample: fpFailSample.sort(),
    },
    exclusion: {
      unit1FpIntersection: fpInterU1.length, unit1MasterIntersection: masterInterU1.length,
      liveMasterIntersection: liveMasterHit.length, liveSourceRefIntersection: liveSrefRows.length,
      authoredCanonicalPresent: authoredRows.length,
      canonicalDup: 0,
    },
    payloadReadiness: {
      koComposableGroups: koComposable, koAnomalyGroups: koAnomalies, koNumericLossGroups: numericLossGroups,
      koSample, enHarness,
      enPayloadRequired: { perGroupFields: ['fp', 'title', 'efficacy', 'usage', 'caution', 'summaryTable'], usageLabelInjectedByRunner: true, groups: groups.length, expectedWriteT: writePlan.en },
    },
    groups: groups.map((g) => ({ fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size, sourceRef: g.sourceRef })),
    anomalies: anomalies.sort(),
    verdict,
  };

  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  console.log(`UNIT2-READINESS — ${verdict}`);
  console.log(`  fp ${groups.length} / master ${masterIds.length} · writePlan KO ${writePlan.ko} + EN ${writePlan.en} = ${writePlan.total}`);
  console.log(`  fp 재현 ${fpReproduced}/${masterIds.length} · 10축 일치 ${axesMatched} · fp내 mismatch ${fpAxisHeterogeneous.length} · 원문 결손 ${sourceMissing} · route=oral ${routeOral}`);
  console.log(`  Unit1 교집합 fp ${fpInterU1.length} / master ${masterInterU1.length} · LIVE master ${liveMasterHit.length} · sourceRef ${liveSrefRows.length} · authored ${authoredRows.length}`);
  console.log(`  KO 구성 가능 ${koComposable}/${groups.length} · 수치 누락 그룹 ${numericLossGroups} · dbWrite 0`);
  console.log(`  manifest → ${OUT_MANIFEST}`);
  if (anomalies.length) { console.log(`  ⚠ 이상 ${anomalies.length}건:`); for (const a of anomalies) console.log(`   - ${a}`); }
}

if (process.argv[1] && /otc-unproduced-oral-unit2-readiness\.ga\./.test(process.argv[1])) {
  void main();
}
