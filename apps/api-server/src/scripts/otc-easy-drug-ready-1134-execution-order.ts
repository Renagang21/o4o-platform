/**
 * WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1 — 에이전트 라 (승인 SSOT · 조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · dry-run 0 · LIVE apply 0.
 *
 * 역할: READY 1,134 생산의 최종 승인 관리자. 기준 commit 14e9424e8 의 최종 승인 proposal SSOT 를
 *   재현·검증하고 APPROVED_FOR_PRODUCTION 으로 확정, route별 5 생산 단위의 실행 순서 + 단일 write-owner
 *   인계 규칙 + 독립검증 기준선을 원장으로 확정하여 후속 생산 에이전트가 추가 조사 없이 착수 가능하게 한다.
 *
 * ── fingerprint 정의 ─────────────────────────────────────────────────────────────────
 *   fingerprint = 표준코드 일반명코드(성분명코드) gencode. READY 는 gencodeCount==1 이므로 master당 유일.
 *   동일 gencode master = 동일 성분·함량·제형·route = 동일 authored 설명서 → **한 fingerprint 를 여러 unit 으로
 *   분할 금지**(같은 콘텐츠를 두 write-owner 가 생산하는 충돌 방지).
 *
 * ── 고정 모집단 (WO 고정) ─────────────────────────────────────────────────────────────
 *   전체 1,134 = oral 540(2u/3,240T) + topical 327(1u/1,962T) + ophthalmic 253(1u/1,518T) + oromucosal 14(1u/84T)
 *   master당 write = KO 4T + EN 2T = 6T. 전체 KO 4,536T + EN 2,268T = 6,804T.
 *
 * ── unit 분할 규칙 ───────────────────────────────────────────────────────────────────
 *   route 경계 우선(단위는 route 를 넘지 않음) · fingerprint 무분할.
 *   oral 540 → 2 unit: fingerprint(gencode) 그룹 단위로 least-loaded greedy 배정(결정론).
 *   topical/ophthalmic/oromucosal → 각 1 unit(route 전체).
 *
 * ── 실행 순서 (권장) ─────────────────────────────────────────────────────────────────
 *   1 oral-unit-1 · 2 oral-unit-2 · 3 topical-unit-1 · 4 ophthalmic-unit-1 · 5 oromucosal-unit-1
 *   LIVE apply 는 한 시점 한 명(single write-owner). 이전 unit GREEN 후 다음 write-owner 인계.
 *
 * 결정론: 타임스탬프 미포함(ledger) · 배열 정렬 · 단일 REPEATABLE READ READ ONLY 스냅샷. 스냅샷 시각/xmin=CHECK.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442 · user o4o_api · db o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-1134-execution-order.ts [--port 5442]
 * 산출:
 *   src/scripts/data/otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json  (status=APPROVED_FOR_PRODUCTION)
 *   src/scripts/data/otc-easy-drug-ready-1134-unit-ledger-v1.json                   (unit별 master/fp 원장)
 *   src/scripts/data/otc-easy-drug-ready-1134-execution-order-v1.json               (실행 순서 + write-owner 인계표)
 *   src/scripts/data/otc-easy-drug-ready-1134-verification-baseline-v1.json         (독립검증 기준선 + 기존 LIVE 불변)
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const OUT_SSOT = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json');
const OUT_UNIT = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const OUT_ORDER = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-execution-order-v1.json');
const OUT_VERIFY = path.join(OUT_DIR, 'otc-easy-drug-ready-1134-verification-baseline-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');

const BASELINE_TS = '2026-07-27 03:46:25.177729+00';
const BASELINE_READY_EXPECTED = 1134;
const OFFICIAL_INCOMPLETE = 4943;
const WRITE_PER_MASTER = 6;
const BASE_COMMIT = '14e9424e8';
const FIXED_ROUTE = { oral: 540, topical: 327, ophthalmic: 253, oromucosal: 14 } as const;

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

// baseline census VERBATIM 판정 상수/파서
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

type Rec = { id: string; name: string; gencode: string | null; suffix: string | null; route: string; hold: string };

async function main(): Promise<void> {
  const port = argPort();
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapMeta: Array<{ now: string; xmin: string }> = await ds.query(
    "SELECT now()::text now, txid_snapshot_xmin(txid_current_snapshot())::text xmin");

  const OTC_SUBQ = `SELECT pm.id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`;
  const otc: Array<{ id: string; name: string }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL ORDER BY 1`);
  const nameById = new Map(otc.map((m) => [m.id, m.name]));

  const easyReg = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})`);
  const authKoNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const authEnNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`);
  const needsReviewNow = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})`);
  const authKoBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND created_at <= '${BASELINE_TS}' AND master_id IN (${OTC_SUBQ})`);
  const authEnBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
      AND source_type = ANY(${AUTH_SQL}) AND created_at <= '${BASELINE_TS}' AND master_id IN (${OTC_SUBQ})`);
  const needsReviewBase = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND created_at <= '${BASELINE_TS}' AND master_id IN (${OTC_SUBQ})`);

  const stdRows: Array<{ mid: string; gencodes: string[] | null; rows: string }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           COUNT(*)::text rows
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

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

  // 추가 게이트용: canonicalDup (master,lang) canonical STORE >1
  const canonDupRows: Array<{ mid: string }> = await ds.query(`
    SELECT master_id::text mid FROM (
      SELECT master_id, COALESCE(language,'ko') lang FROM shared_product_descriptions
      WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})
      GROUP BY 1,2 HAVING count(*)>1) d GROUP BY 1`);
  const canonDupSet = new Set(canonDupRows.map((r) => r.mid));
  // sourceRef: canonical easy ko 원문 개수 per master (>1 = 충돌)
  const easyKoCntRows: Array<{ mid: string; n: string }> = await ds.query(`
    SELECT master_id::text mid, count(*)::text n FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})
    GROUP BY 1`);
  const easyKoCnt = new Map(easyKoCntRows.map((r) => [r.mid, Number(r.n)]));

  await ds.query('COMMIT');
  await ds.destroy();

  // ── classifyHold VERBATIM ─────────────────────────────────────────────────────────
  const classify = (id: string): Rec => {
    const std = stdByMid.get(id);
    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    const gencode = gencodes.length === 1 ? gencodes[0] : null;
    const suffix = gencode && gencode.length >= 9 ? gencode.slice(6, 9).toUpperCase() : null;
    const mapped = suffix ? SUFFIX_MAP[suffix] : undefined;
    const rec: Rec = { id, name: nameById.get(id) || '', gencode, suffix, route: mapped?.route || 'unknown', hold: '' };
    const content = contentByMid.get(id);
    if (!content) { rec.hold = 'HOLD_SOURCE'; return rec; }
    const sec = sections(content);
    const ind = sec['효능·효과'] || ''; const dos = sec['용법·용량'] || '';
    if (!ind && !dos) { rec.hold = 'HOLD_SOURCE'; return rec; }
    if (!ind || !dos) { rec.hold = 'HOLD_SOURCE'; return rec; }
    if (!std) { rec.hold = 'HOLD_IDENTITY'; return rec; }
    if (gencodes.length === 0) { rec.hold = 'HOLD_IDENTITY'; return rec; }
    if (gencodes.length > 1) { rec.hold = 'HOLD_IDENTITY'; return rec; }
    if (!gencode || gencode.length < 9) { rec.hold = 'HOLD_IDENTITY'; return rec; }
    if (suffix && SITE_AMBIGUOUS[suffix]) { rec.hold = 'HOLD_ROUTE'; return rec; }
    if (!mapped) { rec.hold = 'HOLD_ROUTE'; return rec; }
    rec.hold = 'READY'; return rec;
  };

  // baseline incomplete → baseline READY
  const baselineIncomplete: string[] = [];
  for (const id of easyReg) {
    const complete = authKoBase.has(id) && authEnBase.has(id) && !needsReviewBase.has(id);
    if (!complete) baselineIncomplete.push(id);
  }
  baselineIncomplete.sort();
  const holdDist: Record<string, number> = {};
  const baselineReady: Rec[] = [];
  for (const id of baselineIncomplete) {
    const rec = classify(id);
    holdDist[rec.hold] = (holdDist[rec.hold] || 0) + 1;
    if (rec.hold === 'READY') baselineReady.push(rec);
  }
  baselineReady.sort((a, b) => (a.id < b.id ? -1 : 1));

  // drift recheck
  const remaining: Rec[] = [];
  const drift: Rec[] = [];
  for (const rec of baselineReady) {
    const completeNow = authKoNow.has(rec.id) && authEnNow.has(rec.id) && !needsReviewNow.has(rec.id);
    (completeNow ? drift : remaining).push(rec);
  }

  // ── route → fingerprint(gencode) → masters ───────────────────────────────────────
  const routeFp: Record<string, Map<string, string[]>> = {};
  for (const r of remaining) {
    const fp = r.gencode!;
    (routeFp[r.route] ||= new Map());
    const arr = routeFp[r.route].get(fp) || [];
    arr.push(r.id); routeFp[r.route].set(fp, arr);
  }
  for (const route of Object.keys(routeFp)) for (const [fp, ids] of routeFp[route]) ids.sort();

  // ── unit 분할 ─────────────────────────────────────────────────────────────────────
  type Unit = { unit: string; route: string; fingerprints: string[]; fpCount: number; masterCount: number; masterIds: string[]; expectedWrite: number };
  const buildUnitsForRoute = (route: string, nUnits: number): Unit[] => {
    const fpMap = routeFp[route] || new Map();
    // fingerprint groups: [fp, ids]
    const groups = [...fpMap.entries()].map(([fp, ids]) => ({ fp, ids }));
    if (nUnits === 1) {
      const fps = groups.map((g) => g.fp).sort();
      const ids = groups.flatMap((g) => g.ids).sort();
      return [{ unit: `${route}-unit-1`, route, fingerprints: fps, fpCount: fps.length, masterCount: ids.length, masterIds: ids, expectedWrite: ids.length * WRITE_PER_MASTER }];
    }
    // least-loaded greedy (결정론): sort by masterCount desc, fp asc
    groups.sort((a, b) => b.ids.length - a.ids.length || (a.fp < b.fp ? -1 : 1));
    const bins: Array<{ fps: string[]; ids: string[] }> = Array.from({ length: nUnits }, () => ({ fps: [], ids: [] }));
    for (const g of groups) {
      let t = 0;
      for (let i = 1; i < nUnits; i++) if (bins[i].ids.length < bins[t].ids.length) t = i;
      bins[t].fps.push(g.fp); bins[t].ids.push(...g.ids);
    }
    return bins.map((b, i) => {
      const fps = b.fps.slice().sort(); const ids = b.ids.slice().sort();
      return { unit: `${route}-unit-${i + 1}`, route, fingerprints: fps, fpCount: fps.length, masterCount: ids.length, masterIds: ids, expectedWrite: ids.length * WRITE_PER_MASTER };
    });
  };
  const units: Unit[] = [
    ...buildUnitsForRoute('oral', 2),
    ...buildUnitsForRoute('topical', 1),
    ...buildUnitsForRoute('ophthalmic', 1),
    ...buildUnitsForRoute('oromucosal', 1),
  ];

  // ── 게이트 ────────────────────────────────────────────────────────────────────────
  const allUnitMasters = units.flatMap((u) => u.masterIds);
  const allUnitFps = units.flatMap((u) => u.fingerprints);
  const masterDup = allUnitMasters.length - new Set(allUnitMasters).size;
  const fpDup = allUnitFps.length - new Set(allUnitFps).size; // fingerprint split across units
  const routeSum = Object.values(FIXED_ROUTE).reduce((a, b) => a + b, 0);
  const remainingRouteCount: Record<string, number> = {};
  for (const r of remaining) remainingRouteCount[r.route] = (remainingRouteCount[r.route] || 0) + 1;
  const routeMatchesFixed = (Object.keys(FIXED_ROUTE) as Array<keyof typeof FIXED_ROUTE>)
    .every((k) => remainingRouteCount[k] === FIXED_ROUTE[k]);
  // 기존 LIVE / authored canonical 기존 보유 교집합 (remaining 중)
  const existingLive = remaining.filter((r) => authKoNow.has(r.id) || authEnNow.has(r.id)).length;
  const authoredCanonHeld = remaining.filter((r) => authKoNow.has(r.id) && authEnNow.has(r.id)).length;
  const canonDup = remaining.filter((r) => canonDupSet.has(r.id)).length;
  const sourceRefConflict = remaining.filter((r) => (easyKoCnt.get(r.id) || 0) > 1).length;
  const sourceRefMissing = remaining.filter((r) => (easyKoCnt.get(r.id) || 0) === 0).length;

  const gates = {
    g1_total1134Reproduced: baselineReady.length === BASELINE_READY_EXPECTED,
    g1_baselineReady: baselineReady.length,
    g1b_baselineIncomplete: baselineIncomplete.length === OFFICIAL_INCOMPLETE,
    g2_driftZero: drift.length === 0,
    g2_remaining: remaining.length,
    g3_routeSum1134: Object.values(remainingRouteCount).reduce((a, b) => a + b, 0) === BASELINE_READY_EXPECTED,
    g3_routeMatchesFixed: routeMatchesFixed,
    g4_unitSum1134: allUnitMasters.length === BASELINE_READY_EXPECTED,
    g5_unitMasterIntersection0: masterDup,
    g6_fingerprintSplit0: fpDup,
    g7_existingLiveIntersection0: existingLive,
    g8_authoredCanonicalHeld0: authoredCanonHeld,
    g9_sourceRefConflict0: sourceRefConflict,
    g9b_sourceRefMissing0: sourceRefMissing,
    g10_canonicalDup0: canonDup,
    g11_dbWrite: 0,
    g12_outsideBaseline0: remaining.filter((r) => !baselineReady.some((b) => b.id === r.id)).length,
  };
  const allGreen = gates.g1_total1134Reproduced && gates.g1b_baselineIncomplete && gates.g2_driftZero &&
    gates.g3_routeSum1134 && gates.g3_routeMatchesFixed && gates.g4_unitSum1134 && gates.g5_unitMasterIntersection0 === 0 &&
    gates.g6_fingerprintSplit0 === 0 && gates.g7_existingLiveIntersection0 === 0 && gates.g8_authoredCanonicalHeld0 === 0 &&
    gates.g9_sourceRefConflict0 === 0 && gates.g9b_sourceRefMissing0 === 0 && gates.g10_canonicalDup0 === 0 &&
    gates.g12_outsideBaseline0 === 0;

  const approvalStatus = allGreen ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED';
  const nowIso = snapMeta[0].now; const xmin = snapMeta[0].xmin;

  // 실행 순서
  const order = ['oral-unit-1', 'oral-unit-2', 'topical-unit-1', 'ophthalmic-unit-1', 'oromucosal-unit-1'];
  const unitByName = new Map(units.map((u) => [u.unit, u]));
  const owners: Record<string, string> = {
    'oral-unit-1': 'agent-da', 'oral-unit-2': 'agent-da',
    'topical-unit-1': 'agent-na', 'oromucosal-unit-1': 'agent-na', 'ophthalmic-unit-1': 'agent-ga',
  };

  // route별 fingerprint/master 요약
  const routeSummary = (Object.keys(FIXED_ROUTE) as Array<keyof typeof FIXED_ROUTE>).map((route) => {
    const fpMap = routeFp[route] || new Map();
    const masters = remaining.filter((r) => r.route === route).length;
    return { route, masters, fingerprints: fpMap.size, expectedWrite: masters * WRITE_PER_MASTER };
  });

  // ── 산출물 ───────────────────────────────────────────────────────────────────────
  const ssot = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1',
    artifact: 'approved-for-production-ssot',
    status: approvalStatus,
    agent: 'la', readOnly: true, dbWrite: 0,
    baseCommit: BASE_COMMIT,
    sourceProposalSsot: 'otc-easy-drug-ready-1134-final-approval-ssot-v1.json',
    fingerprintDefinition: '표준코드 일반명코드(성분명코드) gencode. READY 는 master당 유일. 동일 gencode=동일 authored 설명서.',
    approvalSnapshot: { time: nowIso, xmin },
    fixedPopulation: { total: BASELINE_READY_EXPECTED, byRoute: FIXED_ROUTE, expectedWrite: { ko: 4536, en: 2268, total: 6804 }, writePerMaster: WRITE_PER_MASTER },
    reproduction: { baselineReady: baselineReady.length, baselineIncomplete: baselineIncomplete.length, holdDistribution: sortedCounts(holdDist), drift: drift.length, remaining: remaining.length },
    routeSummary,
    routeApproval: routeSummary.map((r) => ({ ...r, approval: 'APPROVED', units: r.route === 'oral' ? 2 : 1 })),
    gates,
    allGreen,
    outputs: { unitLedger: path.basename(OUT_UNIT), executionOrder: path.basename(OUT_ORDER), verificationBaseline: path.basename(OUT_VERIFY) },
  };

  const unitLedger = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1',
    artifact: 'unit-ledger', baseCommit: BASE_COMMIT, snapshotTime: nowIso, snapshotXmin: xmin,
    total: allUnitMasters.length, writePerMaster: WRITE_PER_MASTER,
    units: units.map((u) => ({
      unit: u.unit, route: u.route, status: approvalStatus === 'APPROVED_FOR_PRODUCTION' ? 'APPROVED' : 'BLOCKED',
      fpCount: u.fpCount, masterCount: u.masterCount, expectedWrite: u.expectedWrite,
      koTuples: u.masterCount * 4, enTuples: u.masterCount * 2,
      fingerprints: u.fingerprints, masterIds: u.masterIds,
    })),
  };

  const executionOrder = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1',
    artifact: 'execution-order', baseCommit: BASE_COMMIT, snapshotTime: nowIso, snapshotXmin: xmin,
    singleWriteOwnerRule: [
      '준비(select/generate/Guard/dry-run 검증 문서화)는 병렬 가능.',
      'LIVE apply 는 반드시 한 시점에 한 명(single write-owner)만 수행.',
      '이전 unit 이 GREEN(독립검증 통과) 이 된 뒤 다음 write-owner 에게 인계.',
      '한 fingerprint(gencode) 를 여러 unit 으로 분할 금지 — 동일 콘텐츠 이중 생산 방지.',
      'HOLD_IDENTITY/HOLD_ROUTE/HOLD_SOURCE 편입 금지. baseline READY 1,134 밖 master 편입 금지.',
    ],
    executionSequence: order.map((name, i) => {
      const u = unitByName.get(name)!;
      return {
        step: i + 1, unit: name, route: u.route, writeOwner: owners[name],
        masterCount: u.masterCount, fpCount: u.fpCount, expectedWrite: u.expectedWrite,
        status: approvalStatus === 'APPROVED_FOR_PRODUCTION' ? 'APPROVED' : 'BLOCKED',
        handoffCondition: i === 0 ? 'start (no predecessor)' : `이전 step(${order[i - 1]}) GREEN 후 인계`,
      };
    }),
    writeOwnerHandoffTable: [
      { owner: 'agent-da', units: ['oral-unit-1', 'oral-unit-2'] },
      { owner: 'agent-na', units: ['topical-unit-1', 'oromucosal-unit-1'] },
      { owner: 'agent-ga', units: ['ophthalmic-unit-1'] },
      { owner: 'agent-ra', role: '승인 SSOT·원장·독립검증 지원 (write 수행 안 함)' },
    ],
  };

  const verifyBaseline = {
    wo: 'WO-O4O-OTC-EASY-DRUG-READY-1134-FINAL-APPROVAL-AND-EXECUTION-ORDER-V1',
    artifact: 'verification-baseline', baseCommit: BASE_COMMIT, snapshotTime: nowIso, snapshotXmin: xmin,
    independentVerification: {
      criteria: [
        'unit 완료 후: 해당 unit masterIds 전부 STORE canonical ko(authored) AND en(authored) 존재.',
        '각 master canonicalDup 0 (master,lang 당 canonical STORE 1개).',
        'grounding source = mfds_easy_drug canonical ko 원문 보존(수정/삭제 없음).',
        'unit write 수 = masterCount×6 (KO 4 + EN 2) 와 일치(초과 write 0).',
        'manifest ID 독립검증 — 전역 LIVE 카운트가 아니라 unit masterId 원장으로 대조.',
      ],
    },
    existingLiveInvariantBaseline: {
      snapshotTime: nowIso, snapshotXmin: xmin,
      otcAuthoredCompleteNow_koAndEn: 'authKoNow∩authEnNow 는 본 스냅샷 기준 불변 기준선 — 생산은 이 집합을 감소시키지 않는다(기존 완료 훼손 0).',
      ready1134ExistingLiveIntersection: existingLive,
      ready1134AuthoredCanonicalHeld: authoredCanonHeld,
      note: 'READY 1,134 는 스냅샷 시점 authored 미보유(기존 LIVE 교집합 0). 생산은 신규 추가만.',
    },
    reproducibility: 'ledger/unit/order/verify 파일은 snapshotTime/xmin 제외 시 2회 실행 byte-identical.',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_UNIT, JSON.stringify(unitLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_ORDER, JSON.stringify(executionOrder, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_VERIFY, JSON.stringify(verifyBaseline, null, 2) + '\n', 'utf8');

  console.log('=== READY 1,134 FINAL APPROVAL & EXECUTION ORDER (read-only · dbWrite=0) ===');
  console.log('snapshot =', JSON.stringify(snapMeta[0]));
  console.log('approvalStatus =', approvalStatus);
  console.log('routeSummary =', JSON.stringify(routeSummary, null, 2));
  console.log('units =', JSON.stringify(units.map((u) => ({ unit: u.unit, fp: u.fpCount, masters: u.masterCount, write: u.expectedWrite })), null, 2));
  console.log('executionSequence =', JSON.stringify(executionOrder.executionSequence.map((s) => ({ step: s.step, unit: s.unit, owner: s.writeOwner, masters: s.masterCount })), null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  if (!allGreen) { console.error('STOP: gates not all green — approvalStatus=BLOCKED'); process.exit(2); }
  console.log('OUT:', OUT_SSOT, OUT_UNIT, OUT_ORDER, OUT_VERIFY);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
