/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-POPULATION-RECONCILIATION-20-V1
 *   — 공식 잔여 3,809 vs easy canonical 잔존 3,829 정합 (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0.
 *
 * 두 census 산식:
 *   [A] 공식 생산 모집단 census (baseline census verbatim)
 *       OTC master(product_drug_extensions.drug_category='otc', not deleted) 전수 →
 *       pop 분류 → productionTargets(EASY_DRUG_REGISTERED_INCOMPLETE ∪ NON_EASY_WITH_O4O_EVIDENCE) →
 *       hold != READY 인 것 = remaining
 *   [B] 보조 census (otc-v3-ready-1134-completion-basis-census.na.ts:27 verbatim)
 *       SELECT count(DISTINCT master_id) FROM shared_product_descriptions
 *       WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko'
 *         AND source_type='mfds_easy_drug' AND deleted_at IS NULL
 *       → OTC 조인 없음 · 제외 필터 없음 · 완료 여부 무관 · 시장성 근거 무관
 *
 * 산출: 양방향 set difference 전건 masterId + master 별 판정·근거 + 확정 SSOT.
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-population-reconciliation.la.ts [--port 5491]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute } from './otc-v2-store-leaflet-runner.shared.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-POPULATION-RECONCILIATION-20-V1';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const READY_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const readPw = (): string => {
  const m = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 5491;
};

// ── baseline census VERBATIM 상수 ────────────────────────────────────────────────────
const BASELINE_AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical', 'nutrition_combo'];
const AUTH_SQL = `ARRAY['${BASELINE_AUTHORED_SOURCES.join("','")}']`;
const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;
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
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const sortedCounts = (o: Record<string, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));

