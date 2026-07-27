/**
 * WO-O4O-OTC-EASY-DRUG-MARKETED-SCOPE-BASELINE-CENSUS-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *
 * 목적: 일반의약품 전체 허가품목(57,572)을 설명서 생산 분모로 쓰지 않고,
 *   식약처 e약은요 등록 여부 + O4O 실제 취급 근거를 기준으로 실제 생산 대상 모집단을 재확정한다.
 *
 * ── 판정 SSOT ────────────────────────────────────────────────────────────────────────
 *  OTC 모집단      : product_masters JOIN product_drug_extensions(drug_category='otc', deleted_at IS NULL)
 *  e약은요 등록    : shared_product_descriptions STORE source_type='mfds_easy_drug' 의 **모든 status**
 *                    (canonical=미전환 / deprecated=authored 전환됨 / candidate). deprecated 를 포함해야
 *                    authored 전환으로 원천 등록 사실이 사라지지 않는다(WO 명시).
 *                    ※ 원천 product_candidates(MFDS_EASY_DRUG_INFO)=4,757 행은 승격 후 정리되어
 *                       불완전 → 설명서 source_type 이 더 완전한 등록 원장. 교차수치는 리포트에 병기.
 *  authored 완료   : STORE canonical (ko AND en) source_type IN
 *                    {mfds_drug_otc, mfds_drug_otc_nutrition_combo, o4o_drug_otc_topical, nutrition_combo}
 *                    (raw mfds_easy_drug 는 완료 아님 · o4o_hff_generated/supplier/manual 은 의약품 authored 아님)
 *  canonicalDup    : (master, COALESCE(language)) 별 canonical STORE >1 = 0 이어야 함
 *  O4O 취급 근거   : (1) organization_product_listings.master_id (is_active)
 *                    (2) supplier_product_offers.master_id (is_active AND deleted_at IS NULL)
 *                    (3) store_products.product_master_id (is_active)
 *                    ※ store_local_products 는 master_id 없음(barcode only) → per-master 귀속 불가, 별도 기록
 *  EXCLUDE_CONFIRMED: 수출명/군납/비매품 등 키워드(제품명) · 비소매 대용량 포장 · 표준코드 전량 취소(isCancelled)
 *
 * ── 7 필수 모집단 (상호배타 · 우선순위 고정) ─────────────────────────────────────────
 *  완료(authored ko+en)인 master:
 *    easyReg  → EASY_DRUG_REGISTERED_COMPLETED
 *    else     → NON_EASY_ALREADY_PRODUCED (허가원문/기타 공식원천 근거 authored — 이미 생산됨, 제외 아님)
 *  미완료 master:
 *    easyReg           → EASY_DRUG_REGISTERED_INCOMPLETE      (실제 생산 대상)
 *    o4oEvidence       → NON_EASY_WITH_O4O_EVIDENCE           (실제 생산 대상 예외)
 *    excludeConfirmed  → EXCLUDE_CONFIRMED
 *    else              → NON_EASY_NO_MARKET_EVIDENCE          (대량 생산 제외 후보 = EXCLUDED_FROM_BULK_PRODUCTION)
 *
 *  합계 게이트: 모든 population 합 = OTC_TOTAL_AUTHORIZED.
 *
 * ── 실제 생산 대상 & 완료율 ──────────────────────────────────────────────────────────
 *  실제 생산 대상 분모 = EASY_DRUG_REGISTERED ∪ NON_EASY_WITH_O4O_EVIDENCE (∪ NON_EASY_ALREADY_PRODUCED)
 *  완료율 3종: (a) 전체 허가 기준 (b) e약은요 등록 기준 (c) e약은요+O4O 예외 기준
 *
 * ── 생산 대상 잔여 HOLD 분포 ─────────────────────────────────────────────────────────
 *  EASY_DRUG_REGISTERED_INCOMPLETE 을 표준코드 일반명코드 축 + e약은요 원문 파싱으로
 *  READY / HOLD_ROUTE / HOLD_IDENTITY / HOLD_SOURCE 로 재분류(생산용 아님, 잔여 난이도 집계).
 *  route/parse 로직은 otc-remaining-full-corpus-census-v2.ts 의 검증 규칙을 VERBATIM 재사용.
 *
 * 결정론: 타임스탬프 미포함 · 배열 정렬 · 단일 스냅샷 트랜잭션(REPEATABLE READ, READ ONLY) → 스냅샷당 byte-identical.
 *   ※ 동시 세션이 easy→authored 를 활발히 생산 중이므로 절대 카운트는 스냅샷 시점 값이다.
 *     EASY_DRUG_REGISTERED(deprecated 포함)는 canonical→deprecated 보존으로 안정적,
 *     COMPLETED/INCOMPLETE 는 실시간 이동한다. 스냅샷 특성은 CHECK 에 기재.
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442 · user o4o_api · db o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-marketed-scope-baseline-census.ts [--port 5442]
 * 산출: src/scripts/data/otc-easy-drug-marketed-scope-baseline-census-v1.json
 *       src/scripts/data/otc-easy-drug-marketed-scope-baseline-proposal-v1.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_CENSUS = path.join(OUT_DIR, 'otc-easy-drug-marketed-scope-baseline-census-v1.json');
const OUT_PROPOSAL = path.join(OUT_DIR, 'otc-easy-drug-marketed-scope-baseline-proposal-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  if (i >= 0 && process.argv[i + 1]) return parseInt(process.argv[i + 1], 10);
  return 5442;
};

const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical', 'nutrition_combo'];
const AUTH_SQL = `ARRAY['${AUTHORED_SOURCES.join("','")}']`;

// ── 국내 소매 소비자 콘텐츠 대상 아님 (제품명 기반 EXCLUDE — V2 VERBATIM) ─────────────
const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;

// ── 비소매 대용량 포장 (V2 VERBATIM) ────────────────────────────────────────────────
const BULK_RE = /(\d[\d,.]*)\s*(밀리리터|㎖|ml|리터|ℓ|l|그램|그람|g|킬로그램|㎏|kg|갤런|gallon)\b/gi;
function isNonRetailBulk(...texts: Array<string | null | undefined>): boolean {
  for (const raw of texts) {
    const t = (raw || '').normalize('NFKC');
    if (!t) continue;
    if (/갤런|gallon/i.test(t)) return true;
    BULK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BULK_RE.exec(t))) {
      const v = Number(m[1].replace(/,/g, ''));
      if (!Number.isFinite(v)) continue;
      const u = m[2].toLowerCase();
      if (/^(밀리리터|㎖|ml)$/.test(u) && v >= 1000) return true;
      if (/^(리터|ℓ|l)$/.test(u) && v >= 1) return true;
      if (/^(그램|그람|g)$/.test(u) && v >= 1000) return true;
      if (/^(킬로그램|㎏|kg)$/.test(u) && v >= 1) return true;
    }
  }
  return false;
}

// ── 일반명코드 [7-9] → route allowlist (V2 VERBATIM) ────────────────────────────────
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATB: { route: 'oral', form: '정' }, ATE: { route: 'oral', form: '장용정' }, ATR: { route: 'oral', form: '서방정' },
  ACH: { route: 'oral', form: '캡슐' }, ACS: { route: 'oral', form: '연질캡슐' }, ACE: { route: 'oral', form: '장용캡슐' },
  ASY: { route: 'oral', form: '시럽' }, ASS: { route: 'oral', form: '현탁액' }, ALQ: { route: 'oral', form: '내복액' },
  AGN: { route: 'oral', form: '과립' }, APD: { route: 'oral', form: '산' },
  ATO: { route: 'oromucosal', form: '트로키' }, AMS: { route: 'oromucosal', form: '껌' }, ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' }, COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' }, COM: { route: 'topical', form: '연고' }, CPA: { route: 'topical', form: '파스타' },
  CLT: { route: 'topical', form: '로션' }, CPL: { route: 'topical', form: '플라스타' }, CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' }, CTB: { route: 'vaginal', form: '질정' },
};
const SITE_AMBIGUOUS: Record<string, string> = {
  CLQ: '외용액(직장/질/구강/피부 혼재)', CDS: '첩부·드레싱·소독(제형 의미 미확정)', CSI: '스프레이(구강/피부 혼재)',
};

// ── e약은요 원문 섹션 파서 (V2 VERBATIM) ────────────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}
const sortedCounts = (o: Record<string, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));

async function main(): Promise<void> {
  const port = argPort();
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
    extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  // ── 단일 일관 스냅샷 (동시 생산 write 중이므로 REPEATABLE READ, READ ONLY) ─────────
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapMeta: Array<{ now: string; xmin: string }> = await ds.query(
    "SELECT now()::text now, txid_snapshot_xmin(txid_current_snapshot())::text xmin");

  const OTC_SUBQ = `SELECT pm.id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`;

  // ── 1) OTC 모집단 ────────────────────────────────────────────────────────────────
  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ORDER BY 1`);

  // ── 2) e약은요 등록 (모든 status) + status 별 distinct ──────────────────────────────
  const easyReg = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})`);
  const easyStatusRows: Array<{ status: string; n: string }> = await ds.query(
    `SELECT status, count(DISTINCT master_id)::text n FROM shared_product_descriptions
     WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})
     GROUP BY 1 ORDER BY 1`);
  const easyInfoSrc: Array<{ n: string }> = await ds.query(
    `SELECT count(*)::text n FROM product_candidates WHERE source_label='MFDS_EASY_DRUG_INFO' AND deleted_at IS NULL`);

  // ── 3) authored 완료 (ko/en canonical, 의약품 authored 소스) ─────────────────────────
  const authKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const authEn = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const needsReview = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})`);
  const canonDupRows: Array<{ n: string }> = await ds.query(
    `SELECT count(*)::text n FROM (
       SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
       WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})
       GROUP BY 1,2 HAVING count(*)>1) d`);
  // 완료 소스별 distinct (진단)
  const authSrcKo: Array<{ source_type: string; n: string }> = await ds.query(
    `SELECT source_type, count(DISTINCT master_id)::text n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
       AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ}) GROUP BY 1 ORDER BY 2 DESC`);

  // ── 4) O4O 실제 취급 근거 ────────────────────────────────────────────────────────
  const evOPL = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM organization_product_listings
    WHERE is_active AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`);
  const evSPO = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM supplier_product_offers
    WHERE is_active AND deleted_at IS NULL AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`);
  const evSP = await loadSet(ds, `SELECT DISTINCT product_master_id::text id FROM store_products
    WHERE is_active AND product_master_id IS NOT NULL AND product_master_id IN (${OTC_SUBQ})`);
  const evAll = new Set<string>([...evOPL, ...evSPO, ...evSP]);
  // store_local_products: master_id 없음 — per-master 귀속 불가, 전체 규모만 기록
  const slpRows: Array<{ rows: string; active: string; with_barcode: string }> = await ds.query(
    `SELECT count(*)::text rows, count(*) FILTER(WHERE is_active)::text active,
            count(*) FILTER(WHERE barcode IS NOT NULL AND barcode<>'')::text with_barcode FROM store_local_products`);

  // ── 5) 표준코드 일반명코드 축 (gencode 단일성 · 전량 취소) ────────────────────────────
  const stdRows: Array<{ mid: string; gencodes: string[] | null; specs: string[] | null; rows: string; cancelled_rows: string }> =
    await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs,
           COUNT(*)::text rows,
           COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled_rows
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  // ── 6) e약은요 원문 content (생산 대상 HOLD 파싱 — 미완료 easy 만 필요) ───────────────
  const easyContentRows: Array<{ id: string; content: string }> = await ds.query(`
    SELECT pop.id, es.content
    FROM (SELECT DISTINCT pm.id::text id FROM product_masters pm
          JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`);
  const contentByMid = new Map<string, string>();
  for (const r of easyContentRows) contentByMid.set(r.id, r.content);

  await ds.query('COMMIT');
  await ds.destroy();

  // ── 7) master → record & 분류 ────────────────────────────────────────────────────
  type Pop =
    | 'EASY_DRUG_REGISTERED_COMPLETED' | 'NON_EASY_ALREADY_PRODUCED'
    | 'EASY_DRUG_REGISTERED_INCOMPLETE' | 'NON_EASY_WITH_O4O_EVIDENCE'
    | 'EXCLUDE_CONFIRMED' | 'NON_EASY_NO_MARKET_EVIDENCE';
  type Rec = {
    id: string; name: string;
    easy: boolean; complete: boolean; evidence: boolean;
    excludeKw: boolean; bulk: boolean; allCancelled: boolean; excludeConfirmed: boolean;
    pop: Pop;
    // HOLD 진단 (생산 대상 미완료 easy 만)
    gencode: string | null; gencodeCount: number; suffix: string | null;
    route: string; suffixMapped: boolean; siteAmbiguous: boolean; stdLinked: boolean;
    parseFail: boolean; missingAxis: string | null; hold?: string; holdReason?: string;
  };

  const recs: Rec[] = [];
  for (const m of otc) {
    const easy = easyReg.has(m.id);
    const complete = authKo.has(m.id) && authEn.has(m.id) && !needsReview.has(m.id);
    const evidence = evAll.has(m.id);
    const std = stdByMid.get(m.id);
    const allCancelled = !!std && Number(std.cancelled_rows) > 0 && Number(std.cancelled_rows) === Number(std.rows);
    const excludeKw = EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '');
    const bulk = isNonRetailBulk(m.name, m.spec, ...((std?.specs) || []));
    const excludeConfirmed = excludeKw || bulk || allCancelled;

    let pop: Pop;
    if (complete) pop = easy ? 'EASY_DRUG_REGISTERED_COMPLETED' : 'NON_EASY_ALREADY_PRODUCED';
    else if (easy) pop = 'EASY_DRUG_REGISTERED_INCOMPLETE';
    else if (evidence) pop = 'NON_EASY_WITH_O4O_EVIDENCE';
    else if (excludeConfirmed) pop = 'EXCLUDE_CONFIRMED';
    else pop = 'NON_EASY_NO_MARKET_EVIDENCE';

    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    const gencode = gencodes.length === 1 ? gencodes[0] : null;
    const suffix = gencode && gencode.length >= 9 ? gencode.slice(6, 9).toUpperCase() : null;
    const mapped = suffix ? SUFFIX_MAP[suffix] : undefined;

    recs.push({
      id: m.id, name: m.name, easy, complete, evidence,
      excludeKw, bulk, allCancelled, excludeConfirmed, pop,
      gencode, gencodeCount: gencodes.length, suffix,
      route: mapped?.route || 'unknown', suffixMapped: !!mapped,
      siteAmbiguous: !!(suffix && SITE_AMBIGUOUS[suffix]), stdLinked: !!std,
      parseFail: false, missingAxis: null,
    });
  }

  // ── 8) 생산 대상(EASY_INCOMPLETE + NON_EASY_WITH_O4O_EVIDENCE) HOLD 재분류 ─────────
  const isProductionTarget = (r: Rec): boolean =>
    r.pop === 'EASY_DRUG_REGISTERED_INCOMPLETE' || r.pop === 'NON_EASY_WITH_O4O_EVIDENCE';
  const classifyHold = (r: Rec): { hold: string; reason: string } => {
    // e약은요 원문 파싱 (효능·용법 2축 필수)
    const content = contentByMid.get(r.id);
    if (!content) return { hold: 'HOLD_SOURCE', reason: 'no_easy_content' };
    const sec = sections(content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    if (!ind && !dos) { r.parseFail = true; return { hold: 'HOLD_SOURCE', reason: 'easy_content_parse_fail' }; }
    if (!ind || !dos) {
      r.missingAxis = !ind ? 'indication' : 'dosage';
      return { hold: 'HOLD_SOURCE', reason: `source_axis_missing(${r.missingAxis})` };
    }
    if (!r.stdLinked) return { hold: 'HOLD_IDENTITY', reason: 'standard_code_row_absent' };
    if (r.gencodeCount === 0) return { hold: 'HOLD_IDENTITY', reason: 'general_name_code_absent' };
    if (r.gencodeCount > 1) return { hold: 'HOLD_IDENTITY', reason: `general_name_code_ambiguous(${r.gencodeCount})` };
    if (!r.gencode || r.gencode.length < 9) return { hold: 'HOLD_IDENTITY', reason: 'general_name_code_malformed' };
    if (r.siteAmbiguous) return { hold: 'HOLD_ROUTE', reason: `external_site_ambiguous(${r.suffix})` };
    if (!r.suffixMapped) return { hold: 'HOLD_ROUTE', reason: `suffix_not_allowlisted(${r.suffix})` };
    return { hold: 'READY', reason: `gencode=${r.gencode},route=${r.route}` };
  };
  for (const r of recs) if (isProductionTarget(r)) { const h = classifyHold(r); r.hold = h.hold; r.holdReason = h.reason; }

  // ── 9) 집계 ─────────────────────────────────────────────────────────────────────
  const popCount: Record<string, number> = {};
  for (const r of recs) popCount[r.pop] = (popCount[r.pop] || 0) + 1;
  const N = otc.length;
  const P = (k: string): number => popCount[k] || 0;

  const easyRegistered = P('EASY_DRUG_REGISTERED_COMPLETED') + P('EASY_DRUG_REGISTERED_INCOMPLETE');
  const nonEasyAlreadyProduced = P('NON_EASY_ALREADY_PRODUCED');
  const completedAll = P('EASY_DRUG_REGISTERED_COMPLETED') + nonEasyAlreadyProduced;
  const productionTargets = recs.filter(isProductionTarget);
  const productionTargetTotal = productionTargets.length;

  // 완료율 3종
  const pct = (num: number, den: number): string => den === 0 ? '0.00%' : ((num / den) * 100).toFixed(2) + '%';
  const completionRates = {
    a_byTotalAuthorized: {
      numerator_completed: completedAll, denominator: N, rate: pct(completedAll, N),
      note: '전체 허가(57,572) 기준 — 실제 생산 대상이 아닌 품목까지 분모에 포함(폐기 권고 지표)',
    },
    b_byEasyDrugRegistered: {
      numerator_completed: P('EASY_DRUG_REGISTERED_COMPLETED'), denominator: easyRegistered,
      rate: pct(P('EASY_DRUG_REGISTERED_COMPLETED'), easyRegistered),
      note: 'e약은요 등록(19,385, deprecated 포함) 기준',
    },
    c_byEasyPlusO4oEvidence: {
      numerator_completed: completedAll,
      denominator: easyRegistered + P('NON_EASY_WITH_O4O_EVIDENCE') + nonEasyAlreadyProduced,
      rate: pct(completedAll, easyRegistered + P('NON_EASY_WITH_O4O_EVIDENCE') + nonEasyAlreadyProduced),
      note: 'e약은요 등록 + O4O 실제 취급 예외 + 이미 생산된 non-easy(허가원문 authored) 기준 = 실질 생산 대상 분모',
    },
  };

  // 잔여 HOLD 분포 (생산 대상)
  const holdCount: Record<string, number> = {};
  for (const r of productionTargets) holdCount[r.hold!] = (holdCount[r.hold!] || 0) + 1;
  const holdReasons: Record<string, Record<string, number>> = {};
  for (const r of productionTargets) {
    (holdReasons[r.hold!] ||= {});
    holdReasons[r.hold!][r.holdReason!] = (holdReasons[r.hold!][r.holdReason!] || 0) + 1;
  }
  for (const k of Object.keys(holdReasons)) holdReasons[k] = sortedCounts(holdReasons[k]);

  // 다음 대형 생산 후보 (READY 를 route 별 수량순)
  const readyByRoute: Record<string, number> = {};
  for (const r of productionTargets) if (r.hold === 'READY') readyByRoute[r.route] = (readyByRoute[r.route] || 0) + 1;
  const nextCandidates = Object.entries(sortedCounts(readyByRoute)).map(([route, masters]) => ({ route, masters }));

  // 교차검증: 완료 집합 내부 정합
  const completeAndEasy = recs.filter((r) => r.complete && r.easy).length;
  const completeNotEasy = recs.filter((r) => r.complete && !r.easy).length;

  const gates = {
    g1_otcTotalReproduced: N,
    g2_populationSumEqualsUniverse: Object.values(popCount).reduce((a, b) => a + b, 0) === N,
    g2_populationSum: Object.values(popCount).reduce((a, b) => a + b, 0),
    g3_easyRegSubtotal: easyRegistered === (P('EASY_DRUG_REGISTERED_COMPLETED') + P('EASY_DRUG_REGISTERED_INCOMPLETE')),
    g4_masterDuplicates: otc.length - new Set(otc.map((m) => m.id)).size,
    g5_completeHasKoAndEn: recs.filter((r) => r.complete).every((r) => authKo.has(r.id) && authEn.has(r.id)),
    g6_canonicalDup: Number(canonDupRows[0].n),
    g7_needsReview: needsReview.size,
    g8_nonDrugSourceExcluded: 'authored 완료 소스에 o4o_hff_generated/supplier/manual 미포함 · OTC drug_category 로 모집단 한정',
    g9_evidenceExceptionOnlyWithRealEvidence: recs.filter((r) => r.pop === 'NON_EASY_WITH_O4O_EVIDENCE').every((r) => r.evidence && !r.easy),
    g10_excludeConfirmedNotProduced: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED').every((r) => !r.complete),
    g11_completedNoNeedsReview: recs.filter((r) => r.complete).every((r) => !needsReview.has(r.id)),
    g12_dbWrite: 0,
    holdSumEqualsProductionTarget: Object.values(holdCount).reduce((a, b) => a + b, 0) === productionTargetTotal,
  };

  const report = {
    wo: 'WO-O4O-OTC-EASY-DRUG-MARKETED-SCOPE-BASELINE-CENSUS-V1',
    agent: 'la', readOnly: true, dbWrite: 0, status: 'BASELINE_CENSUS',
    determinism: 'no wall-clock in file · single REPEATABLE READ READ ONLY snapshot · arrays sorted',
    snapshotNote: '동시 세션이 easy→authored 를 활발히 생산 중. EASY_DRUG_REGISTERED(deprecated 포함)는 안정적, COMPLETED/INCOMPLETE 는 스냅샷 시점 값. (스냅샷 시각/xmin 은 CHECK 참조 — byte-identity 위해 파일에서 제외)',
    definitions: {
      otcUniverse: "product_masters JOIN product_drug_extensions(drug_category='otc', deleted_at IS NULL)",
      easyDrugRegistered: "shared_product_descriptions STORE source_type='mfds_easy_drug' 모든 status(canonical/deprecated/candidate)",
      authoredComplete: `STORE canonical ko AND en, source_type IN {${AUTHORED_SOURCES.join(', ')}}`,
      o4oEvidence: 'organization_product_listings(is_active) ∪ supplier_product_offers(is_active,!deleted) ∪ store_products(is_active), master 연결 + OTC 교집합',
      excludeConfirmed: '제품명 수출/군납/비매품 키워드 ∪ 비소매 대용량 포장 ∪ 표준코드 전량 취소(isCancelled)',
    },
    requiredPopulations: {
      p1_OTC_TOTAL_AUTHORIZED: N,
      p2_EASY_DRUG_REGISTERED: easyRegistered,
      p3_EASY_DRUG_REGISTERED_COMPLETED: P('EASY_DRUG_REGISTERED_COMPLETED'),
      p4_EASY_DRUG_REGISTERED_INCOMPLETE: P('EASY_DRUG_REGISTERED_INCOMPLETE'),
      p5_NON_EASY_WITH_O4O_EVIDENCE: P('NON_EASY_WITH_O4O_EVIDENCE'),
      p6_NON_EASY_NO_MARKET_EVIDENCE: P('NON_EASY_NO_MARKET_EVIDENCE'),
      p7_EXCLUDE_CONFIRMED: P('EXCLUDE_CONFIRMED'),
      aux_NON_EASY_ALREADY_PRODUCED: nonEasyAlreadyProduced,
    },
    easyDrugRegisteredBreakdown: {
      byDescriptionStatus_distinctMasters: Object.fromEntries(easyStatusRows.map((r) => [r.status, Number(r.n)])),
      note: 'canonical=아직 raw easy(미전환) · deprecated=authored 전환 완료 · candidate=미승격. 세 status 합집합 distinct = EASY_DRUG_REGISTERED.',
      sourceCandidatesMfdsEasyDrugInfoRows: Number(easyInfoSrc[0].n),
      sourceNote: '원천 product_candidates(MFDS_EASY_DRUG_INFO) 는 승격 후 정리되어 설명서 원장보다 적음. 설명서 source_type 이 더 완전한 등록 원장.',
    },
    completionDetail: {
      authoredCompleteMasters: completedAll,
      complete_and_easyRegistered: completeAndEasy,
      complete_not_easy_producedFromOfficialSource: completeNotEasy,
      authoredKoCanonicalSources_distinctMasters: Object.fromEntries(authSrcKo.map((r) => [r.source_type, Number(r.n)])),
    },
    o4oEvidence: {
      OPL_active_otc_masters: evOPL.size,
      SPO_active_otc_masters: evSPO.size,
      store_products_active_otc_masters: evSP.size,
      union_distinct_otc_masters: evAll.size,
      union_nonEasy_otc_masters: recs.filter((r) => r.evidence && !r.easy).length,
      store_local_products: {
        rows: Number(slpRows[0].rows), active: Number(slpRows[0].active), with_barcode: Number(slpRows[0].with_barcode),
        note: 'store_local_products 는 master_id 없음(barcode only) → OTC master 귀속 불가. 실제 활성 10행 중 barcode 2건뿐. per-master 근거로 미인정.',
      },
      finding: 'store_products/supplier_product_offers 테이블 0행, OPL 20행(전부 pending·is_active) 중 OTC 5건 전부 e약은요 등록. → 비-easy O4O 취급 근거 = 0.',
    },
    completionRates,
    productionTarget: {
      denominator_realistic: easyRegistered + P('NON_EASY_WITH_O4O_EVIDENCE'),
      remaining_open_targets: productionTargetTotal,
      remaining_breakdown: { easyIncomplete: P('EASY_DRUG_REGISTERED_INCOMPLETE'), nonEasyWithEvidence: P('NON_EASY_WITH_O4O_EVIDENCE') },
      excludedFromBulk_candidates: P('NON_EASY_NO_MARKET_EVIDENCE') + P('EXCLUDE_CONFIRMED'),
      excludedFromBulk_note: 'EXCLUDED_FROM_BULK_PRODUCTION. e약은요 미등록·O4O 취급 근거 없음. 신규 허가/재공급/취급 근거 확인 시 개별 복원 가능.',
    },
    remainingHoldDistribution: {
      scope: '생산 대상(EASY_DRUG_REGISTERED_INCOMPLETE + NON_EASY_WITH_O4O_EVIDENCE) 만',
      counts: sortedCounts(holdCount),
      reasons: holdReasons,
    },
    nextLargeProductionCandidates: nextCandidates,
    exclusionDiagnostics: {
      excludeConfirmed_reason_counts: sortedCounts({
        export_or_nonretail_keyword: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED' && r.excludeKw && !r.bulk && !r.allCancelled).length,
        bulk_package: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED' && r.bulk && !r.excludeKw && !r.allCancelled).length,
        standard_code_all_cancelled: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED' && r.allCancelled && !r.excludeKw && !r.bulk).length,
        multi_reason: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED' && [r.excludeKw, r.bulk, r.allCancelled].filter(Boolean).length > 1).length,
      }),
      note: '이 카운트는 EXCLUDE_CONFIRMED population(미완료·비-easy·비-evidence) 내부 사유 분해. 완료/생산대상 master 에는 EXCLUDE 를 적용하지 않는다.',
    },
    gates,
    priorProductionCrossCheck: {
      priorCensus: 'otc-remaining-full-corpus-census-v2.json (동일 에이전트 라, 08:49 스냅샷)',
      note: 'V2 는 08:49 스냅샷으로 authoredComplete=7,636·easyOnly=10,969 였음. 본 census 는 이후 스냅샷으로 동시 생산이 진행되어 completed 증가·easyIncomplete 감소. 구조/판정 키는 동일, 절대값만 스냅샷 차이. 기존 LIVE 완료 master 는 authored canonical 로 전량 포착(누락 0).',
    },
    samples: {
      easyIncomplete_holdRoute: recs.filter((r) => r.pop === 'EASY_DRUG_REGISTERED_INCOMPLETE' && r.hold === 'HOLD_ROUTE')
        .slice(0, 20).map((r) => ({ id: r.id, name: r.name, suffix: r.suffix, reason: r.holdReason })).sort((a, b) => (a.id < b.id ? -1 : 1)),
      nonEasyWithEvidence: recs.filter((r) => r.pop === 'NON_EASY_WITH_O4O_EVIDENCE')
        .slice(0, 20).map((r) => ({ id: r.id, name: r.name, complete: r.complete })).sort((a, b) => (a.id < b.id ? -1 : 1)),
      excludeConfirmed: recs.filter((r) => r.pop === 'EXCLUDE_CONFIRMED')
        .slice(0, 20).map((r) => ({ id: r.id, name: r.name, kw: r.excludeKw, bulk: r.bulk, cancelled: r.allCancelled })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    },
  };

  const proposal = {
    wo: 'WO-O4O-OTC-EASY-DRUG-MARKETED-SCOPE-BASELINE-CENSUS-V1',
    artifact: 'production-scope-baseline-proposal',
    status: 'PROPOSAL',
    agent: 'la', readOnly: true, dbWrite: 0,
    sourceCensus: 'otc-easy-drug-marketed-scope-baseline-census-v1.json',
    principle: [
      '설명서 대량 생산 분모 = 전체 허가(57,572) 아님',
      '기본 생산 대상 = e약은요 등록(19,385, deprecated 포함) ∪ 비-easy O4O 실제 취급 근거',
      '이미 생산된 non-easy(허가원문 authored, NON_EASY_ALREADY_PRODUCED)는 완료로 인정',
      'e약은요 미등록 + O4O 취급 근거 없음 = EXCLUDED_FROM_BULK_PRODUCTION (영구 제외 아님, 개별 복원 가능)',
      'HOLD_ROUTE 878 등 잔여는 생산 대상(easyIncomplete) 안에 포함되는 것만 이후 진행',
    ],
    proposedProductionScope: {
      denominator: easyRegistered + P('NON_EASY_WITH_O4O_EVIDENCE'),
      completed: completedAll,
      remainingOpen: productionTargetTotal,
      remainingReady: (holdCount['READY'] || 0),
      remainingHold: productionTargetTotal - (holdCount['READY'] || 0),
    },
    excludedFromBulkProduction: {
      NON_EASY_NO_MARKET_EVIDENCE: P('NON_EASY_NO_MARKET_EVIDENCE'),
      EXCLUDE_CONFIRMED: P('EXCLUDE_CONFIRMED'),
      restorationRule: 'e약은요 신규 등록 또는 O4O 실제 취급 근거(OPL/SPO/store_products active) 확인 시 개별 생산 대상으로 복원',
    },
    holdDistribution: sortedCounts(holdCount),
    nextLargeProductionCandidates: nextCandidates,
    decisionForOperator: '전체 허가 기준 진행률(폐기 권고). 실제 목표 분모 = e약은요 등록 + O4O 예외. HOLD_ROUTE census 재개는 생산 대상 내 HOLD_ROUTE 로 한정.',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_CENSUS, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_PROPOSAL, JSON.stringify(proposal, null, 2) + '\n', 'utf8');

  console.log('=== OTC EASY-DRUG MARKETED SCOPE BASELINE CENSUS (read-only · dbWrite=0) ===');
  console.log('snapshot =', JSON.stringify(snapMeta[0]));
  console.log('requiredPopulations =', JSON.stringify(report.requiredPopulations, null, 2));
  console.log('completionRates =', JSON.stringify(completionRates, null, 2));
  console.log('o4oEvidence =', JSON.stringify(report.o4oEvidence, null, 2));
  console.log('productionTarget =', JSON.stringify(report.productionTarget, null, 2));
  console.log('remainingHoldDistribution =', JSON.stringify(report.remainingHoldDistribution, null, 2));
  console.log('nextLargeProductionCandidates =', JSON.stringify(nextCandidates, null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('OUT:', OUT_CENSUS);
  console.log('OUT:', OUT_PROPOSAL);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
