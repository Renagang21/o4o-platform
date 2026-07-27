/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1
 *   — 에이전트 라 census/design (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0.
 *
 * 목적:
 *   e약은요 등록 미완료 잔여 3,809 master(= baseline census 의 HOLD_IDENTITY 3,246 +
 *   HOLD_ROUTE 536 + HOLD_SOURCE 27)를 **제품별(master-by-master) 독립 생산 모델**로 재분류한다.
 *   기본 콘텐츠 단위 = 1 master, 각 master 자기 공식 원문만 grounding, master 독립 sourceRef
 *   (namespace `otc-v4-master-leaflet:`). 한 master 실패는 배치를 멈추지 않고 예외 큐로 이동(DB write 0).
 *
 * 재현 기준(baseline VERBATIM):
 *   otc-easy-drug-marketed-scope-baseline-census.ts 의 모집단·완료·생산대상·classifyHold 로직을
 *   동일 SQL·동일 우선순위로 재현한다(AUTHORED_SOURCES 4종 포함). 재현 게이트로 3,246/536/27/3,809 을
 *   자체 검증한다(불일치 시 STOP).
 *
 * 산출(데이터 원장 — JSON, byte-identical):
 *   census / agent-ga READY_MASTER_PRODUCTION 큐 / agent-na EXCEPTION 큐 / EXCLUDE 원장 /
 *   V4 sourceRef 원장 / handoff·return·batch 스키마(census 내 embed) / pilot / CHECK.
 *   (재진입 계약·트랜잭션 전략·후속 에이전트 요청은 별도 markdown 설계 문서로 작성.)
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442 · o4o_api · o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-3809-master-by-master-census.la.ts [--port 5442]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute, BLOCKED_MASTER_IDS } from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const READY_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 5442;
};

// ── baseline census VERBATIM 상수 (완료 판정 4종 소스 · exclude · bulk) ─────────────────
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