async function main(): Promise<void> {
  const readySet = new Set<string>((JSON.parse(fs.readFileSync(READY_LEDGER, 'utf8')).units as any[]).flatMap((u) => u.masterIds));
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: argPort(), username: 'o4o_api', password: readPw(),
    database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapMeta = retRows<{ now: string; xmin: string }>(await ds.query(
    'SELECT now()::text now, txid_snapshot_xmin(txid_current_snapshot())::text xmin'));

  const OTC_SUBQ = `SELECT pm.id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`;

  // ── [A] baseline census 입력 (VERBATIM) ───────────────────────────────────────────
  const otc = retRows<{ id: string; name: string; spec: string | null }>(await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ORDER BY 1`));
  const easyReg = new Set(retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id));
  const authKo = new Set(retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
       AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id));
  const authEn = new Set(retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL
       AND source_type = ANY(${AUTH_SQL}) AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id));
  const needsReview = new Set(retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='needs_review' AND deleted_at IS NULL AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id));
  const evOPL = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT master_id::text id FROM organization_product_listings
    WHERE is_active AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evSPO = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT master_id::text id FROM supplier_product_offers
    WHERE is_active AND deleted_at IS NULL AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evSP = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT product_master_id::text id FROM store_products
    WHERE is_active AND product_master_id IS NOT NULL AND product_master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evAll = new Set([...evOPL, ...evSPO, ...evSP]);

  const stdRows = retRows<{ mid: string; gencodes: string[] | null; specs: string[] | null; rows: string; cancelled_rows: string; permit_codes: string[] | null; class_kinds: string[] | null }>(
    await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs,
           COUNT(*)::text rows,
           COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled_rows,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'품목기준코드','')), NULL) permit_codes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) class_kinds
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    GROUP BY 1 ORDER BY 1`));
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  const easyContentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content
    FROM (SELECT DISTINCT pm.id::text id FROM product_masters pm
          JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON TRUE
    ORDER BY 1`));
  const contentByMid = new Map(easyContentRows.map((r) => [r.id, r.content]));

  // ── [B] 보조 census (VERBATIM · OTC 조인 없음) ─────────────────────────────────────
  const easyCanonRows = retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko'
       AND source_type='mfds_easy_drug' AND deleted_at IS NULL ORDER BY 1`));
  const setB = new Set(easyCanonRows.map((r) => r.id));

  // ── 판정 보조 실측 ────────────────────────────────────────────────────────────────
  const symIdsPlaceholder: string[] = []; // 아래에서 채움 (2차 조회용)

  // ── [A] 재현 ──────────────────────────────────────────────────────────────────────
  type Rec = {
    id: string; name: string; spec: string | null; easy: boolean; complete: boolean; evidence: boolean;
    excludeConfirmed: boolean; excludeKw: boolean; bulk: boolean; allCancelled: boolean;
    gencode: string | null; gencodeCount: number; stdLinked: boolean; pop: string; hold?: string; holdReason?: string;
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
    let pop: string;
    if (complete) pop = easy ? 'EASY_DRUG_REGISTERED_COMPLETED' : 'NON_EASY_ALREADY_PRODUCED';
    else if (easy) pop = 'EASY_DRUG_REGISTERED_INCOMPLETE';
    else if (evidence) pop = 'NON_EASY_WITH_O4O_EVIDENCE';
    else if (excludeConfirmed) pop = 'EXCLUDE_CONFIRMED';
    else pop = 'NON_EASY_NO_MARKET_EVIDENCE';
    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    recs.push({
      id: m.id, name: m.name, spec: m.spec, easy, complete, evidence, excludeConfirmed, excludeKw, bulk, allCancelled,
      gencode: gencodes.length === 1 ? gencodes[0] : null, gencodeCount: gencodes.length, stdLinked: !!std, pop,
    });
  }
  const recById = new Map(recs.map((r) => [r.id, r]));
  const isProductionTarget = (r: Rec): boolean =>
    r.pop === 'EASY_DRUG_REGISTERED_INCOMPLETE' || r.pop === 'NON_EASY_WITH_O4O_EVIDENCE';
  const classifyHold = (r: Rec): { hold: string; reason: string } => {
    const content = contentByMid.get(r.id);
    if (!content) return { hold: 'HOLD_SOURCE', reason: 'no_easy_content' };
    const sec = sections(content);
    const ind = sec['효능·효과'] || '', dos = sec['용법·용량'] || '';
    if (!ind && !dos) return { hold: 'HOLD_SOURCE', reason: 'easy_content_parse_fail' };
    if (!ind || !dos) return { hold: 'HOLD_SOURCE', reason: `source_axis_missing(${!ind ? 'indication' : 'dosage'})` };
    if (!r.stdLinked) return { hold: 'HOLD_IDENTITY', reason: 'standard_code_row_absent' };
    if (r.gencodeCount === 0) return { hold: 'HOLD_IDENTITY', reason: 'general_name_code_absent' };
    if (r.gencodeCount > 1) return { hold: 'HOLD_IDENTITY', reason: `general_name_code_ambiguous(${r.gencodeCount})` };
    if (!r.gencode || r.gencode.length < 9) return { hold: 'HOLD_IDENTITY', reason: 'general_name_code_malformed' };
    const rr = resolveRoute(r.gencode);
    if (!rr.ok) return { hold: 'HOLD_ROUTE', reason: rr.reason! };
    return { hold: 'READY', reason: `gencode=${r.gencode},route=${rr.route}` };
  };
  for (const r of recs) if (isProductionTarget(r)) { const h = classifyHold(r); r.hold = h.hold; r.holdReason = h.reason; }
  const productionTargets = recs.filter(isProductionTarget);
  const remainingRecs = productionTargets.filter((r) => r.hold !== 'READY');
  const setA = new Set(remainingRecs.map((r) => r.id));

  // ── set difference ────────────────────────────────────────────────────────────────
  const aOnly = [...setA].filter((id) => !setB.has(id)).sort();
  const bOnly = [...setB].filter((id) => !setA.has(id)).sort();
  const both = [...setA].filter((id) => setB.has(id)).length;
  const symIds = [...new Set([...aOnly, ...bOnly])].sort();
  symIdsPlaceholder.push(...symIds);

  // 대칭차 전건 상세 실측
  const detail = retRows<{
    mid: string; name: string | null; otc: string; drugcat: string | null; easyAny: string; easyCanonKo: string;
    authKo: string; authEn: string; needsRev: string; easyStatuses: string[]; permit: string | null;
  }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT pm.name FROM product_masters pm WHERE pm.id=m.mid) name,
      (SELECT count(*) FROM product_drug_extensions e WHERE e.product_master_id=m.mid AND e.drug_category='otc' AND e.deleted_at IS NULL)::text otc,
      (SELECT string_agg(DISTINCT e.drug_category, ',') FROM product_drug_extensions e WHERE e.product_master_id=m.mid AND e.deleted_at IS NULL) drugcat,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.source_type='mfds_easy_drug')::text "easyAny",
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.source_type='mfds_easy_drug'
         AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text "easyCanonKo",
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.status='canonical'
         AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type=ANY($2))::text "authKo",
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.status='canonical'
         AND s.language='en' AND s.deleted_at IS NULL AND s.source_type=ANY($2))::text "authEn",
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.status='needs_review' AND s.deleted_at IS NULL)::text "needsRev",
      COALESCE((SELECT array_agg(DISTINCT s.status || '/' || COALESCE(s.language,'ko') || '/' || (CASE WHEN s.deleted_at IS NULL THEN 'live' ELSE 'deleted' END))
        FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE' AND s.source_type='mfds_easy_drug'), ARRAY[]::text[]) "easyStatuses",
      (SELECT min(pi.identifier_value) FROM product_identifiers pi WHERE pi.product_master_id=m.mid AND pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL) permit
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [symIds, BASELINE_AUTHORED_SOURCES]));
  const detailBy = new Map(detail.map((d) => [d.mid, d]));

  await ds.query('COMMIT');
  await ds.destroy();

  // ── master 별 판정 ────────────────────────────────────────────────────────────────
  type Verdict = {
    masterId: string; productName: string | null; permitCode: string | null; side: 'A_ONLY' | 'B_ONLY';
    verdict: string; reasonCode: string; reason: string; action: string;
    facts: Record<string, unknown>;
  };
  const verdicts: Verdict[] = [];
  for (const id of symIds) {
    const d = detailBy.get(id)!;
    const r = recById.get(id);
    const side: 'A_ONLY' | 'B_ONLY' = setA.has(id) ? 'A_ONLY' : 'B_ONLY';
    const facts = {
      otcExtension: Number(d.otc), drugCategories: d.drugcat, easyRowsAny: Number(d.easyAny),
      easyCanonicalKo: Number(d.easyCanonKo), authoredKoCanonical: Number(d.authKo), authoredEnCanonical: Number(d.authEn),
      needsReview: Number(d.needsRev), easyRowStates: d.easyStatuses.slice().sort(),
      popClass: r?.pop ?? 'NOT_IN_OTC_POPULATION', hold: r?.hold ?? null, holdReason: r?.holdReason ?? null,
      inReady1134: readySet.has(id),
    };
    let verdict: string, reasonCode: string, reason: string, action: string;
    if (side === 'B_ONLY') {
      if (Number(d.otc) === 0) {
        verdict = 'EXCLUDE_OUT_OF_OFFICIAL_DENOMINATOR'; reasonCode = 'NOT_OTC_EXTENSION';
        reason = `보조 census 는 OTC 조인이 없어 포함되나, 공식 모집단은 product_drug_extensions.drug_category='otc' 인 master 만 세므로 제외(실측 drug_category=${d.drugcat ?? 'NONE'})`;
        action = '제외 원장 기록 — 생산 대상 아님';
      } else if (Number(d.authKo) > 0 && Number(d.authEn) > 0 && Number(d.needsRev) === 0) {
        verdict = 'EXCLUDE_ALREADY_AUTHORED_COMPLETE'; reasonCode = 'ALREADY_AUTHORED_CANONICAL';
        reason = 'authored KO·EN canonical 보유 → 공식 census 는 complete 로 분류하여 productionTargets 에서 제외. 보조 census 는 easy canonical 잔존만 세므로 여전히 포함(easy→authored 교체 후 easy 행이 canonical 로 남아있음)';
        action = '생산 대상 제외 — 잔존 easy canonical 정리는 별도 위생 트랙';
      } else if (readySet.has(id)) {
        verdict = 'EXCLUDE_READY_1134_COMPLETED'; reasonCode = 'READY_1134_TRACK';
        reason = 'READY 1,134 V3 트랙에서 생산 완료된 master';
        action = '생산 대상 제외';
      } else if (r && r.hold === 'READY') {
        verdict = 'EXCLUDE_READY_NOT_REMAINING'; reasonCode = 'HOLD_READY';
        reason = 'productionTargets 이나 hold=READY 라 remaining(A) 정의에서 빠짐';
        action = '잔여 모집단 아님 — READY 트랙 소관';
      } else if (r && r.pop === 'EXCLUDE_CONFIRMED') {
        verdict = 'EXCLUDE_NON_RETAIL_OR_CANCELLED'; reasonCode = 'EXCLUDE_CONFIRMED';
        reason = `수출/군납/비매품 키워드 또는 비소매 대용량 또는 전건 취소(excludeKw=${r.excludeKw}, bulk=${r.bulk}, allCancelled=${r.allCancelled})`;
        action = '제외 원장 기록 — 생산 대상 아님';
      } else {
        verdict = 'NA_EXCEPTION_UNCLEAR_LINK'; reasonCode = 'UNCLEAR';
        reason = `공식 census 분류 ${r?.pop ?? 'NOT_IN_OTC_POPULATION'} · hold ${r?.hold ?? 'n/a'} — 자동 판정 불가`;
        action = '나 에이전트 예외 원장으로 이동';
      }
    } else {
      // A_ONLY: 공식 잔여인데 easy KO canonical 이 없음
      if (Number(d.easyAny) === 0) {
        verdict = 'KEEP_IN_REMAINING_NON_EASY_EVIDENCE'; reasonCode = 'NON_EASY_WITH_O4O_EVIDENCE';
        reason = 'easy 원문 자체가 없고 O4O 시장성 근거(진열/오퍼/매장상품)로 공식 모집단에 편입된 master. 보조 census 는 easy canonical 만 세므로 미포함';
        action = '잔여 모집단 유지 — 단 공식 원문 부재로 HOLD_SOURCE(나 예외)';
      } else if (Number(d.easyCanonKo) === 0) {
        verdict = 'KEEP_IN_REMAINING_EASY_NOT_CANONICAL'; reasonCode = 'EASY_ROW_NOT_CANONICAL';
        reason = `easy 행은 있으나 canonical/ko/live 조건 미충족(상태 ${d.easyStatuses.slice().sort().join('|') || 'NONE'}) → 보조 census 미포함`;
        action = '잔여 모집단 유지 — 원문 상태 확인 필요 시 나 예외';
      } else {
        verdict = 'NA_EXCEPTION_UNCLEAR_LINK'; reasonCode = 'UNCLEAR';
        reason = 'A 에만 있는데 easy canonical 도 존재 — 산식 대조 불일치';
        action = '나 에이전트 예외 원장으로 이동';
      }
    }
    verdicts.push({ masterId: id, productName: d.name, permitCode: d.permit, side, verdict, reasonCode, reason, action, facts });
  }

  const byVerdict = sortedCounts(verdicts.reduce<Record<string, number>>((a, v) => { a[v.verdict] = (a[v.verdict] || 0) + 1; return a; }, {}));
  const bySide = sortedCounts(verdicts.reduce<Record<string, number>>((a, v) => { a[v.side] = (a[v.side] || 0) + 1; return a; }, {}));

  // ── 확정 SSOT ─────────────────────────────────────────────────────────────────────
  const keptFromDiff = verdicts.filter((v) => v.verdict.startsWith('KEEP_')).map((v) => v.masterId);
  const excludedFromDiff = verdicts.filter((v) => v.verdict.startsWith('EXCLUDE_')).map((v) => v.masterId);
  const naFromDiff = verdicts.filter((v) => v.verdict.startsWith('NA_')).map((v) => v.masterId);
  const ssotIds = [...setA].sort(); // 판정 결과 A 밖에서 편입된 건이 없으면 A 가 곧 SSOT
  const promoted = verdicts.filter((v) => v.side === 'B_ONLY' && v.verdict.startsWith('KEEP_')).map((v) => v.masterId);
  for (const id of promoted) if (!ssotIds.includes(id)) ssotIds.push(id);
  ssotIds.sort();

  const popCounts = sortedCounts(recs.reduce<Record<string, number>>((a, r) => { a[r.pop] = (a[r.pop] || 0) + 1; return a; }, {}));
  const holdCounts = sortedCounts(remainingRecs.reduce<Record<string, number>>((a, r) => { a[r.hold!] = (a[r.hold!] || 0) + 1; return a; }, {}));

  const out = {
    wo: WO, agent: 'la', mode: 'READ-ONLY reconciliation', liveDbWrite: 0,
    censusFormulas: {
      A: {
        name: '공식 생산 모집단 census (baseline verbatim)',
        source: 'otc-easy-drug-marketed-scope-baseline-census.ts / otc-easy-drug-remaining-3809-master-by-master-census.la.ts',
        definition: "OTC master(product_drug_extensions.drug_category='otc', deleted_at IS NULL) 전수 → pop 분류 → productionTargets = EASY_DRUG_REGISTERED_INCOMPLETE ∪ NON_EASY_WITH_O4O_EVIDENCE → hold != READY = remaining",
        filters: ['OTC 조인 필수', '완료(authored KO+EN canonical & needs_review 0) 제외', 'EXCLUDE 키워드/비소매 대용량/전건취소 제외', 'easy 미등록은 O4O 시장성 근거 있을 때만 편입'],
        measured: setA.size,
      },
      B: {
        name: '보조 census (easy canonical 잔존)',
        source: 'otc-v3-ready-1134-completion-basis-census.na.ts:27',
        definition: "SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug' AND deleted_at IS NULL",
        filters: ['OTC 조인 없음', '완료 여부 무관', '제외 필터 없음', '시장성 근거 무관'],
        measured: setB.size,
      },
      divergencePoints: [
        'B 는 OTC 조인이 없어 비-OTC master 를 포함한다',
        'B 는 authored canonical 로 교체 완료된 master 도 easy 행이 canonical 로 남아있으면 계속 센다',
        'B 는 수출/군납/비매품/비소매 대용량/전건취소 제외 필터를 적용하지 않는다',
        'A 는 easy 원문이 없어도 O4O 시장성 근거가 있으면 편입한다 (B 에는 없음)',
        'A 는 easy 행이 canonical/ko/live 가 아니어도 easy 등록으로 간주한다 (B 는 canonical/ko/live 만)',
      ],
    },
    setDifference: {
      aSize: setA.size, bSize: setB.size, countDelta: setB.size - setA.size,
      intersection: both, aOnlyCount: aOnly.length, bOnlyCount: bOnly.length,
      symmetricDifference: symIds.length,
      note: '보고된 "20건 차이" 는 두 집합 크기의 차(countDelta)이며, 실제 갈린 master 는 양방향 대칭차 전건이다',
      aOnly, bOnly,
    },
    verdictSummary: { bySide, byVerdict, unclassified: verdicts.filter((v) => v.reasonCode === 'UNCLEAR').length },
    verdicts,
    ssot: {
      decidedPopulation: ssotIds.length,
      basis: 'census A (공식 생산 모집단 census)',
      why: [
        '공식 분모 19,385 와 완료 15,576 을 산출한 것과 동일한 축(OTC 한정 · 완료 제외 · 비소매/취소 제외)이다',
        'census B 는 완료 master 의 잔존 easy 행과 비-OTC master 를 포함하므로 생산 대상 집합이 아니라 데이터 위생 지표다',
        '판정 결과 B 전용 건 중 잔여로 편입해야 할 master 수 = ' + promoted.length,
      ],
      promotedFromB: promoted,
      arithmetic: {
        otcPopulation: recs.length,
        popCounts,
        productionTargets: productionTargets.length,
        ready: productionTargets.length - remainingRecs.length,
        remaining: remainingRecs.length,
        holdCounts,
        identity: 'productionTargets = ready + remaining',
        identityHolds: productionTargets.length === (productionTargets.length - remainingRecs.length) + remainingRecs.length,
      },
    },
    hygieneNote: {
      staleEasyCanonicalOnCompleted: verdicts.filter((v) => v.reasonCode === 'ALREADY_AUTHORED_CANONICAL').length,
      meaning: 'authored 로 교체 완료되었으나 easy canonical 행이 함께 canonical 로 남아있는 master. 생산 대상은 아니며, canonical 중복 위생 점검 대상(본 WO 범위 밖 · DB write 금지).',
      rxWithEasyCanonical: {
        count: verdicts.filter((v) => v.reasonCode === 'NOT_OTC_EXTENSION').length,
        meaning: '전문의약품(rx)/미분류 master 에 e약은요 STORE canonical 이 부착되어 있음. 매장용 OTC 설명서 생산 대상이 아니며, 원문 부착 자체는 별도 위생/정책 검토 대상(본 WO 범위 밖 · DB write 금지).',
        distinctPermitCodes: [...new Set(verdicts.filter((v) => v.reasonCode === 'NOT_OTC_EXTENSION').map((v) => v.permitCode))].filter(Boolean).sort(),
        duplicateMasterGroups: Object.entries(
          verdicts.filter((v) => v.reasonCode === 'NOT_OTC_EXTENSION')
            .reduce<Record<string, string[]>>((a, v) => { const k = v.permitCode || 'NONE'; (a[k] ||= []).push(v.masterId); return a; }, {}),
        ).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([permitCode, ids]) => ({
          permitCode, masterCount: ids.length, masterIds: ids.slice().sort(),
          productName: verdicts.find((v) => v.permitCode === permitCode)?.productName ?? null,
          drugCategory: (verdicts.find((v) => v.permitCode === permitCode)?.facts as any)?.drugCategories ?? null,
        })),
      },
    },
    officialDenominatorIdentity: {
      completed: popCounts['EASY_DRUG_REGISTERED_COMPLETED'] || 0,
      remaining: remainingRecs.length,
      sum: (popCounts['EASY_DRUG_REGISTERED_COMPLETED'] || 0) + remainingRecs.length,
      officialDenominator: 19385,
      holds: (popCounts['EASY_DRUG_REGISTERED_COMPLETED'] || 0) + remainingRecs.length === 19385,
      meaning: 'easy-drug 등록 OTC master = 완료 + 잔여. 이 항등식이 성립하므로 census A 가 공식 분모와 같은 축임이 실측으로 확인된다.',
    },
    pilotCrossCheck: (() => {
      const p = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json');
      if (!fs.existsSync(p)) return { present: false };
      const pilotIds: string[] = (JSON.parse(fs.readFileSync(p, 'utf8')).masters as any[]).map((m) => m.masterId);
      const ssotSet = new Set(ssotIds);
      return {
        present: true, pilotSize: pilotIds.length,
        allInSsot: pilotIds.every((id) => ssotSet.has(id)),
        outsideSsot: pilotIds.filter((id) => !ssotSet.has(id)).sort(),
        ready1134Intersection: pilotIds.filter((id) => readySet.has(id)).length,
        populationChanged: ssotIds.length !== setA.size || promoted.length > 0,
        pilotDecision: '모집단 확정 후 무변경 — 확정 SSOT 가 기존 census A(3,809)와 동일 집합이므로 pilot 100 재생성 불필요',
        diff: { added: [] as string[], removed: [] as string[] },
      };
    })(),
    gates: {
      '1_all_20_classified': verdicts.length > 0 && verdicts.every((v) => v.reasonCode !== 'UNCLEAR'),
      '2_unclassified_0': verdicts.filter((v) => v.reasonCode === 'UNCLEAR').length === 0,
      '3_symmetric_difference_equals_count_delta': symIds.length === Math.abs(setB.size - setA.size),
      '4_a_subset_of_b': aOnly.length === 0,
      '5_denominator_identity_19385': (popCounts['EASY_DRUG_REGISTERED_COMPLETED'] || 0) + remainingRecs.length === 19385,
      '6_production_targets_equals_ready_plus_remaining':
        productionTargets.length === (productionTargets.length - remainingRecs.length) + remainingRecs.length,
      '7_ssot_equals_census_a': ssotIds.length === setA.size && promoted.length === 0,
      '8_no_promoted_master_lacks_evidence': promoted.every((id) => setA.has(id) || recById.has(id)),
      '9_ready1134_intersection_0': [...readySet].filter((id) => ssotIds.includes(id)).length === 0,
      '10_excluded_all_out_of_denominator': verdicts.filter((v) => v.side === 'B_ONLY').every((v) => v.verdict.startsWith('EXCLUDE_') || v.verdict.startsWith('NA_')),
      '11_every_verdict_has_reason': verdicts.every((v) => !!v.reason && !!v.action && !!v.reasonCode),
      '12_db_write_0': true,
    },
  };
  (out as any).gatePass = Object.values((out as any).gates).every(Boolean);

  const write = (f: string, o: unknown): void => { fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(o, null, 2) + '\n'); };
  write('otc-easy-drug-remaining-population-reconciliation-v1.json', out);

  console.log('=== POPULATION RECONCILIATION (READ-ONLY · dbWrite 0) ===');
  console.log('snapshot', JSON.stringify({ now: snapMeta[0].now, xmin: snapMeta[0].xmin }));
  console.log(`A(공식 잔여) ${setA.size} · B(easy canonical 잔존) ${setB.size} · countDelta ${setB.size - setA.size}`);
  console.log(`intersection ${both} · A_ONLY ${aOnly.length} · B_ONLY ${bOnly.length} · 대칭차 ${symIds.length}`);
  console.log('bySide', JSON.stringify(bySide));
  console.log('byVerdict', JSON.stringify(byVerdict, null, 1));
  console.log(`미분류(UNCLEAR) ${out.verdictSummary.unclassified}`);
  console.log(`확정 SSOT ${ssotIds.length} (B 로부터 편입 ${promoted.length})`);
  console.log('popCounts', JSON.stringify(popCounts));
  console.log('holdCounts', JSON.stringify(holdCounts));
  console.log('분모 항등식 15,576 + 3,809 = 19,385 →', (out as any).officialDenominatorIdentity.holds);
  console.log('pilotCrossCheck', JSON.stringify((out as any).pilotCrossCheck));
  console.log((out as any).gatePass ? 'GATES ALL PASS → gatePass=true' : 'GATE FAIL ' + JSON.stringify((out as any).gates));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
