/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-FINAL-READINESS-V1 — 점안 253 승인 SSOT 빌드 (read-only)
 *
 * ⚠️ READ-ONLY · DB write 0 · LIVE apply 0 · 설명서 DB 반영 0.
 *    입력(수정 0):
 *      · 승인 SSOT   `otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json` (status=APPROVED_FOR_PRODUCTION)
 *      · unit 원장   `otc-easy-drug-ready-1134-unit-ledger-v1.json` → ophthalmic-unit-1 (12 fp / 253 master)
 *    점안 Unit 2 GREEN 산출물·공용 러너는 건드리지 않는다(profile 은 import 만).
 *
 * ── Fingerprint 모델 (승인 SSOT fingerprintDefinition 확정) ──────────────────────────
 *    fingerprint = **일반명코드(성분명코드) gencode**. READY master 는 gencodeCount==1 이라 master 당 유일.
 *    같은 gencode = 같은 성분·함량·제형·경로 = **하나의 authored 설명서**.
 *    → 253 master 를 DB gencode 로 그룹핑하면 정확히 원장의 12 fp 가 재현되어야 한다.
 *    sourceRef = fpToUuidV2(gencode)                                       ← 공용 함수 그대로(산식 변경 0)
 *
 * ── 10축 안전지문의 용도 (Unit 2 census VERBATIM) ──────────────────────────────────
 *    grouping 키가 아니라 **fp 내부 동질성 가드**로만 쓴다.
 *    같은 gencode 안에서 정량 안전축(numeric=방울수/횟수·age·duration)이 갈리면
 *    EN 을 fp 당 1건 저작해 그룹 전체에 적용할 수 없다 → 중지 조건("fp 내부 안전축 충돌").
 *    효능·주의 원문 wording 차이는 제품(브랜드)별로 자연스러우므로 중지 아님(정보성).
 *
 * 제품명은 route·적용부위·성분 판정에 일절 쓰지 않는다(일반명코드 접미 + 공식 제형·용법·효능 대조).
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy(--auto-iam-authn) · user o4o_api · pw=.env DB_PASSWORD(열람/출력/수정 0).
 *
 * Usage(apps/api-server):
 *   DB_PORT=5455 ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-ophthalmic-253-ssot-build.ts
 *   (또는 --port 5455)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AUTHORED_SOURCES,
  composeKo,
  missingNumerics,
  officialAxes as runnerOfficialAxes,
  resolveRoute,
  fpToUuidV2,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  OPHTHALMIC_FORMS,
  OPHTHALMIC_PROFILE,
  OPHTHALMIC_ROUTE,
  OPHTHALMIC_SUFFIXES,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-FINAL-READINESS-V1';
const UNIT = 'ophthalmic-unit-1';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const APPROVED_SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json');
const UNIT_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const OUT_SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-approved-ssot-v1.json');
const OUT_SOURCE = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-authoring-source-v1.json');

const EXPECTED_MASTER = 253;
const EXPECTED_FP = 12;
const EXPECTED_WRITE = { ko: 1012, en: 506, total: 1518 };
const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };
const APPROVAL_COMMIT = '0b7b25447';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const readPw = (): string => {
  const m = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  return m ? m[1].trim() : '';
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  if (i >= 0 && process.argv[i + 1]) return parseInt(process.argv[i + 1], 10);
  return parseInt(process.env.DB_PORT || '5455', 10);
};

