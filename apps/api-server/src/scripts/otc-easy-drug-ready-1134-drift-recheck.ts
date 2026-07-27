/**
 * WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *
 * 목적:
 *   baseline census(otc-easy-drug-marketed-scope-baseline-census-v1)의 READY 1,134 를
 *   최신 DB 와 대조하여 (1) 이미 생산된 drift(ALREADY_COMPLETED_DRIFT)를 정확히 분리하고
 *   (2) 잔여 미완료 READY 를 route(경구/외용/점안/구강점막)별 최종 승인 SSOT + 생산 단위로 확정한다.
 *
 * ── 확정 기준 (WO 고정, 변경 금지) ────────────────────────────────────────────────────
 *   공식 분모(e약은요 등록)     = 19,385
 *   완료(easyReg∩authored)      = 14,442
 *   미완료(easyReg 미완료)      = 4,943
 *   공식 완료율                 = 74.50%  (14,442 / 19,385)
 *   77.85% 는 참고치(전체 authored/easyReg)로만 표기 — 공식 아님
 *   비-easy 는 향후 대량 생산 대상 아님
 *
 * ── baseline READY 1,134 재현 (census JSON 이 masterId 원장을 보존하지 않아 결정론적 재구성) ──
 *   baseline READY = easyReg
 *     ∩ NOT baseline-complete           (baseline-complete = authored ko AND en canonical, created_at <= BASELINE_TS)
 *     ∩ structuralReady                 (baseline census classifyHold 규칙 VERBATIM: HOLD_SOURCE/HOLD_IDENTITY/HOLD_ROUTE 제외분)
 *   BASELINE_TS = 2026-07-27 03:46:25.177729+00 (baseline census 스냅샷 시각, CHECK-...-BASELINE-CENSUS-V1 기록)
 *   재현 게이트: baseline READY 정확히 1,134. 불일치 시 중지(WO 중지 조건).
 *
 * ── drift recheck ────────────────────────────────────────────────────────────────────
 *   각 baseline READY master 의 현재(스냅샷) authored ko AND en canonical 완료 여부 재점검:
 *     현재 완료  → ALREADY_COMPLETED_DRIFT (baseline 이후 타 세션이 생산 완료)
 *     현재 미완료 → REMAINING_READY (route 별 최종 승인 대상)
 *   게이트: |ALREADY_COMPLETED_DRIFT| + |REMAINING_READY| = 1,134.
 *
 * ── route 계약 & 생산 단위 (WO 고정) ──────────────────────────────────────────────────
 *   master 당 write = KO 4T + EN 2T = 6T.  (route 별 표준코드 [7-9] 접미 allowlist 로 route 확정)
 *   생산 단위 크기: route 경계 우선(단위는 route 를 넘지 않음), fingerprint 그룹 분할 없음.
 *     route 내 REMAINING_READY: <500 → 1 단위 / 500–1,200 → 2 단위 / >1,200 → 3 단위.
 *     단위 = 트랜잭션·검증 단위.
 *
 * 결정론: 타임스탬프 미포함 · 배열 정렬 · 단일 REPEATABLE READ READ ONLY 스냅샷. 스냅샷 시각/xmin 은 CHECK 에 기재.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442 · user o4o_api · db o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-1134-drift-recheck.ts [--port 5442]
 * 산출:
 *   src/scripts/data/otc-easy-drug-ready-1134-drift-recheck-v1.json          (재점검 요약 + 게이트)
 *   src/scripts/data/otc-easy-drug-ready-1134-latest-state-ledger-v1.json    (1,134 master 최신 상태 원장)
 *   src/scripts/data/otc-easy-drug-ready-1134-already-completed-drift-v1.json(drift 원장)
 *   src/scripts/data/otc-easy-drug-ready-1134-final-approval-ssot-v1.json     (status=PROPOSAL route 승인 SSOT)
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_RECHECK = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-drift-recheck-v1.json');
const OUT_LEDGER = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-latest-state-ledger-v1.json');
const OUT_DRIFT = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-already-completed-drift-v1.json');
const OUT_SSOT = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-final-approval-ssot-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');

// 확정 기준 (WO 고정)
const OFFICIAL_DENOMINATOR = 19385;
const OFFICIAL_COMPLETE = 14442;
const OFFICIAL_INCOMPLETE = 4943;
const OFFICIAL_RATE = '74.50%';
const REFERENCE_RATE = '77.85%';
const BASELINE_READY_EXPECTED = 1134;
const BASELINE_TS = '2026-07-27 03:46:25.177729+00';
const WRITE_PER_MASTER = 6; // KO 4T + EN 2T

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

// ── baseline census VERBATIM 판정 상수/파서 재사용 ──────────────────────────────────
const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical', 'nutrition_combo'];
const AUTH_SQL = `ARRAY['${AUTHORED_SOURCES.join("','")}']`;

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
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapMeta: Array<{ now: string; xmin: string }> = await ds.query(
    "SELECT now()::text now, txid_snapshot_xmin(txid_current_snapshot())::text xmin");

  const OTC_SUBQ = `SELECT pm.id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`;

  // OTC 모집단 (id/name)
  const otc: Array<{ id: string; name: string }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ORDER BY 1`);

  // e약은요 등록 (모든 status)
  const easyReg = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})`);

  // authored 완료 — 현재 스냅샷
  const authKoNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const authEnNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const needsReviewNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})`);

  // authored 완료 — baseline 시점 (created_at <= BASELINE_TS) → baseline READY 재구성용
  const authKoBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND created_at <= '${BASELINE_TS}' AND master_id IN (${OTC_SUBQ})`);
  const authEnBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND created_at <= '${BASELINE_TS}' AND master_id IN (${OTC_SUBQ})`);
  const needsReviewBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND created_at <= '${BASELINE_TS}'
      AND master_id IN (${OTC_SUBQ})`);

  // 표준코드 일반명코드 축
  const stdRows: Array<{ mid: string; gencodes: string[] | null; rows: string }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           COUNT(*)::text rows
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  // e약은요 원문 content (canonical ko 최장 — baseline census VERBATIM)
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

  // ── baseline READY 재구성 (VERBATIM classifyHold) ────────────────────────────────
  type Rec = {
    id: string; name: string;
    gencode: string | null; gencodeCount: number; suffix: string | null;
    route: string; suffixMapped: boolean; siteAmbiguous: boolean; stdLinked: boolean;
    hold: string; holdReason: string;
  };
  const classify = (id: string, name: string): Rec => {
    const std = stdByMid.get(id);
    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    const gencode = gencodes.length === 1 ? gencodes[0] : null;
    const suffix = gencode && gencode.length >= 9 ? gencode.slice(6, 9).toUpperCase() : null;
    const mapped = suffix ? SUFFIX_MAP[suffix] : undefined;
    const rec: Rec = {
      id, name, gencode, gencodeCount: gencodes.length, suffix,
      route: mapped?.route || 'unknown', suffixMapped: !!mapped,
      siteAmbiguous: !!(suffix && SITE_AMBIGUOUS[suffix]), stdLinked: !!std,
      hold: '', holdReason: '',
    };
    const content = contentByMid.get(id);
    if (!content) { rec.hold = 'HOLD_SOURCE'; rec.holdReason = 'no_easy_content'; return rec; }
    const sec = sections(content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    if (!ind && !dos) { rec.hold = 'HOLD_SOURCE'; rec.holdReason = 'easy_content_parse_fail'; return rec; }
    if (!ind || !dos) { rec.hold = 'HOLD_SOURCE'; rec.holdReason = `source_axis_missing(${!ind ? 'indication' : 'dosage'})`; return rec; }
    if (!rec.stdLinked) { rec.hold = 'HOLD_IDENTITY'; rec.holdReason = 'standard_code_row_absent'; return rec; }
    if (rec.gencodeCount === 0) { rec.hold = 'HOLD_IDENTITY'; rec.holdReason = 'general_name_code_absent'; return rec; }
    if (rec.gencodeCount > 1) { rec.hold = 'HOLD_IDENTITY'; rec.holdReason = `general_name_code_ambiguous(${rec.gencodeCount})`; return rec; }
    if (!rec.gencode || rec.gencode.length < 9) { rec.hold = 'HOLD_IDENTITY'; rec.holdReason = 'general_name_code_malformed'; return rec; }
    if (rec.siteAmbiguous) { rec.hold = 'HOLD_ROUTE'; rec.holdReason = `external_site_ambiguous(${rec.suffix})`; return rec; }
    if (!rec.suffixMapped) { rec.hold = 'HOLD_ROUTE'; rec.holdReason = `suffix_not_allowlisted(${rec.suffix})`; return rec; }
    rec.hold = 'READY'; rec.holdReason = `gencode=${rec.gencode},route=${rec.route}`;
    return rec;
  };

  const nameById = new Map(otc.map((m) => [m.id, m.name]));
  // baseline incomplete = easyReg ∩ NOT(baseline authored ko AND en AND !needsReview)
  const baselineIncomplete: string[] = [];
  for (const id of easyReg) {
    const complete = authKoBase.has(id) && authEnBase.has(id) && !needsReviewBase.has(id);
    if (!complete) baselineIncomplete.push(id);
  }
  baselineIncomplete.sort();

  const baselineHoldCount: Record<string, number> = {};
  const baselineReady: Rec[] = [];
  for (const id of baselineIncomplete) {
    const rec = classify(id, nameById.get(id) || '');
    baselineHoldCount[rec.hold] = (baselineHoldCount[rec.hold] || 0) + 1;
    if (rec.hold === 'READY') baselineReady.push(rec);
  }
  baselineReady.sort((a, b) => (a.id < b.id ? -1 : 1));

  const reproducedReadyCount = baselineReady.length;
  const reproductionOk = reproducedReadyCount === BASELINE_READY_EXPECTED;

  // ── drift recheck: 각 baseline READY master 현재 완료 여부 ──────────────────────────
  const alreadyCompletedDrift: Rec[] = [];
  const remainingReady: Rec[] = [];
  for (const rec of baselineReady) {
    const completeNow = authKoNow.has(rec.id) && authEnNow.has(rec.id) && !needsReviewNow.has(rec.id);
    if (completeNow) alreadyCompletedDrift.push(rec);
    else remainingReady.push(rec);
  }

  // ── route별 집계 + 생산 단위 ─────────────────────────────────────────────────────
  const routeGroups: Record<string, Rec[]> = {};
  for (const rec of remainingReady) (routeGroups[rec.route] ||= []).push(rec);
  const unitsForCount = (n: number): number => (n === 0 ? 0 : n < 500 ? 1 : n <= 1200 ? 2 : 3);
  const routeApproval = Object.keys(routeGroups).sort().map((route) => {
    const masters = routeGroups[route].map((r) => r.id).sort();
    const units = unitsForCount(masters.length);
    // route 내 단위 분할 (fingerprint 분할 없음, masterId 정렬 후 균등 슬라이스 — route 경계 우선)
    const unitSlices: Array<{ unit: number; count: number; masterIds: string[] }> = [];
    if (units > 0) {
      const per = Math.ceil(masters.length / units);
      for (let u = 0; u < units; u++) {
        const slice = masters.slice(u * per, (u + 1) * per);
        if (slice.length) unitSlices.push({ unit: u + 1, count: slice.length, masterIds: slice });
      }
    }
    return {
      route, approvedMasters: masters.length,
      expectedWrite: masters.length * WRITE_PER_MASTER,
      writePerMaster: WRITE_PER_MASTER, koTuplesPerMaster: 4, enTuplesPerMaster: 2,
      productionUnits: unitSlices.length, unitSlices,
      masterIds: masters,
    };
  });
  const totalApproved = remainingReady.length;
  const totalUnits = routeApproval.reduce((a, r) => a + r.productionUnits, 0);
  const totalExpectedWrite = totalApproved * WRITE_PER_MASTER;

  // suffix/route 분포 (진단)
  const remainingRouteCount: Record<string, number> = {};
  for (const r of remainingReady) remainingRouteCount[r.route] = (remainingRouteCount[r.route] || 0) + 1;
  const remainingSuffixCount: Record<string, number> = {};
  for (const r of remainingReady) remainingSuffixCount[r.suffix || 'none'] = (remainingSuffixCount[r.suffix || 'none'] || 0) + 1;

  // 기존 LIVE 완료 교집합 (승인 대상이 이미 완료된 것과 겹치면 안 됨)
  const approvedAlreadyLive = remainingReady.filter((r) => authKoNow.has(r.id) && authEnNow.has(r.id) && !needsReviewNow.has(r.id)).length;

  const gates = {
    g1_baselineReadyReproduced: reproducedReadyCount,
    g1_baselineReadyExpected: BASELINE_READY_EXPECTED,
    g1_reproductionOk: reproductionOk,
    g2_baselineIncompleteCount: baselineIncomplete.length,
    g2_baselineIncompleteExpected: OFFICIAL_INCOMPLETE,
    g2_baselineIncompleteOk: baselineIncomplete.length === OFFICIAL_INCOMPLETE,
    g3_driftPlusRemainingEqualsBaseline: alreadyCompletedDrift.length + remainingReady.length === BASELINE_READY_EXPECTED,
    g3_driftCount: alreadyCompletedDrift.length,
    g3_remainingCount: remainingReady.length,
    g4_noAlreadyCompleteInApproval: approvedAlreadyLive,
    g5_allApprovedWithinBaselineReady: remainingReady.every((r) => baselineReady.some((b) => b.id === r.id)),
    g6_routeApprovalSumEqualsRemaining: routeApproval.reduce((a, r) => a + r.approvedMasters, 0) === remainingReady.length,
    g7_expectedWriteConsistent: totalExpectedWrite === totalApproved * WRITE_PER_MASTER,
    g8_dbWrite: 0,
  };

  const nowIso = snapMeta[0].now;
  const xmin = snapMeta[0].xmin;

  // ── 산출물 ───────────────────────────────────────────────────────────────────────
  const recheck = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1',
    agent: 'la', readOnly: true, dbWrite: 0, status: 'DRIFT_RECHECK',
    determinism: 'no wall-clock in ledger fields · arrays sorted · single REPEATABLE READ READ ONLY snapshot',
    fixedCriteria: {
      officialDenominator_easyDrugRegistered: OFFICIAL_DENOMINATOR,
      officialComplete: OFFICIAL_COMPLETE,
      officialIncomplete: OFFICIAL_INCOMPLETE,
      officialCompletionRate: OFFICIAL_RATE,
      referenceRate_notOfficial: REFERENCE_RATE,
      nonEasyNotFutureBulkTarget: true,
    },
    baselineReproduction: {
      source: 'otc-easy-drug-marketed-scope-baseline-census-v1 (READY masterId 원장 미보존 → 결정론적 재구성)',
      method: 'easyReg ∩ NOT baseline-complete(created_at<=BASELINE_TS) ∩ classifyHold==READY (baseline census VERBATIM)',
      baselineTs: BASELINE_TS,
      baselineIncompleteReproduced: baselineIncomplete.length,
      baselineHoldDistribution: sortedCounts(baselineHoldCount),
      baselineReadyReproduced: reproducedReadyCount,
      expected: BASELINE_READY_EXPECTED,
      reproductionOk,
    },
    driftRecheck: {
      scope: 'baseline READY 1,134 ONLY (HOLD_IDENTITY/HOLD_ROUTE/HOLD_SOURCE 범위 밖)',
      alreadyCompletedDrift: alreadyCompletedDrift.length,
      remainingReady: remainingReady.length,
      driftNote: 'ALREADY_COMPLETED_DRIFT = baseline 스냅샷 이후 타 세션이 authored ko+en canonical 완료한 master',
    },
    remainingReadyByRoute: sortedCounts(remainingRouteCount),
    remainingReadyBySuffix: sortedCounts(remainingSuffixCount),
    approvalSummary: {
      approvedMasters: totalApproved,
      writePerMaster: WRITE_PER_MASTER,
      expectedWrite: totalExpectedWrite,
      productionUnitsTotal: totalUnits,
      snapshotTime: nowIso,
      snapshotXmin: xmin,
    },
    gates,
    outputs: {
      latestStateLedger: path.basename(OUT_LEDGER),
      alreadyCompletedDrift: path.basename(OUT_DRIFT),
      finalApprovalSsot: path.basename(OUT_SSOT),
    },
  };

  const latestLedger = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1',
    artifact: 'baseline-ready-1134-latest-state-ledger',
    baselineTs: BASELINE_TS, snapshotTime: nowIso, snapshotXmin: xmin,
    total: baselineReady.length,
    states: { REMAINING_READY: remainingReady.length, ALREADY_COMPLETED_DRIFT: alreadyCompletedDrift.length },
    ledger: baselineReady.map((r) => ({
      id: r.id, name: r.name, gencode: r.gencode, suffix: r.suffix, route: r.route,
      state: alreadyCompletedDrift.some((d) => d.id === r.id) ? 'ALREADY_COMPLETED_DRIFT' : 'REMAINING_READY',
    })).sort((a, b) => (a.id < b.id ? -1 : 1)),
  };

  const driftLedger = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1',
    artifact: 'already-completed-drift-ledger',
    baselineTs: BASELINE_TS, snapshotTime: nowIso, snapshotXmin: xmin,
    count: alreadyCompletedDrift.length,
    note: 'baseline READY 였으나 스냅샷 시점 authored ko+en canonical 완료됨(타 세션 생산). 승인/재생산 대상에서 제외.',
    masters: alreadyCompletedDrift.map((r) => ({ id: r.id, name: r.name, gencode: r.gencode, route: r.route }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  };

  const ssot = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-DRIFT-RECHECK-AND-FINAL-APPROVAL-SSOT-V1',
    artifact: 'final-approval-ssot',
    status: 'PROPOSAL',
    agent: 'la', readOnly: true, dbWrite: 0,
    sourceRecheck: path.basename(OUT_RECHECK),
    fixedCriteria: {
      officialDenominator: OFFICIAL_DENOMINATOR, officialComplete: OFFICIAL_COMPLETE,
      officialIncomplete: OFFICIAL_INCOMPLETE, officialCompletionRate: OFFICIAL_RATE,
      referenceRate_notOfficial: REFERENCE_RATE,
    },
    scope: 'baseline READY 1,134 중 스냅샷 시점 미완료(REMAINING_READY) 만 승인 대상. HOLD_IDENTITY/HOLD_ROUTE/HOLD_SOURCE 및 비-easy 는 범위 밖.',
    routeContract: { writePerMaster: WRITE_PER_MASTER, koTuplesPerMaster: 4, enTuplesPerMaster: 2, note: 'EN 은 KO canonical 선행 필요(dry-run HELD 정상)' },
    productionUnitRule: 'route 경계 우선(단위는 route 를 넘지 않음) · fingerprint 그룹 분할 없음 · route 내 <500=1 / 500–1,200=2 / >1,200=3 단위 · 단위=트랜잭션/검증 단위',
    approvalSnapshot: { time: nowIso, xmin },
    totals: {
      approvedMasters: totalApproved, expectedWrite: totalExpectedWrite,
      productionUnitsTotal: totalUnits,
      alreadyCompletedDrift: alreadyCompletedDrift.length,
      gateCheck_approvalPlusDrift: totalApproved + alreadyCompletedDrift.length,
      gateExpected: BASELINE_READY_EXPECTED,
    },
    routeApproval,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_RECHECK, JSON.stringify(recheck, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_LEDGER, JSON.stringify(latestLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_DRIFT, JSON.stringify(driftLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 2) + '\n', 'utf8');

  console.log('=== OTC EASY-DRUG READY 1,134 DRIFT RECHECK (read-only · dbWrite=0) ===');
  console.log('snapshot =', JSON.stringify(snapMeta[0]));
  console.log('baselineReproduction =', JSON.stringify(recheck.baselineReproduction, null, 2));
  console.log('driftRecheck =', JSON.stringify(recheck.driftRecheck, null, 2));
  console.log('remainingReadyByRoute =', JSON.stringify(recheck.remainingReadyByRoute, null, 2));
  console.log('approvalSummary =', JSON.stringify(recheck.approvalSummary, null, 2));
  console.log('routeApproval(counts) =', JSON.stringify(routeApproval.map((r) => ({ route: r.route, masters: r.approvedMasters, units: r.productionUnits, write: r.expectedWrite })), null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  if (!reproductionOk) {
    console.error(`STOP CONDITION: baseline READY 재현 실패 (got ${reproducedReadyCount}, expected ${BASELINE_READY_EXPECTED})`);
    process.exit(2);
  }
  console.log('OUT:', OUT_RECHECK, OUT_LEDGER, OUT_DRIFT, OUT_SSOT);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
