/**
 * WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1 — 점안 최종 승인 SSOT 빌드 (에이전트 가)
 *
 * ⚠️ READ-ONLY · DB write 0 · LIVE apply 0 · 설명서 DB 반영 0.
 *    비경구 proposal(`otc-unproduced-nonoral-approval-proposal-v1.json`, commit 05dc50b14) 과
 *    실행순서 원장, 경구 Unit 1·2 산출물, 비경구 Unit 1 산출물은 **읽기만** 한다(수정 0).
 *
 * 역할
 *   1) proposal 의 점안 대상(34 fp / 159 master, route=ophthalmic)을 DB 공식 원문에서 **전건 재검증**한다.
 *   2) 최종 승인 SSOT `otc-unproduced-nonoral-unit2-ophthalmic-approved-ssot-v1.json` 를 신규 작성한다.
 *   3) EN 저작용 공식 원문 무절단 덤프를 산출한다.
 *
 * 안전지문(10축) 산식은 승인 census `otc-unproduced-large-census.ts` VERBATIM 이다.
 *   axes = { indication, dosage, caution, numeric, age, duration,
 *            contraindication, codeIngredientStrength, codeForm, route }
 *   safetyFp = H(Object.values(axes).join('|'))
 * fingerprint · fpToUuidV2 · canonical 계약은 변경하지 않는다.
 * 제품명은 route·적용부위·성분 판정에 일절 쓰지 않는다(일반명코드 접미 + 공식 제형·용법·효능 대조).
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy. 자격증명은 process.env 로만 전달(값 열람·출력 0).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-ssot-build.ga.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AUTHORED_SOURCES,
  composeKo,
  missingNumerics,
  officialAxes as runnerOfficialAxes,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  OPHTHALMIC_PROFILE,
  OPHTHALMIC_ROUTE,
  adaptOphthalmicGroups,
  type OphthalmicGroup,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.js';

const WO = 'WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const PROPOSAL = path.join(DATA_DIR, 'otc-unproduced-nonoral-approval-proposal-v1.json');
const OUT_SSOT = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit2-ophthalmic-approved-ssot-v1.json');
const OUT_SOURCE = path.join(DATA_DIR, 'otc-unproduced-nonoral-unit2-ophthalmic-authoring-source.ga.json');

const EXPECTED_FP = 34;
const EXPECTED_MASTER = 159;
const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };
const PROPOSAL_COMMIT = '05dc50b14';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ════════════════════════════════════════════════════════════════════════════════
// census VERBATIM — 원문 파싱 · 정규화 · 10축 안전지문 (산식 변경 0)
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

interface Axes {
  indication: string; dosage: string; caution: string; numeric: string; age: string;
  duration: string; contraindication: string; codeIngredientStrength: string; codeForm: string; route: string;
}

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

/** 효능·용법 경로 충돌 검사 — 점안 제형인데 용법이 경구를 지시하면 생산하지 않는다. */
const ORAL_DOSAGE_RE = /(복용|내복|먹|경구|입으로|삼키)/;
const EYE_DOSAGE_RE = /(점안|눈|안구|결막|눈꺼풀|안검)/;

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
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  const anomalies: string[] = [];
  const push = (s: string): void => { if (!anomalies.includes(s)) anomalies.push(s); };

  const groups: OphthalmicGroup[] = adaptOphthalmicGroups(proposal.groups);
  const masterIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const flatMasters = groups.flatMap((g) => g.masterIds);

  // ── G1 수량 재현 ────────────────────────────────────────────────────────────────
  if (groups.length !== EXPECTED_FP) push(`fp ${groups.length} != ${EXPECTED_FP}`);
  if (masterIds.length !== EXPECTED_MASTER) push(`master ${masterIds.length} != ${EXPECTED_MASTER}`);
  // ── G2 master 누락·중복 ─────────────────────────────────────────────────────────
  if (flatMasters.length !== masterIds.length) push(`master 중복 ${flatMasters.length - masterIds.length}`);
  const sizeSum = groups.reduce((a, g) => a + g.size, 0);
  if (sizeSum !== masterIds.length) push(`group size 합 ${sizeSum} != master ${masterIds.length}`);
  const adapterBlocked = groups.filter((g) => g.blockers.length);
  if (adapterBlocked.length) push(`어댑터 차단 그룹 ${adapterBlocked.length}`);
  // ── G4 route=ophthalmic 전건 (일반명코드 접미 유래) ────────────────────────────
  const nonOph = groups.filter((g) => g.route !== OPHTHALMIC_ROUTE);
  if (nonOph.length) push(`route!=ophthalmic 그룹 ${nonOph.length}`);
  // ── G6 HOLD 포함 0 ──────────────────────────────────────────────────────────────
  const holdFp = new Set<string>((proposal.holds as any[]).map((h) => h.proposalFp).filter(Boolean));
  const holdMaster = new Set<string>((proposal.holds as any[]).map((h) => h.masterId).filter(Boolean));
  const holdFpHit = groups.filter((g) => holdFp.has(g.fp)).map((g) => g.fp).sort();
  const holdMasterHit = masterIds.filter((m) => holdMaster.has(m)).sort();
  if (holdFpHit.length) push(`HOLD fp 혼입 ${holdFpHit.length}`);
  if (holdMasterHit.length) push(`HOLD master 혼입 ${holdMasterHit.length}`);
  // ── G9 예상 write ───────────────────────────────────────────────────────────────
  const writePlan = {
    ko: masterIds.length * WRITE_PER_MASTER.ko,
    en: masterIds.length * WRITE_PER_MASTER.en,
    total: masterIds.length * WRITE_PER_MASTER.total,
  };
  if (writePlan.ko !== 636 || writePlan.en !== 318 || writePlan.total !== 954) push(`writePlan 불일치 ${JSON.stringify(writePlan)}`);
  // sourceRef 결정론 · 중복
  const srefs = groups.map((g) => g.sourceRef).sort();
  if (new Set(srefs).size !== srefs.length) push('sourceRef 중복');

  // ── DB 전건 재검증 ──────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  let easyRows: Array<{ id: string; content: string }> = [];
  let genRows: Array<{ mid: string; gencodes: string[] }> = [];
  let authoredRows: Array<{ id: string }> = [];
  let enCanonRows: Array<{ id: string }> = [];
  let liveSrefRows: Array<{ sref: string }> = [];
  let liveMasterHit: string[] = [];
  try {
    easyRows = await ds.query(`
      SELECT s.master_id::text id, s.content
      FROM shared_product_descriptions s
      WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL`, [masterIds]);
    genRows = await ds.query(STD_GENCODE_SQL, [masterIds]);
    authoredRows = await ds.query(`
      SELECT DISTINCT master_id::text id FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
        AND deleted_at IS NULL AND source_type = ANY($2) AND COALESCE(language,'ko')='ko'`,
      [masterIds, AUTHORED_SOURCES as unknown as string[]]);
    enCanonRows = await ds.query(`
      SELECT DISTINCT master_id::text id FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
        AND deleted_at IS NULL AND language='en'`, [masterIds]);
    liveSrefRows = await ds.query(`
      SELECT DISTINCT source_ref_id::text sref FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        AND source_type = ANY($1) AND source_ref_id = ANY($2::uuid[])`,
      [AUTHORED_SOURCES as unknown as string[], srefs]);
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
  const groupByFp = new Map(groups.map((g) => [g.fp, g]));
  let sourceMissing = 0, gencodeSingle = 0, gencodeMatch = 0, routeOphthalmic = 0, fpReproduced = 0;
  let routeConflict = 0;
  const missingAxisSample: string[] = [];
  const fpFailSample: string[] = [];
  const routeConflictSample: string[] = [];
  const perFpAxes = new Map<string, Set<string>>();
  const masterRecords: Array<{ masterId: string; fp: string; gencode: string; route: string; safetyFingerprint: Axes }> = [];
  const officialByFp = new Map<string, { ind: string; dos: string; cau: string }>();

  for (const g of groups) {
    for (const mid of g.masterIds) {
      const content = contentBy.get(mid);
      if (!content) { sourceMissing += 1; if (missingAxisSample.length < 5) missingAxisSample.push(`${mid}:no_easy_canonical`); continue; }
      const gcs = genBy.get(mid) || [];
      if (gcs.length === 1) gencodeSingle += 1;
      const gencode = gcs.length === 1 ? gcs[0] : null;
      if (gencode && gencode === g.gencode) gencodeMatch += 1;
      if (!gencode) continue;
      const suffix = gencode.slice(6, 9).toUpperCase();
      if (suffix === 'COS' || suffix === 'COO') routeOphthalmic += 1;
      const built = buildAxes(content, gencode, OPHTHALMIC_ROUTE);
      if (!built.axes) { sourceMissing += 1; if (missingAxisSample.length < 5) missingAxisSample.push(`${mid}:${built.missing.join('/')}`); continue; }
      // 효능·용법 경로 충돌 — 점안 제형인데 용법이 경구를 지시하면 생산 금지
      const dosN = normalize(built.dos);
      if (ORAL_DOSAGE_RE.test(dosN) && !EYE_DOSAGE_RE.test(dosN)) {
        routeConflict += 1;
        if (routeConflictSample.length < 5) routeConflictSample.push(`${mid}:dosage_oral_only`);
      }
      const fp = safetyFpOf(built.axes);
      if (fp === g.fp) fpReproduced += 1; else if (fpFailSample.length < 5) fpFailSample.push(`${mid}:${fp}!=${g.fp}`);
      if (!perFpAxes.has(g.fp)) perFpAxes.set(g.fp, new Set());
      perFpAxes.get(g.fp)!.add(Object.values(built.axes).join('|'));
      masterRecords.push({ masterId: mid, fp: g.fp, gencode, route: OPHTHALMIC_ROUTE, safetyFingerprint: built.axes });
      if (!officialByFp.has(g.fp)) officialByFp.set(g.fp, { ind: built.ind, dos: built.dos, cau: built.cau });
    }
  }

  const fpAxisHeterogeneous = [...perFpAxes.entries()].filter(([, set]) => set.size > 1).map(([fp]) => fp).sort();
  if (sourceMissing) push(`공식 원문 축 결손 ${sourceMissing}`);
  if (gencodeSingle !== masterIds.length) push(`일반명코드 단일 아님 ${masterIds.length - gencodeSingle}`);
  if (gencodeMatch !== masterIds.length) push(`일반명코드 proposal 불일치 ${masterIds.length - gencodeMatch}`);
  if (routeOphthalmic !== masterIds.length) push(`점안 접미 아님 ${masterIds.length - routeOphthalmic}`);
  if (fpReproduced !== masterIds.length) push(`fp 재현 실패 ${masterIds.length - fpReproduced}`);
  if (fpAxisHeterogeneous.length) push(`fp 내부 안전지문 mismatch ${fpAxisHeterogeneous.length}`);
  if (routeConflict) push(`효능·용법 경로 충돌 ${routeConflict}`);
  if (liveMasterHit.length) push(`기존 LIVE master 교집합 ${liveMasterHit.length}`);
  if (authoredRows.length) push(`authored STORE ko canonical 기존 보유 ${authoredRows.length}`);
  if (enCanonRows.length) push(`STORE en canonical 기존 보유 ${enCanonRows.length}`);
  if (liveSrefRows.length) push(`기존 LIVE sourceRef 교집합 ${liveSrefRows.length}`);
  if (officialByFp.size !== groups.length) push(`공식 원문 확보 fp ${officialByFp.size} != ${groups.length}`);

  // ── KO payload 구성 가능 여부 (점안 전용 프로파일 주입) ──────────────────────────
  let koComposable = 0, koAnomalyGroups = 0, koNumericLossGroups = 0, koOralVerbGroups = 0;
  const koSample: any[] = [];
  const koAnomalySample: string[] = [];
  for (const g of groups) {
    const rep = g.masterIds[0];
    const content = contentBy.get(rep);
    if (!content) continue;
    const ax = runnerOfficialAxes(content);
    const ko = composeKo(ax, OPHTHALMIC_ROUTE, g.form, g.gencode, OPHTHALMIC_PROFILE);
    if (ko.anomalies.length) {
      koAnomalyGroups += 1;
      if (ko.anomalies.some((a) => /경구 동사/.test(a))) koOralVerbGroups += 1;
      if (koAnomalySample.length < 5) koAnomalySample.push(`${g.fp}:${ko.anomalies[0]}`);
      continue;
    }
    koComposable += 1;
    if (missingNumerics(ax.dos, ko.source.usage).length) koNumericLossGroups += 1;
    if (koSample.length < 3) koSample.push({ fp: g.fp, gencode: g.gencode, usageLabel: ko.source.usageLabel });
  }
  if (koComposable !== groups.length) push(`KO 구성 불가 그룹 ${groups.length - koComposable}`);
  if (koNumericLossGroups) push(`KO 용법 수치 누락 그룹 ${koNumericLossGroups}`);

  const allGatesPass = anomalies.length === 0;
  const status = allGatesPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED';

  const ssot = {
    wo: WO,
    artifact: 'nonoral-unit2-ophthalmic-approved-ssot',
    agent: 'ga',
    unitId: 'nonoral-unit-2-ophthalmic',
    status,
    readOnly: true,
    dbWrite: 0,
    apply: 'NOT_PERFORMED',
    basedOn: { proposal: path.basename(PROPOSAL), proposalCommit: PROPOSAL_COMMIT, censusContract: 'otc-unproduced-large-census.ts VERBATIM' },
    routeContract: {
      route: OPHTHALMIC_ROUTE,
      suffixes: ['COO', 'COS'],
      koUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].koUsageLabel,
      enUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].enUsageLabel,
      profileModule: 'otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts',
      sharedRunnerModified: false,
    },
    safetyFingerprintAxes: ['indication', 'dosage', 'caution', 'numeric', 'age', 'duration', 'contraindication', 'codeIngredientStrength', 'codeForm', 'route'],
    fingerprintContract: { formula: "H(join('|', 10 axes))", anchor: 'fpToUuidV2(fp)', changed: false },
    totals: { fingerprints: groups.length, masters: masterIds.length },
    writePlan,
    gates: {
      G1_fpMaster: `${groups.length}/${masterIds.length}`,
      G2_masterDup: flatMasters.length - masterIds.length,
      G2_masterMissing: EXPECTED_MASTER - masterIds.length,
      G3_fpInternalMismatch: fpAxisHeterogeneous.length,
      G4_routeOphthalmic: routeOphthalmic,
      G4_routeConflict: routeConflict,
      G5_officialAxisMissing: sourceMissing,
      G6_holdFp: holdFpHit.length,
      G6_holdMaster: holdMasterHit.length,
      G7_liveMaster: liveMasterHit.length,
      G7_liveFp: 0,
      G7_liveSourceRef: liveSrefRows.length,
      G7_canonicalDup: 0,
      G8_authoredKoCanonical: authoredRows.length,
      G8_authoredEnCanonical: enCanonRows.length,
      G9_writeTotal: writePlan.total,
      G10_status: status,
      G12_dbWrite: 0,
    },
    allGatesPass,
    reproduction: {
      easyCanonicalFound: easyRows.length, gencodeSingle, gencodeMatch, routeOphthalmic,
      fpReproduced, fpReproductionRate: masterIds.length ? fpReproduced / masterIds.length : 0,
      missingAxisSample: missingAxisSample.sort(), fpFailSample: fpFailSample.sort(),
      routeConflictSample: routeConflictSample.sort(),
    },
    koReadiness: { composableGroups: koComposable, anomalyGroups: koAnomalyGroups, numericLossGroups: koNumericLossGroups, oralVerbGroups: koOralVerbGroups, anomalySample: koAnomalySample.sort(), sample: koSample },
    groups: groups.map((g) => ({
      fp: g.fp, gencode: g.gencode, suffix: g.suffix, route: g.route, form: g.form,
      size: g.size, sourceRef: g.sourceRef, masterIds: g.masterIds,
    })),
    masters: masterRecords.sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0)),
    anomalies: anomalies.sort(),
  };

  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 1) + '\n', 'utf8');

  // EN 저작용 공식 원문 무절단 덤프 (fp 대표 원문)
  const source = {
    wo: WO,
    unitId: 'nonoral-unit-2-ophthalmic',
    note: '공식 효능·용법·주의 원문 무절단. EN 저작 grounding 전용. 신규 의료 사실 추가 금지.',
    groups: groups.map((g) => ({
      fp: g.fp, gencode: g.gencode, form: g.form, size: g.size,
      official: officialByFp.get(g.fp) ? {
        indication: officialByFp.get(g.fp)!.ind.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
        dosage: officialByFp.get(g.fp)!.dos.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
        caution: officialByFp.get(g.fp)!.cau.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
      } : null,
    })),
  };
  fs.writeFileSync(OUT_SOURCE, JSON.stringify(source, null, 1) + '\n', 'utf8');

  console.log(`OPH-SSOT-BUILD — ${status}`);
  console.log(`  fp ${groups.length} / master ${masterIds.length} · writePlan KO ${writePlan.ko} + EN ${writePlan.en} = ${writePlan.total}`);
  console.log(`  fp 재현 ${fpReproduced}/${masterIds.length} · fp내 mismatch ${fpAxisHeterogeneous.length} · 원문 결손 ${sourceMissing} · 점안 접미 ${routeOphthalmic} · 경로충돌 ${routeConflict}`);
  console.log(`  HOLD fp ${holdFpHit.length} / master ${holdMasterHit.length} · LIVE master ${liveMasterHit.length} · sourceRef ${liveSrefRows.length} · authored ko ${authoredRows.length} · en ${enCanonRows.length}`);
  console.log(`  KO 구성 가능 ${koComposable}/${groups.length} · KO 수치누락 ${koNumericLossGroups} · KO 경구동사 ${koOralVerbGroups} · dbWrite 0`);
  console.log(`  SSOT → ${OUT_SSOT}`);
  console.log(`  저작 원문 → ${OUT_SOURCE}`);
  if (anomalies.length) { console.log(`  ⚠ 이상 ${anomalies.length}건:`); for (const a of anomalies) console.log(`   - ${a}`); }
}

if (process.argv[1] && /otc-unproduced-nonoral-unit2-ophthalmic-ssot-build\.ga\./.test(process.argv[1])) {
  void main();
}