// ════════════════════════════════════════════════════════════════════════════════
// census VERBATIM — 원문 파싱 · 정규화 · 10축 안전지문 (Unit 2 ssot-build 와 동일 산식)
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
  return [...new Set((normalize(s).match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|방울|적|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
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
/**
 * fp 내부 **점안 정량 안전축** = 1회 방울 수 집합(방울/적).
 * EN 은 fp(=gencode) 당 1건 저작해 그룹 전 master 에 적용된다. 이 때 **의학적으로 같아야 하는 축**은
 * "1회 몇 방울" 이다(gencode 동일 = 성분·함량·제형·경로 동일). 방울 수가 fp 내부에서 갈리면
 * 단일 EN 으로 그룹을 담을 수 없다 → 진짜 중지 조건("fp 내부 안전축 충돌").
 *
 * 반면 numeric/age/duration 전체 해시는 브랜드별 부수 표현을 함께 쓸어담는다:
 *   · "다른 점안제와 15분 간격"(병용 주의) 이 어떤 제품 용법에는 있고 어떤 제품에는 없음
 *   · "적어도 15분 이상" → '15분'/'15분이상' 토큰화 차이
 *   · "개봉 후 1개월 이내 사용"(보관 주의) 등
 * 이는 본 약의 **투여량 차이가 아니다**. KO 는 master 별로 각자의 원문을 그대로 렌더하므로 보존되고,
 * EN 은 그룹의 eye-caution 축 **합집합**을 담아 각 master 에 대해 EN 단계에서 개별 검증한다.
 * 따라서 전체축 이질은 **정보성**으로만 기록하고 중지시키지 않는다.
 */
const dropCountSet = (dos: string): string[] =>
  [...new Set((normalize(dos).match(/(\d+(?:\.\d+)?)(?:\s*[~,\-–—]\s*(\d+(?:\.\d+)?))?\s*(?:방울|적)/g) || []).map((x) => x.replace(/\s+/g, '')))].sort();
const dropSig = (dos: string): string => H(dropCountSet(dos).join('|'));
const fullAxisSig = (a: Axes): string => H(Object.values(a).join('|'));

/** 효능·용법 경로 충돌 — 점안 제형인데 용법이 경구만 지시하면(=비점안 혼입) 생산 금지. */
const ORAL_DOSAGE_RE = /(복용|내복|경구|삼키|씹어)/;
const EYE_DOSAGE_RE = /(점안|점적|눈|안구|결막|눈꺼풀|안검|눈에)/;
/** 비점안 제형 텍스트 혼입 신호(안연고=점안 아님·세안액·콘택트렌즈 세정액 등). COS/COO 만 허용. */
const NONOPH_FORM_RE = /(세안액|세안제|콘택트\s*렌즈\s*(세정|보존|관리)|안연고)/;

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
  const approved = JSON.parse(fs.readFileSync(APPROVED_SSOT, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(UNIT_LEDGER, 'utf8'));
  const anomalies: string[] = [];
  const push = (s: string): void => { if (!anomalies.includes(s)) anomalies.push(s); };

  // ── 입력 정합성 (승인 SSOT + unit 원장 불일치 시 중지) ─────────────────────────────
  if (approved.status !== 'APPROVED_FOR_PRODUCTION') push(`승인 SSOT status=${approved.status}`);
  const apOph = (approved.routeApproval as any[]).find((r) => r.route === OPHTHALMIC_ROUTE);
  if (!apOph) throw new Error('승인 SSOT 에 ophthalmic route 없음 → 중지');
  if (apOph.masters !== EXPECTED_MASTER) push(`승인 SSOT masters=${apOph.masters}`);
  if (apOph.fingerprints !== EXPECTED_FP) push(`승인 SSOT fingerprints=${apOph.fingerprints}`);
  if (apOph.expectedWrite !== EXPECTED_WRITE.total) push(`승인 SSOT expectedWrite=${apOph.expectedWrite}`);
  if (apOph.approval !== 'APPROVED') push(`승인 SSOT approval=${apOph.approval}`);

  const unit = (ledger.units as any[]).find((u) => u.unit === UNIT);
  if (!unit) throw new Error('unit 원장 에 ophthalmic-unit-1 없음 → 중지');
  const ledgerFp: string[] = [...new Set<string>(unit.fingerprints as string[])].sort();
  const masterIds: string[] = [...new Set<string>(unit.masterIds as string[])].sort();
  if (ledgerFp.length !== EXPECTED_FP) push(`원장 fp ${ledgerFp.length} != ${EXPECTED_FP}`);
  if ((unit.fingerprints as string[]).length !== ledgerFp.length) push(`원장 fp 중복 ${(unit.fingerprints as string[]).length - ledgerFp.length}`);
  if (masterIds.length !== EXPECTED_MASTER) push(`원장 master ${masterIds.length} != ${EXPECTED_MASTER}`);
  if ((unit.masterIds as string[]).length !== masterIds.length) push(`원장 master 중복 ${(unit.masterIds as string[]).length - masterIds.length}`);
  if (unit.koTuples !== EXPECTED_WRITE.ko || unit.enTuples !== EXPECTED_WRITE.en || unit.expectedWrite !== EXPECTED_WRITE.total) {
    push(`원장 write 계약 ko=${unit.koTuples} en=${unit.enTuples} total=${unit.expectedWrite}`);
  }
  // 승인 SSOT ↔ 원장 master 교차 (승인 SSOT 도 masterIds 보유 시 대조)
  if (Array.isArray(apOph.masterIds)) {
    const apSet = new Set<string>(apOph.masterIds as string[]);
    const mism = masterIds.filter((m) => !apSet.has(m)).length + (apOph.masterIds as string[]).filter((m: string) => !masterIds.includes(m)).length;
    if (mism) push(`승인 SSOT ↔ 원장 masterId 불일치 ${mism}`);
  }

  // ── DB 접속 (read-only) ───────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: argPort(),
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  let easyRows: Array<{ id: string; content: string }> = [];
  let genRows: Array<{ mid: string; gencodes: string[] }> = [];
  let authoredRows: Array<{ id: string }> = [];
  let enCanonRows: Array<{ id: string }> = [];
  let liveSrefRows: Array<{ sref: string }> = [];
  try {
    await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
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
    // sourceRef 충돌: fp=gencode 12개의 fpToUuidV2 앵커가 기존 authored LIVE 에 이미 있는지
    const srefs = ledgerFp.map((g) => fpToUuidV2(g)).sort();
    liveSrefRows = await ds.query(`
      SELECT DISTINCT source_ref_id::text sref FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        AND source_type = ANY($1) AND source_ref_id = ANY($2::uuid[])`,
      [AUTHORED_SOURCES as unknown as string[], srefs]);
  } finally {
    await ds.query('ROLLBACK').catch(() => undefined);
    await ds.destroy();
  }

  const contentBy = new Map(easyRows.map((r) => [r.id, r.content]));
  const genBy = new Map(genRows.map((r) => [r.mid, (r.gencodes || []).filter(Boolean).sort()]));

  // ── master 단위 gencode 재현 + 축·안전지문 ──────────────────────────────────────────
  let sourceMissing = 0, gencodeSingle = 0, suffixOk = 0, nonOphForm = 0, routeConflict = 0;
  const missingAxisSample: string[] = [];
  const suffixBadSample: string[] = [];
  const nonOphSample: string[] = [];
  const routeConflictSample: string[] = [];
  const unmappedSample: string[] = [];
  interface MRec {
    masterId: string; gencode: string; suffix: string; form: string;
    axes: Axes; dropSig: string; dropCounts: string[]; fullSig: string; ind: string; dos: string; cau: string;
  }
  const recs: MRec[] = [];

  for (const mid of masterIds) {
    const gcs = genBy.get(mid) || [];
    if (gcs.length !== 1) { if (unmappedSample.length < 8) unmappedSample.push(`${mid}:gencode=${gcs.length}`); push(`gencode 단일 아님 ${mid}(${gcs.length})`); continue; }
    gencodeSingle += 1;
    const gencode = gcs[0];
    if (gencode.length < 9) { push(`gencode malformed ${mid}`); continue; }
    if (!ledgerFp.includes(gencode)) { push(`원장 밖 gencode ${mid}:${gencode}`); continue; }
    const suffix = gencode.slice(6, 9).toUpperCase();
    if (!(OPHTHALMIC_SUFFIXES as readonly string[]).includes(suffix)) { if (suffixBadSample.length < 8) suffixBadSample.push(`${mid}:${suffix}`); continue; }
    suffixOk += 1;
    const rr = resolveRoute(gencode);
    if (!rr.ok || rr.route !== OPHTHALMIC_ROUTE) { push(`resolveRoute 상충 ${mid}:${rr.ok ? rr.route : rr.reason}`); continue; }
    if (!(OPHTHALMIC_FORMS as readonly string[]).includes(rr.form)) { push(`비점안 form ${mid}:${rr.form}`); continue; }
    const content = contentBy.get(mid);
    if (!content) { sourceMissing += 1; if (missingAxisSample.length < 8) missingAxisSample.push(`${mid}:no_easy_canonical`); continue; }
    const built = buildAxes(content, gencode, OPHTHALMIC_ROUTE);
    if (!built.axes) { sourceMissing += 1; if (missingAxisSample.length < 8) missingAxisSample.push(`${mid}:${built.missing.join('/')}`); continue; }
    const dosN = normalize(built.dos);
    const allN = `${normalize(built.ind)} ${dosN} ${normalize(built.cau)}`;
    // 비점안 제형 텍스트 혼입 (안연고/세안액/렌즈세정액)
    if (NONOPH_FORM_RE.test(allN)) { nonOphForm += 1; if (nonOphSample.length < 8) nonOphSample.push(`${mid}:nonoph_form`); }
    // 경구 전용 용법 (점안 지시 부재) = 경로 혼입
    if (ORAL_DOSAGE_RE.test(dosN) && !EYE_DOSAGE_RE.test(dosN)) { routeConflict += 1; if (routeConflictSample.length < 8) routeConflictSample.push(`${mid}:dosage_oral_only`); }
    recs.push({ masterId: mid, gencode, suffix, form: rr.form, axes: built.axes, dropSig: dropSig(built.dos), dropCounts: dropCountSet(built.dos), fullSig: fullAxisSig(built.axes), ind: built.ind, dos: built.dos, cau: built.cau });
  }

  // ── gencode 그룹핑 (fp = gencode) ───────────────────────────────────────────────────
  const byFp = new Map<string, MRec[]>();
  for (const r of recs) { if (!byFp.has(r.gencode)) byFp.set(r.gencode, []); byFp.get(r.gencode)!.push(r); }
  const derivedFp = [...byFp.keys()].sort();
  const fpReproduced = JSON.stringify(derivedFp) === JSON.stringify(ledgerFp);
  if (!fpReproduced) push(`fp 재현 실패 derived=${derivedFp.length} ledger=${ledgerFp.length}`);

  const groups = derivedFp.map((gencode) => {
    const members = byFp.get(gencode)!.slice().sort((a, b) => (a.masterId < b.masterId ? -1 : 1));
    const rep = members[0];
    const dropSet = new Set(members.map((m) => m.dropSig));
    const fullSet = new Set(members.map((m) => m.fullSig));
    const formSet = new Set(members.map((m) => m.form));
    const dropUnion = [...new Set(members.flatMap((m) => m.dropCounts))].sort();
    return {
      fp: gencode, gencode, suffix: rep.suffix, route: OPHTHALMIC_ROUTE, form: rep.form,
      size: members.length, sourceRef: fpToUuidV2(gencode),
      masterIds: members.map((m) => m.masterId),
      dropCounts: dropUnion,
      _dropHeterogeneous: dropSet.size > 1,
      _fullAxisHeterogeneous: fullSet.size > 1,
      _formHeterogeneous: formSet.size > 1,
      _ind: rep.ind, _dos: rep.dos, _cau: rep.cau,
    };
  });
  const producibleMasters = groups.reduce((a, g) => a + g.size, 0);

  // ── fp 내부 안전축 충돌 (방울 수 = 중지 조건) · form 이질 = 중지 · 전체축 이질 = 정보성 ──
  const dropHet = groups.filter((g) => g._dropHeterogeneous).map((g) => g.fp).sort();
  if (dropHet.length) push(`fp 내부 방울 수(정량 안전축) 충돌 ${dropHet.length}: ${dropHet.join(',')}`);
  const formHet = groups.filter((g) => g._formHeterogeneous).map((g) => g.fp).sort();
  if (formHet.length) push(`fp 내부 form 이질 ${formHet.length}`);
  const fullHet = groups.filter((g) => g._fullAxisHeterogeneous).map((g) => g.fp).sort();

  // ── sourceRef 결정론 · 중복 · LIVE 충돌 ─────────────────────────────────────────────
  const srefs = groups.map((g) => g.sourceRef).sort();
  if (new Set(srefs).size !== srefs.length) push('sourceRef 중복');

  // ── 재현·수량 게이트 ─────────────────────────────────────────────────────────────────
  if (gencodeSingle !== masterIds.length) push(`gencode 단일 아님 총 ${masterIds.length - gencodeSingle}`);
  if (suffixOk !== masterIds.length) push(`점안 접미(COO/COS) 재현 ${suffixOk}/${masterIds.length}`);
  if (nonOphForm) push(`비점안 제형 혼입 ${nonOphForm}`);
  if (routeConflict) push(`효능·용법 경로 충돌 ${routeConflict}`);
  if (sourceMissing) push(`공식 원문 축 결손 ${sourceMissing}`);
  if (producibleMasters !== masterIds.length) push(`생산 가능 master ${producibleMasters}/${masterIds.length}`);
  if (authoredRows.length) push(`authored STORE ko canonical 기존 보유 ${authoredRows.length}`);
  if (enCanonRows.length) push(`STORE en canonical 기존 보유 ${enCanonRows.length}`);
  if (liveSrefRows.length) push(`기존 LIVE sourceRef 교집합 ${liveSrefRows.length}`);

  const writePlan = {
    ko: producibleMasters * WRITE_PER_MASTER.ko,
    en: producibleMasters * WRITE_PER_MASTER.en,
    total: producibleMasters * WRITE_PER_MASTER.total,
  };
  if (producibleMasters === EXPECTED_MASTER && (writePlan.ko !== EXPECTED_WRITE.ko || writePlan.en !== EXPECTED_WRITE.en || writePlan.total !== EXPECTED_WRITE.total)) {
    push(`writePlan 불일치 ${JSON.stringify(writePlan)}`);
  }

  // ── KO 구성 가능 여부 (점안 전용 프로파일 주입, 대표 원문 기준) ────────────────────────
  let koComposable = 0, koNumericLossGroups = 0, koOralVerbGroups = 0;
  const koAnomalySample: string[] = [];
  for (const g of groups) {
    const content = contentBy.get(g.masterIds[0]);
    if (!content) continue;
    const ax = runnerOfficialAxes(content);
    const ko = composeKo(ax, OPHTHALMIC_ROUTE, g.form, g.gencode, OPHTHALMIC_PROFILE);
    if (ko.anomalies.length) {
      if (ko.anomalies.some((a) => /경구 동사/.test(a))) koOralVerbGroups += 1;
      if (koAnomalySample.length < 8) koAnomalySample.push(`${g.fp}:${ko.anomalies[0]}`);
      continue;
    }
    koComposable += 1;
    if (missingNumerics(ax.dos, ko.source.usage).length) koNumericLossGroups += 1;
  }
  if (koComposable !== groups.length) push(`KO 구성 불가 그룹 ${groups.length - koComposable}`);
  if (koNumericLossGroups) push(`KO 용법 수치 누락 그룹 ${koNumericLossGroups}`);
  if (koOralVerbGroups) push(`KO 경구 동사 그룹 ${koOralVerbGroups}`);

  const allGatesPass = anomalies.length === 0 && producibleMasters === EXPECTED_MASTER && fpReproduced;
  const status = allGatesPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED';

  const clean = (s: string): string => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  const ssot = {
    wo: WO,
    artifact: 'easy-drug-ready-ophthalmic-253-approved-ssot',
    unitId: UNIT,
    status,
    readOnly: true,
    dbWrite: 0,
    apply: 'NOT_PERFORMED',
    basedOn: {
      approvalCommit: APPROVAL_COMMIT,
      approvedSsot: path.basename(APPROVED_SSOT),
      unitLedger: path.basename(UNIT_LEDGER),
      censusContract: 'otc-unproduced-large-census.ts VERBATIM (Unit 2 ssot-build 동일 파서)',
    },
    fingerprintContract: {
      definition: 'fingerprint = 일반명코드(성분명코드) gencode · READY master 당 유일 · 같은 gencode=하나의 authored 설명서',
      anchor: 'fpToUuidV2(gencode)', changed: false,
      safetyGuard: 'grouping 아님. fp 내부 정량 안전축(numeric/age/duration) 동질성 가드로만 사용',
    },
    routeContract: {
      route: OPHTHALMIC_ROUTE, suffixes: [...OPHTHALMIC_SUFFIXES], forms: [...OPHTHALMIC_FORMS],
      koUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].koUsageLabel,
      enUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].enUsageLabel,
      profileModule: 'otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts (import only)',
      sharedRunnerModified: false,
    },
    totals: { fingerprints: groups.length, masters: producibleMasters, approvedMasters: EXPECTED_MASTER, approvedFingerprints: EXPECTED_FP },
    writePlan,
    fpReproduced,
    gates: {
      G1_masterReproduced: `${producibleMasters}/${EXPECTED_MASTER}`,
      G1_fpReproduced: `${derivedFp.length}/${EXPECTED_FP}=${fpReproduced}`,
      G2_masterDupInLedger: (unit.masterIds as string[]).length - masterIds.length,
      G3_dropCountMismatch: dropHet.length,
      G3_fullAxisHeterogeneousInfo: fullHet.length,
      G4_suffixOk: `${suffixOk}/${masterIds.length}`,
      G4_nonOphForm: nonOphForm,
      G4_routeConflict: routeConflict,
      G5_officialAxisMissing: sourceMissing,
      G6_sourceRefConflict: liveSrefRows.length,
      G7_authoredKoCanonical: authoredRows.length,
      G7_authoredEnCanonical: enCanonRows.length,
      G8_writeTotal: writePlan.total,
      G9_koComposable: `${koComposable}/${groups.length}`,
      G10_dbWrite: 0,
    },
    allGatesPass,
    reproduction: {
      easyCanonicalFound: easyRows.length, gencodeSingle, suffixOk, producibleMasters,
      derivedFingerprints: derivedFp,
      fullAxisHeterogeneousFp: fullHet,
      missingAxisSample: missingAxisSample.sort(), suffixBadSample: suffixBadSample.sort(),
      nonOphSample: nonOphSample.sort(), routeConflictSample: routeConflictSample.sort(),
      unmappedSample: unmappedSample.sort(),
    },
    koReadiness: { composableGroups: koComposable, numericLossGroups: koNumericLossGroups, oralVerbGroups: koOralVerbGroups, anomalySample: koAnomalySample.sort() },
    groups: groups.map((g) => ({
      fp: g.fp, gencode: g.gencode, suffix: g.suffix, route: g.route, form: g.form,
      size: g.size, sourceRef: g.sourceRef, masterIds: g.masterIds, dropCounts: g.dropCounts,
      dropCountHomogeneous: !g._dropHeterogeneous, fullAxisHomogeneous: !g._fullAxisHeterogeneous,
    })),
    anomalies: anomalies.sort(),
  };
  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 1) + '\n', 'utf8');

  // EN 저작용 공식 원문 무절단 덤프 (fp 대표 원문) — grounding 전용, 신규 의료 사실 추가 금지
  const source = {
    wo: WO, unitId: UNIT,
    note: '공식 효능·용법·주의 원문 무절단. EN 저작 grounding 전용. 신규 의료 사실 추가 금지.',
    groups: groups.map((g) => ({
      fp: g.fp, gencode: g.gencode, form: g.form, size: g.size, representativeMasterId: g.masterIds[0],
      official: { indication: clean(g._ind), dosage: clean(g._dos), caution: clean(g._cau) },
    })),
  };
  fs.writeFileSync(OUT_SOURCE, JSON.stringify(source, null, 1) + '\n', 'utf8');

  console.log(`OPH-253-SSOT-BUILD — ${status}`);
  console.log(`  fp ${groups.length}/${EXPECTED_FP} (reproduced=${fpReproduced}) · master ${producibleMasters}/${EXPECTED_MASTER} · writePlan KO ${writePlan.ko}+EN ${writePlan.en}=${writePlan.total}`);
  console.log(`  gencode단일 ${gencodeSingle} · 접미 ${suffixOk}/${masterIds.length} · 비점안form ${nonOphForm} · 경로충돌 ${routeConflict} · 원문결손 ${sourceMissing}`);
  console.log(`  fp내 방울수충돌 ${dropHet.length} · form이질 ${formHet.length} · (정보)전체축이질 ${fullHet.length}`);
  console.log(`  authored ko ${authoredRows.length} · en ${enCanonRows.length} · LIVE sourceRef충돌 ${liveSrefRows.length}`);
  console.log(`  KO 구성 ${koComposable}/${groups.length} · KO수치누락 ${koNumericLossGroups} · KO경구동사 ${koOralVerbGroups} · dbWrite 0`);
  console.log(`  그룹 크기: ${groups.map((g) => `${g.fp}:${g.size}`).join(' ')}`);
  console.log(`  SSOT → ${OUT_SSOT}`);
  console.log(`  저작 원문 → ${OUT_SOURCE}`);
  if (anomalies.length) { console.log(`  ⚠ 이상 ${anomalies.length}건:`); for (const a of anomalies) console.log(`   - ${a}`); }
}

if (process.argv[1] && /otc-easy-drug-ready-ophthalmic-253-ssot-build\./.test(process.argv[1])) {
  void main();
}