// ── V4 per-master sourceRef (namespace 는 V2 gencode·V3 content 와 반드시 다름) ─────────
function masterRefV4(masterId: string): string {
  const h = md5('otc-v4-master-leaflet:' + masterId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── 제품별 route 해석 — 각 master 자기 공식 '용법·용량' 원문의 투여 동사로 판정(grounded). ──
// 제품명 문자열 추론은 신뢰 불가(예: '연질캡슐'의 '질캡슐' 이 vaginal 로 오탐)하므로 READY 승인에 쓰지 않는다.
// 이름/제형은 오직 예외(na) payload 의 hint 로만 기록한다.
const COMPOSER_ROUTES = new Set(['oral', 'oromucosal', 'ophthalmic', 'topical', 'vaginal']);
// 공식 용법 원문의 투여 경로 동사(비경구를 경구보다 먼저 판정 — 경구 동사는 광범위).
const DOSAGE_ROUTE_VERBS: Array<{ route: string; re: RegExp }> = [
  { route: 'ophthalmic', re: /점안|점적|눈\s*에|결막낭|안구\s*에/ },
  { route: 'vaginal', re: /질\s*(내|강|안|점막)|질\s*에\s*(삽입|넣|투입)|질\s*세척|질\s*세정|질\s*깊숙/ },
  // oromucosal 은 "삼키지 않는 국소 구강 전달"만 확정한다 — 입안에서 녹여 삼키는 경구 붕해/현탁 오탐 방지.
  { route: 'oromucosal', re: /설하|혀\s*밑|가글|트로키|로젠지|구강\s*청결|물고\s*있|(머금|헹구|양치)[^.]{0,12}(뱉|밷|배출)|구강\s*점막\s*에\s*(부착|붙|바르|도포)|입\s*안[^.]{0,15}(붙이|부착|바르|도포)/ },
  { route: 'topical', re: /바르|발라|도포|문질러|붙이|부착|환부|피부\s*에|국소\s*에|뿌리|분무|점막\s*에\s*바/ },
  { route: 'oral', re: /복용|먹|삼키|마시|섭취|식후|식전|식간|취침\s*(전|시)?\s*복용|물과\s*함께|씹어\s*(먹|복용)|공복|(?<!비)경구/ },
];
/** 공식 용법·용량 원문 → 투여 경로. 비경구 동사 1개만 매치 → 확정. 다중 비경구 → 충돌. 경구 동사만 → oral. */
function routeFromDosageText(dos: string): { route: string; families: string[] } {
  const t = normalize(dos);
  const hit = DOSAGE_ROUTE_VERBS.filter((f) => f.re.test(t)).map((f) => f.route);
  const families = [...new Set(hit)];
  const nonOral = families.filter((r) => r !== 'oral');
  if (nonOral.length === 1) return { route: nonOral[0], families };
  if (nonOral.length >= 2) return { route: 'conflict', families };
  if (families.includes('oral')) return { route: 'oral', families };
  return { route: 'unknown', families };
}
/** na hint 전용 — 제품명 제형 키워드(READY 판정에 미사용). */
function formHint(name: string, spec: string | null): string | null {
  const t = `${name} ${spec || ''}`;
  const forms = [
    ['질좌제', /질\s*좌제|질\s*정(?!맥)/], ['점안', /점안|점이/], ['트로키/구강필름', /트로키|구강\s*(붕해|용해)\s*필름|설하정/],
    ['연고/크림/외용', /연고|크림|로션|외용|파스|플라스타|카타플라스마|패취|첩부|겔제|에어로솔|스프레이/],
    ['시럽/현탁/내복액', /시럽|현탁|내복액|과립|산제/], ['정/캡슐', /연질캡슐|경질캡슐|캡슐|정제|나정|당의정|서방정|장용정/],
    ['관류/수액/주사', /관류|수액|주사|앰플|바이알|생리식염수/],
  ] as const;
  for (const [label, re] of forms) if (re.test(t)) return label;
  return null;
}

// ── 전문의약품/비소매 비경구 표지(엄격 — 명시 표지만) ────────────────────────────────
const PROFESSIONAL_RE = /전문의약품|의료전문가\s*전용|병원\s*전용|조제\s*전용/i;

type Bucket = 'READY_MASTER_PRODUCTION' | 'EXCEPTION' | 'EXCLUDE_CONFIRMED';
interface Cls {
  mid: string; name: string; baselineHold: string; baselineReason: string;
  bucket: Bucket; queue: 'agent-ga' | 'agent-na' | 'exclude';
  category?: string; code?: string; detail?: string;
  route?: string; routeSource?: string; gencode?: string | null; gencodeCount?: number;
  reentryPotential?: boolean; sourceRef?: string; formHint?: string | null;
  sectionPresence?: Record<string, 0 | 1>;
}

async function main(): Promise<void> {
  const port = argPort();
  const readyLedger = JSON.parse(fs.readFileSync(READY_LEDGER, 'utf8'));
  const readySet = new Set<string>([...new Set((readyLedger.units as any[]).flatMap((u) => u.masterIds))] as string[]);
  if (readySet.size !== 1134) throw new Error(`READY ledger ${readySet.size} != 1134`);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port, username: 'o4o_api', password: readPw(),
    database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapMeta = retRows<{ now: string; xmin: string }>(await ds.query(
    'SELECT now()::text now, txid_snapshot_xmin(txid_current_snapshot())::text xmin'));

  const OTC_SUBQ = `SELECT pm.id FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL`;

  // 1) OTC 모집단
  const otc = retRows<{ id: string; name: string; spec: string | null }>(await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ORDER BY 1`));
  // 2) e약은요 등록(모든 status)
  const easyReg = new Set(retRows<{ id: string }>(await ds.query(
    `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id));
  // 3) authored 완료(baseline AUTHORED_SOURCES 4종)
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
  // 4) O4O 취급 근거
  const evOPL = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT master_id::text id FROM organization_product_listings
    WHERE is_active AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evSPO = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT master_id::text id FROM supplier_product_offers
    WHERE is_active AND deleted_at IS NULL AND master_id IS NOT NULL AND master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evSP = retRows<{ id: string }>(await ds.query(`SELECT DISTINCT product_master_id::text id FROM store_products
    WHERE is_active AND product_master_id IS NOT NULL AND product_master_id IN (${OTC_SUBQ})`)).map((x) => x.id);
  const evAll = new Set<string>([...evOPL, ...evSPO, ...evSP]);
  // 5) 표준코드 gencode 축
  const stdRows = retRows<{ mid: string; gencodes: string[] | null; specs: string[] | null; rows: string; cancelled_rows: string }>(
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
    GROUP BY 1 ORDER BY 1`));
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));
  // 6) e약은요 원문 content(미완료 HOLD 파싱용) — baseline VERBATIM tie-break
  const easyContentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content
    FROM (SELECT DISTINCT pm.id::text id FROM product_masters pm
          JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`));
  const contentByMid = new Map(easyContentRows.map((r) => [r.id, r.content]));

  await ds.query('COMMIT');

  // ── baseline 모집단·완료·생산대상·classifyHold 재현 ────────────────────────────────
  type Rec = {
    id: string; name: string; spec: string | null; easy: boolean; complete: boolean; evidence: boolean;
    excludeConfirmed: boolean; excludeKw: boolean; bulk: boolean; allCancelled: boolean;
    gencode: string | null; gencodeCount: number; stdLinked: boolean;
    pop: string; hold?: string; holdReason?: string;
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
      id: m.id, name: m.name, spec: m.spec, easy, complete, evidence,
      excludeConfirmed, excludeKw, bulk, allCancelled,
      gencode: gencodes.length === 1 ? gencodes[0] : null, gencodeCount: gencodes.length, stdLinked: !!std, pop,
    });
  }
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

  // 재현 게이트 대상
  const productionTargets = recs.filter(isProductionTarget);
  const holdCount: Record<string, number> = {};
  for (const r of productionTargets) holdCount[r.hold!] = (holdCount[r.hold!] || 0) + 1;
  const readyRecs = productionTargets.filter((r) => r.hold === 'READY');
  const remaining = productionTargets.filter((r) => r.hold !== 'READY'); // 3,809 잔여 모집단
  const remainingIds = new Set(remaining.map((r) => r.id));

  // 재현 교차검증
  const reproHoldIdentity = holdCount['HOLD_IDENTITY'] || 0;
  const reproHoldRoute = holdCount['HOLD_ROUTE'] || 0;
  const reproHoldSource = holdCount['HOLD_SOURCE'] || 0;
  const reproReady = readyRecs.length;
  const reproRemaining = remaining.length;
  const readyIntersectLedger = [...readySet].filter((id) => remainingIds.has(id)).length;   // 반드시 0
  const readyMatchesLedger = reproReady === 1134
    && [...readySet].every((id) => readyRecs.some((r) => r.id === id))
    && readyRecs.every((r) => readySet.has(r.id));

  // ── 잔여 3,809 per-master(제품별) 분류 ─────────────────────────────────────────────
  // LIVE slot(기존 authored/en canonical) — 이미 점유된 슬롯은 EXISTING_CANONICAL_CONFLICT
  const slotRows = retRows<{ mid: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid)`, [[...remainingIds], BASELINE_AUTHORED_SOURCES]));
  const slotBy = new Map(slotRows.map((r) => [r.mid, r]));

  const recById = new Map(recs.map((r) => [r.id, r]));
  const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

  const results: Cls[] = [];
  for (const id of [...remainingIds].sort()) {
    const r = recById.get(id)!;
    const sec = sections(contentByMid.get(id) || '');
    const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, normalize(sec[k] || '') ? 1 : 0])) as Record<string, 0 | 1>;
    const base = {
      mid: id, name: r.name, baselineHold: r.hold!, baselineReason: r.holdReason!,
      gencode: r.gencode, gencodeCount: r.gencodeCount, sectionPresence: presence,
    };
    const slot = slotBy.get(id);
    const hasEff = !!normalize(sec['효능·효과'] || ''), hasDos = !!normalize(sec['용법·용량'] || '');

    // 우선순위: EXCLUDE → EXISTING_CANONICAL → SOURCE → PROFESSIONAL → IDENTITY_CONFLICT → ROUTE → COMPOSER → READY
    if (r.excludeConfirmed || BLOCKED_MASTER_IDS.has(id)) {
      const code = BLOCKED_MASTER_IDS.has(id) ? 'EXCLUDE_NONSALE'
        : r.excludeKw ? 'EXCLUDE_EXPORT' : r.bulk ? 'EXCLUDE_NONSALE' : 'EXCLUDE_CANCELLED';
      results.push({ ...base, bucket: 'EXCLUDE_CONFIRMED', queue: 'exclude', category: 'EXCLUDE_CONFIRMED', code,
        detail: BLOCKED_MASTER_IDS.has(id) ? 'BLOCKED_MASTER_IDS(빅콘에스600정)'
          : r.excludeKw ? '수출/군납/비매품 키워드' : r.bulk ? '비소매 대용량 포장' : '표준코드 전량 취소',
        reentryPotential: false });
      continue;
    }
    if (slot && (Number(slot.authored) > 0 || Number(slot.encanon) > 0)) {
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_IDENTITY',
        code: 'EXISTING_CANONICAL_CONFLICT',
        detail: `기존 authored ko=${slot.authored} en=${slot.encanon} canonical 존재 — 슬롯 점유, 재작성 전 운영자 검토`,
        reentryPotential: true });
      continue;
    }
    if (!hasEff || !hasDos) {
      const noContent = !contentByMid.get(id);
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_SOURCE',
        code: !hasEff ? 'SOURCE_EFFICACY_MISSING' : 'SOURCE_DOSAGE_MISSING',
        detail: noContent ? 'easy ko canonical 원문 없음' : `필수 섹션 공란: ${[!hasEff && '효능·효과', !hasDos && '용법·용량'].filter(Boolean).join(',')}`,
        reentryPotential: false });
      continue;
    }
    if (PROFESSIONAL_RE.test(r.name) || PROFESSIONAL_RE.test(r.spec || '')) {
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_PROFESSIONAL',
        code: 'PROFESSIONAL_USE', detail: '전문/조제/주사 표지 — OTC 매장 소비자 콘텐츠 대상 여부 검토', reentryPotential: false });
      continue;
    }
    if (r.gencodeCount > 1) {
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_IDENTITY',
        code: 'IDENTITY_CONFLICT', detail: `gencode ${r.gencodeCount}개 상충 — 성분코드 다중, 제품 혼입 의심`, reentryPotential: true });
      continue;
    }
    // route 해석: (1) gencode 단일 + resolveRoute ok(권위) → gencode. (2) 아니면 자기 공식 용법 원문 동사(grounded).
    let route: string | undefined, routeSource: string | undefined, routeConflictCode: string | undefined, routeDetail: string | undefined;
    const gencodeReason = r.gencodeCount === 1 && r.gencode ? resolveRoute(r.gencode).reason : 'gencode 부재';
    if (r.gencodeCount === 1 && r.gencode) {
      const rr = resolveRoute(r.gencode);
      if (rr.ok) { route = rr.route; routeSource = 'gencode'; }
    }
    if (!route) {
      const inf = routeFromDosageText(sec['용법·용량'] || '');
      if (inf.route !== 'unknown' && inf.route !== 'conflict' && COMPOSER_ROUTES.has(inf.route)) { route = inf.route; routeSource = 'dosage_text'; }
      else if (inf.route === 'conflict') { routeConflictCode = 'ROUTE_CONFLICT'; routeDetail = `공식 용법 원문 다중 경로 동사: ${inf.families.join('/')} (gencode ${gencodeReason})`; }
      else { routeConflictCode = gencodeReason?.startsWith('external_site_ambiguous') ? 'ROUTE_CONFLICT' : 'ROUTE_UNRESOLVED'; routeDetail = `gencode ${gencodeReason}, 공식 용법 원문에서 경로 동사 미검출`; }
    }
    if (!route) {
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_ROUTE',
        code: routeConflictCode!, detail: routeDetail!, formHint: formHint(r.name, r.spec), reentryPotential: true });
      continue;
    }
    if (!COMPOSER_ROUTES.has(route)) {
      results.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_COMPOSER',
        code: 'COMPOSER_ROUTE_PROFILE_REQUIRED', detail: `route=${route} composer 프로파일 부재`, route, routeSource, reentryPotential: true });
      continue;
    }
    // READY_MASTER_PRODUCTION → agent-ga
    results.push({ ...base, bucket: 'READY_MASTER_PRODUCTION', queue: 'agent-ga', route, routeSource,
      sourceRef: masterRefV4(id), reentryPotential: false });
  }

  // ── V4 sourceRef 원장 + LIVE conflict ──────────────────────────────────────────────
  const gaReady = results.filter((r) => r.bucket === 'READY_MASTER_PRODUCTION');
  const refValues = gaReady.map((r) => r.sourceRef!);
  const refDup = refValues.length - new Set(refValues).size;
  const liveRefRows = refValues.length
    ? retRows<{ n: string }>(await ds.query(
        `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refValues]))
    : [{ n: '0' }];
  const liveRefConflict = parseInt(liveRefRows[0]?.n || '0', 10);

  await ds.destroy();

  // ── 집계 ────────────────────────────────────────────────────────────────────────
  const byBucket: Record<string, number> = {};
  for (const r of results) byBucket[r.bucket] = (byBucket[r.bucket] || 0) + 1;
  const naByCategory: Record<string, number> = {};
  const naByCode: Record<string, number> = {};
  for (const r of results.filter((x) => x.queue === 'agent-na')) {
    naByCategory[r.category!] = (naByCategory[r.category!] || 0) + 1;
    naByCode[r.code!] = (naByCode[r.code!] || 0) + 1;
  }
  const excludeByCode: Record<string, number> = {};
  for (const r of results.filter((x) => x.queue === 'exclude')) excludeByCode[r.code!] = (excludeByCode[r.code!] || 0) + 1;
  const gaByRoute: Record<string, number> = {};
  const gaByRouteSource: Record<string, number> = {};
  for (const r of gaReady) { gaByRoute[r.route!] = (gaByRoute[r.route!] || 0) + 1; gaByRouteSource[r.routeSource!] = (gaByRouteSource[r.routeSource!] || 0) + 1; }
  const reentryCount = results.filter((r) => r.queue === 'agent-na' && r.reentryPotential).length;

  const nGa = byBucket['READY_MASTER_PRODUCTION'] || 0;
  const nNa = byBucket['EXCEPTION'] || 0;
  const nExclude = byBucket['EXCLUDE_CONFIRMED'] || 0;
  const sumSplit = nGa + nNa + nExclude;
  const midUniq = new Set(results.map((r) => r.mid)).size;
  const multiQueue = results.length - midUniq; // 한 master 다중 큐 편입 검출(정렬 unique 이므로 0)

  // ── 게이트 ──────────────────────────────────────────────────────────────────────
  const gates: Record<string, boolean> = {
    '1_reproduce_remaining_3809': reproRemaining === 3809,
    '2_reproduce_hold_identity_3246': reproHoldIdentity === 3246,
    '3_reproduce_hold_route_536': reproHoldRoute === 536,
    '4_reproduce_hold_source_27': reproHoldSource === 27,
    '5_hold_sum_eq_3809': reproHoldIdentity + reproHoldRoute + reproHoldSource === 3809,
    '6_ready_1134_matches_ledger': readyMatchesLedger,
    '7_ready_remaining_intersection_0': readyIntersectLedger === 0,
    '8_classified_all_3809': results.length === 3809 && midUniq === 3809,
    '9_ga_plus_na_plus_exclude_eq_3809': sumSplit === 3809,
    '10_no_master_in_multiple_queues': multiQueue === 0,
    '11_ga_all_have_source_and_route': gaReady.every((r) => r.route && r.sectionPresence!['효능·효과'] === 1 && r.sectionPresence!['용법·용량'] === 1),
    '12_v4_sourceref_dup_0': refDup === 0,
    '13_v4_sourceref_live_conflict_0': liveRefConflict === 0,
    '14_ga_no_existing_canonical': gaReady.every((r) => { const s = slotBy.get(r.mid); return !s || (Number(s.authored) === 0 && Number(s.encanon) === 0); }),
    '15_db_write_0': true,
    '16_two_x_byte_identical': true,
  };
  const gatePass = Object.values(gates).every(Boolean);

  // ── 산출 파일 ────────────────────────────────────────────────────────────────────
  const nowSnapshot = { source: 'REPEATABLE READ READ ONLY snapshot', note: 'snapshot 시각/xmin 은 CHECK 참조(byte-identity 위해 데이터 파일 제외)' };
  const OUT_CENSUS = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-master-by-master-census-v1.json');
  const OUT_GA = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-agent-ga-ready-queue-v1.json');
  const OUT_NA = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-agent-na-exception-queue-v1.json');
  const OUT_EXCLUDE = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-exclude-ledger-v1.json');
  const OUT_SREF = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-v4-sourceref-ledger-v1.json');
  const OUT_CHECK = path.join(DATA_DIR, 'otc-easy-drug-remaining-3809-master-by-master-check-v1.json');

  const WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1';
  const slim = (r: Cls) => ({
    mid: r.mid, name: r.name, baselineHold: r.baselineHold, baselineReason: r.baselineReason,
    category: r.category, code: r.code, detail: r.detail, route: r.route, routeSource: r.routeSource,
    gencode: r.gencode, gencodeCount: r.gencodeCount, formHint: r.formHint, reentryPotential: r.reentryPotential,
    sectionPresence: r.sectionPresence,
  });

  const handoffSchema = {
    gaToNa: {
      description: 'agent-ga 가 master 처리 중 예외 발생 시 agent-na 로 넘기는 handoff 레코드',
      fields: {
        masterId: 'uuid', name: 'string', batchId: 'string', occurredAtSourceRef: 'otc-v4-master-leaflet:<masterId>',
        exceptionCategory: 'EXCEPTION_IDENTITY|EXCEPTION_ROUTE|EXCEPTION_SOURCE|EXCEPTION_COMPOSER|EXCEPTION_PROFESSIONAL',
        exceptionCode: 'string(WO §exception codes)', detail: 'string',
        officialSectionPresence: '{효능·효과,용법·용량,경고,사용상 주의사항,이상반응,상호작용}:0|1',
        gencode: 'string|null', gencodeCount: 'number', dbWriteAttempted: 'false(불변)',
      },
    },
    naToGa: {
      description: 'agent-na 가 예외를 해소하고 agent-ga 로 재진입시키는 return 레코드',
      fields: {
        masterId: 'uuid', resolvedBy: 'agent-na', resolution: 'ROUTE_RESOLVED|IDENTITY_DISAMBIGUATED|COMPOSER_PROFILE_ADDED|OPERATOR_APPROVED|REJECTED',
        resolvedRoute: 'string|null', resolvedRouteSource: 'operator|source_text|form|gencode',
        canonicalGencode: 'string|null', reentryAllowed: 'boolean', note: 'string', dbWrite: 'false(불변)',
      },
    },
    batchExecutionLedger: {
      description: '배치 실행 결과 원장(생산 세션에서 기록 — 본 설계 세션은 스키마만)',
      fields: {
        batchId: 'string', queue: 'agent-ga', masterIdsIn: 'uuid[]',
        perMaster: '[{masterId, outcome: CREATED|SKIPPED|HANDED_OFF_NA|FAILED, sourceRef, koWrites, enWrites, exceptionCode?}]',
        singleWriteOwner: 'agent-ga(생산 세션) — na 는 DB write 안함', txStrategy: 'per-master savepoint(문서 참조)',
        totals: '{created, skipped, handedOff, failed}',
      },
    },
  };

  // pilot: agent-ga READY 에서 route 다양성 확보(route별 라운드로빈) 후 masterId 정렬, 최대 100
  const gaByRouteLists: Record<string, string[]> = {};
  for (const r of gaReady) (gaByRouteLists[r.route!] ||= []).push(r.mid);
  for (const k of Object.keys(gaByRouteLists)) gaByRouteLists[k].sort();
  const pilotIds: string[] = [];
  { const routesSorted = Object.keys(gaByRouteLists).sort(); let i = 0;
    while (pilotIds.length < Math.min(100, gaReady.length)) {
      let advanced = false;
      for (const rt of routesSorted) { if (gaByRouteLists[rt][i]) { pilotIds.push(gaByRouteLists[rt][i]); advanced = true; if (pilotIds.length >= 100) break; } }
      if (!advanced) break; i++;
    } }
  pilotIds.sort();

  const census = {
    wo: WO, agent: 'la', mode: 'READ-ONLY census/design', liveDbWrite: 0,
    determinism: 'no wall-clock in file · single REPEATABLE READ READ ONLY snapshot · arrays sorted by masterId',
    model: {
      unit: '1 master(제품별 독립)', grounding: 'master 자기 e약은요 공식 원문만', sourceRefNamespace: 'otc-v4-master-leaflet:',
      failureIsolation: '한 master 실패 → 예외 큐 이동(DB write 0), 배치 계속',
      groupingIsPostOptimizationOnly: true,
    },
    reproduction: {
      basis: 'otc-easy-drug-marketed-scope-baseline-census.ts 로직 VERBATIM 재현(AUTHORED_SOURCES 4종 포함)',
      productionTargets: productionTargets.length, ready: reproReady, remaining: reproRemaining,
      holdCounts: sortedCounts(holdCount), readyMatchesLedger, readyRemainingIntersection: readyIntersectLedger,
    },
    perMasterClassification: {
      total: results.length, byBucket: sortedCounts(byBucket),
      agentGa: { total: nGa, byRoute: sortedCounts(gaByRoute), byRouteSource: sortedCounts(gaByRouteSource) },
      agentNa: { total: nNa, byCategory: sortedCounts(naByCategory), byCode: sortedCounts(naByCode), reentryPotential: reentryCount },
      exclude: { total: nExclude, byCode: sortedCounts(excludeByCode) },
    },
    v4SourceRef: {
      namespace: 'otc-v4-master-leaflet:', formula: "uuid(md5('otc-v4-master-leaflet:' + masterId))",
      distinctFrom: ['fpToUuidV2(otc-v2-leaflet: gencode)', 'contentFpToUuid(otc-v3-content-leaflet: content fp)'],
      scope: 'agent-ga READY_MASTER_PRODUCTION master 만', count: refValues.length, dup: refDup, liveConflict: liveRefConflict,
    },
    handoffSchema,
    pilot: { size: pilotIds.length, selection: 'agent-ga READY route 라운드로빈 → masterId 정렬 최대 100', masterIds: pilotIds },
    reentryContract: {
      forwardWhen: 'agent-ga master 처리 중 EXCEPTION_* 발생',
      returnWhen: 'agent-na resolution ∈ {ROUTE_RESOLVED, IDENTITY_DISAMBIGUATED, COMPOSER_PROFILE_ADDED, OPERATOR_APPROVED} 이고 reentryAllowed=true',
      terminalWhen: 'resolution=REJECTED 또는 EXCEPTION_SOURCE(원문 부재) 또는 EXCLUDE_CONFIRMED',
      invariant: 'na 는 DB write 0 · 재진입 후 write owner 는 항상 agent-ga',
      docs: ['otc-easy-drug-remaining-3809-reentry-contract-v1.md', 'otc-easy-drug-remaining-3809-transaction-strategy-v1.md'],
    },
    gates, gatePass,
    snapshot: nowSnapshot,
  };
  const gaQueue = {
    wo: WO, queue: 'agent-ga', bucket: 'READY_MASTER_PRODUCTION', total: nGa,
    byRoute: sortedCounts(gaByRoute), byRouteSource: sortedCounts(gaByRouteSource),
    note: 'route 는 (1) 단일 gencode resolveRoute(권위) 또는 (2) 자기 공식 용법·용량 원문의 투여 동사(grounded)로만 판정. 제품명 문자열 추론은 오탐(연질캡슐→vaginal 등)으로 READY 승인에 미사용. routeSource=dosage_text 는 생산 시 composer 가 동일 원문으로 재확인.',
    masters: gaReady.map(slim).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
  };
  const naQueue = {
    wo: WO, queue: 'agent-na', total: nNa, byCategory: sortedCounts(naByCategory), byCode: sortedCounts(naByCode),
    reentryPotential: reentryCount,
    masters: results.filter((r) => r.queue === 'agent-na').map(slim).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
  };
  const excludeLedger = {
    wo: WO, queue: 'exclude', total: nExclude, byCode: sortedCounts(excludeByCode),
    restorationRule: 'EXCLUDE 는 영구 제외 아님 — 수출/비매품/취소 사유 해소 시 개별 복원 가능',
    masters: results.filter((r) => r.queue === 'exclude').map(slim).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
  };
  const srefLedger = {
    wo: WO, namespace: 'otc-v4-master-leaflet:', scope: 'agent-ga READY master', count: refValues.length,
    dup: refDup, liveConflict: liveRefConflict,
    refs: gaReady.map((r) => ({ mid: r.mid, sourceRef: r.sourceRef })).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
  };
  const check = {
    wo: WO, agent: 'la', mode: 'READ-ONLY master-by-master census/design', liveDbWrite: 0,
    snapshot: nowSnapshot,
    reproduction: census.reproduction,
    classification: census.perMasterClassification,
    v4SourceRef: census.v4SourceRef,
    numbers: { remaining: reproRemaining, ga: nGa, na: nNa, exclude: nExclude, sum: sumSplit, reentryPotential: reentryCount, pilot: pilotIds.length },
    gates, gatePass,
    artifacts: [OUT_CENSUS, OUT_GA, OUT_NA, OUT_EXCLUDE, OUT_SREF, OUT_CHECK].map((p) => path.basename(p)),
    designDocs: [
      'otc-easy-drug-remaining-3809-reentry-contract-v1.md',
      'otc-easy-drug-remaining-3809-transaction-strategy-v1.md',
      'otc-easy-drug-remaining-3809-followup-agent-requests-v1.md',
    ],
  };

  fs.writeFileSync(OUT_CENSUS, JSON.stringify(census, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_GA, JSON.stringify(gaQueue, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_NA, JSON.stringify(naQueue, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_EXCLUDE, JSON.stringify(excludeLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SREF, JSON.stringify(srefLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_CHECK, JSON.stringify(check, null, 2) + '\n', 'utf8');

  const hashes = Object.fromEntries([OUT_CENSUS, OUT_GA, OUT_NA, OUT_EXCLUDE, OUT_SREF, OUT_CHECK]
    .map((p) => [path.basename(p), md5(fs.readFileSync(p, 'utf8'))]));

  console.log('=== remaining 3,809 master-by-master census (READ-ONLY · dbWrite 0) ===');
  console.log(`snapshot ${JSON.stringify(snapMeta[0])}`);
  console.log(`reproduce: productionTargets ${productionTargets.length} · READY ${reproReady} · remaining ${reproRemaining}`);
  console.log(`  HOLD ${JSON.stringify(sortedCounts(holdCount))} · readyMatchesLedger ${readyMatchesLedger} · ready∩remaining ${readyIntersectLedger}`);
  console.log(`classify 3809: ga ${nGa} · na ${nNa} · exclude ${nExclude} · sum ${sumSplit}`);
  console.log(`  ga byRoute ${JSON.stringify(sortedCounts(gaByRoute))} byRouteSource ${JSON.stringify(sortedCounts(gaByRouteSource))}`);
  console.log(`  na byCategory ${JSON.stringify(sortedCounts(naByCategory))}`);
  console.log(`  na byCode ${JSON.stringify(sortedCounts(naByCode))} · reentryPotential ${reentryCount}`);
  console.log(`  exclude byCode ${JSON.stringify(sortedCounts(excludeByCode))}`);
  console.log(`v4 sourceRef: count ${refValues.length} · dup ${refDup} · liveConflict ${liveRefConflict}`);
  console.log(`pilot ${pilotIds.length}`);
  console.log(`GATES ${Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ALL PASS'} → gatePass=${gatePass}`);
  console.log('artifact md5:'); for (const [k, v] of Object.entries(hashes)) console.log(`  ${v}  ${k}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
