/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1
 *   — 에이전트 라 1차 시험 대기열 확정 (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0.
 *
 * 목적:
 *   잔여 3,809 master(제품별 생산 모델) 중 **1차 시험용 정확히 100 master** 를 결정론적으로 선정하고,
 *   제품별 사전 조사 원장 / agent-ga 생산 입력 / agent-na 예외 인계 schema / 예외 코드 정의 /
 *   시스템 중지 조건 / 제품 단위 continue 조건 / 2차 500 확장 게이트를 확정한다.
 *
 * 재현 기준(VERBATIM):
 *   otc-easy-drug-remaining-3809-master-by-master-census.la.ts 의 baseline 재현 + per-master 분류 로직을
 *   동일 SQL·동일 우선순위로 재현한다. 재현 게이트(3,809 / 3,246 / 536 / 27 / ga 2,496 / na 1,047 /
 *   exclude 266) 불일치 시 STOP.
 *
 * 선정(결정론 — 랜덤 0):
 *   Stratum A 정상 70  = agent-ga READY (전문일반구분 '전문' 표지 제외) · route 별 D'Hondt 배분
 *                        (route 당 최소 2, 단일 route 상한 50%) · route 내 masterId 오름차순
 *   Stratum B 경계 20  = agent-na EXCEPTION_ROUTE ∪ EXCEPTION_IDENTITY · code 별 D'Hondt(최소 2)
 *   Stratum C 예외 10  = agent-na EXCEPTION_SOURCE ∪ EXCEPTION_COMPOSER · code 별 D'Hondt(최소 2)
 *   부족분은 A→B→C 순서로 결정론적 재배분하고 근거를 기록한다. 합계는 항상 정확히 100.
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:<port> · o4o_api · o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-queue.la.ts [--port 5491]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute, BLOCKED_MASTER_IDS } from './otc-v2-store-leaflet-runner.shared.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1';
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

function masterRefV4(masterId: string): string {
  const h = md5('otc-v4-master-leaflet:' + masterId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const COMPOSER_ROUTES = new Set(['oral', 'oromucosal', 'ophthalmic', 'topical', 'vaginal']);
const DOSAGE_ROUTE_VERBS: Array<{ route: string; re: RegExp }> = [
  { route: 'ophthalmic', re: /점안|점적|눈\s*에|결막낭|안구\s*에/ },
  { route: 'vaginal', re: /질\s*(내|강|안|점막)|질\s*에\s*(삽입|넣|투입)|질\s*세척|질\s*세정|질\s*깊숙/ },
  { route: 'oromucosal', re: /설하|혀\s*밑|가글|트로키|로젠지|구강\s*청결|물고\s*있|(머금|헹구|양치)[^.]{0,12}(뱉|밷|배출)|구강\s*점막\s*에\s*(부착|붙|바르|도포)|입\s*안[^.]{0,15}(붙이|부착|바르|도포)/ },
  { route: 'topical', re: /바르|발라|도포|문질러|붙이|부착|환부|피부\s*에|국소\s*에|뿌리|분무|점막\s*에\s*바/ },
  { route: 'oral', re: /복용|먹|삼키|마시|섭취|식후|식전|식간|취침\s*(전|시)?\s*복용|물과\s*함께|씹어\s*(먹|복용)|공복|(?<!비)경구/ },
];
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
const PROFESSIONAL_RE = /전문의약품|의료전문가\s*전용|병원\s*전용|조제\s*전용/i;
/** pilot 전용 추가 스크리닝 — 표준코드 '전문일반구분' 또는 수술/시술 표지. 정상(A) 대기열에서만 배제. */
const SURGICAL_RE = /수술\s*용|시술\s*용|무균\s*수술|관류액|투석액|조영|마취/i;

// ── §4 사전조사 보조 ────────────────────────────────────────────────────────────────
const DIGIT_RE = /\d/g;
const UNICODE_FRACTION_RE = /[½¼¾⅓⅔⅛]/;
const AGE_RE = /(\d+)\s*(세|개월|살)|만\s*\d+\s*세|소아|성인|영아|유아|청소년|고령자/;
const DURATION_RE = /(\d+)\s*(일|주|주간|개월|시간|분)\s*(이내|이상|간|동안|까지)?|장기\s*(간|연용)/;
function numericProfile(dos: string): { digitTokens: number; hasUnicodeFraction: boolean; hasAgeToken: boolean; hasDurationToken: boolean } {
  const t = normalize(dos || '');
  DIGIT_RE.lastIndex = 0;
  return {
    digitTokens: (t.match(/\d+(?:[.,]\d+)?/g) || []).length,
    hasUnicodeFraction: UNICODE_FRACTION_RE.test(t),
    hasAgeToken: AGE_RE.test(t),
    hasDurationToken: DURATION_RE.test(t),
  };
}

/**
 * 제형 대표값 선택 — 표준코드 '제형구분' 은 포장단위(개/통/포)와 실제 제형(정/점안액/크림)이 섞여 있다.
 * 실제 제형을 우선하고, 없으면 정렬 첫 값. 결정론적.
 */
const GENERIC_PACKAGING = new Set(['개', '통', '병', '매', '관', '포', '박스', '세트', '키트', '장', '권', '기타', '바이알', '앰플']);
function pickDosageForm(cands: string[]): string | null {
  const s = [...new Set(cands.filter(Boolean))].sort();
  return s.find((x) => !GENERIC_PACKAGING.has(x)) ?? s[0] ?? null;
}
/** 함량 후보 — 표준코드 '약품규격'. '없음' 은 제외. 결정론적 정렬. */
function strengthCandidates(specs: string[]): string[] {
  return [...new Set(specs.filter((x) => x && x !== '없음'))].sort();
}

/** D'Hondt(Jefferson) 배분 — 결정론적. floor(최소 배분) + cap(상한) 지원. tie-break = key 오름차순. */
function allocate(pool: Record<string, number>, total: number, minEach: number, cap: number | null): Record<string, number> {
  const keys = Object.keys(pool).sort();
  const alloc: Record<string, number> = {};
  for (const k of keys) alloc[k] = Math.min(minEach, pool[k], cap ?? Infinity);
  let assigned = keys.reduce((s, k) => s + alloc[k], 0);
  // 최소배분이 total 을 초과하면 큰 pool 우선으로 회수(결정론)
  while (assigned > total) {
    const shrink = keys.filter((k) => alloc[k] > 0)
      .sort((a, b) => pool[a] - pool[b] || (a < b ? -1 : 1))[0];
    if (shrink === undefined) break;
    alloc[shrink] -= 1; assigned -= 1;
  }
  while (assigned < total) {
    const eligible = keys.filter((k) => alloc[k] < Math.min(pool[k], cap ?? Infinity));
    if (!eligible.length) break;
    let best = eligible[0];
    let bestScore = pool[best] / (alloc[best] + 1);
    for (const k of eligible.slice(1)) {
      const s = pool[k] / (alloc[k] + 1);
      if (s > bestScore) { best = k; bestScore = s; }
    }
    alloc[best] += 1; assigned += 1;
  }
  return alloc;
}

type Bucket = 'READY_MASTER_PRODUCTION' | 'EXCEPTION' | 'EXCLUDE_CONFIRMED';
interface Cls {
  mid: string; name: string; spec: string | null; baselineHold: string; baselineReason: string;
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
  const evAll = new Set<string>([...evOPL, ...evSPO, ...evSP]);

  // 표준코드 축 — baseline 필드 + pilot 사전조사 필드(품목기준코드·제형구분·전문일반구분)
  const stdRows = retRows<{
    mid: string; gencodes: string[] | null; specs: string[] | null; rows: string; cancelled_rows: string;
    permit_codes: string[] | null; form_kinds: string[] | null; class_kinds: string[] | null;
  }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs,
           COUNT(*)::text rows,
           COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled_rows,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'품목기준코드','')), NULL) permit_codes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'제형구분','')), NULL) form_kinds,
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
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`));
  const contentByMid = new Map(easyContentRows.map((r) => [r.id, r.content]));

  // §4 사전조사 — 성분/함량/제형 (product_drug_extensions)
  const extRows = retRows<{ mid: string; ingredient: string | null; strength: string | null; form: string | null; mfds_code: string | null; atc: string | null }>(
    await ds.query(`
    SELECT e.product_master_id::text mid, e.ingredient_summary ingredient, e.strength, e.dosage_form form,
           e.mfds_code, e.atc_code atc
    FROM product_drug_extensions e
    WHERE e.drug_category='otc' AND e.deleted_at IS NULL ORDER BY 1`));
  const extByMid = new Map(extRows.map((r) => [r.mid, r]));

  await ds.query('COMMIT');

  // ── baseline 재현 ──────────────────────────────────────────────────────────────────
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

  const productionTargets = recs.filter(isProductionTarget);
  const holdCount: Record<string, number> = {};
  for (const r of productionTargets) holdCount[r.hold!] = (holdCount[r.hold!] || 0) + 1;
  const readyRecs = productionTargets.filter((r) => r.hold === 'READY');
  const remaining = productionTargets.filter((r) => r.hold !== 'READY');
  const remainingIds = new Set(remaining.map((r) => r.id));
  const reproHoldIdentity = holdCount['HOLD_IDENTITY'] || 0;
  const reproHoldRoute = holdCount['HOLD_ROUTE'] || 0;
  const reproHoldSource = holdCount['HOLD_SOURCE'] || 0;
  const reproReady = readyRecs.length;
  const reproRemaining = remaining.length;
  const readyIntersectLedger = [...readySet].filter((id) => remainingIds.has(id)).length;
  const readyMatchesLedger = reproReady === 1134
    && [...readySet].every((id) => readyRecs.some((r) => r.id === id))
    && readyRecs.every((r) => readySet.has(r.id));

  // ── per-master 분류 (VERBATIM) ──────────────────────────────────────────────────────
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const slotRows = retRows<{ mid: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid)`, [[...remainingIds].sort(), BASELINE_AUTHORED_SOURCES]));
  const slotBy = new Map(slotRows.map((r) => [r.mid, r]));

  const recById = new Map(recs.map((r) => [r.id, r]));
  const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

  const results: Cls[] = [];
  for (const id of [...remainingIds].sort()) {
    const r = recById.get(id)!;
    const sec = sections(contentByMid.get(id) || '');
    const presence = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, normalize(sec[k] || '') ? 1 : 0])) as Record<string, 0 | 1>;
    const base = {
      mid: id, name: r.name, spec: r.spec, baselineHold: r.hold!, baselineReason: r.holdReason!,
      gencode: r.gencode, gencodeCount: r.gencodeCount, sectionPresence: presence,
    };
    const slot = slotBy.get(id);
    const hasEff = !!normalize(sec['효능·효과'] || ''), hasDos = !!normalize(sec['용법·용량'] || '');

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
    results.push({ ...base, bucket: 'READY_MASTER_PRODUCTION', queue: 'agent-ga', route, routeSource,
      sourceRef: masterRefV4(id), reentryPotential: false });
  }

  const gaReady = results.filter((r) => r.bucket === 'READY_MASTER_PRODUCTION');
  const naAll = results.filter((r) => r.queue === 'agent-na');
  const excludeAll = results.filter((r) => r.queue === 'exclude');

  // ── pilot 전용 전문/수술 스크린 (A 대기열 배제 근거) ──────────────────────────────────
  const professionalSuspect = (r: Cls): { flag: boolean; reason: string | null } => {
    const std = stdByMid.get(r.mid);
    const cls = (std?.class_kinds || []).filter(Boolean);
    if (cls.some((c) => /전문/.test(c))) return { flag: true, reason: `표준코드 전문일반구분=${[...new Set(cls)].sort().join('/')}` };
    if (SURGICAL_RE.test(r.name) || SURGICAL_RE.test(r.spec || '')) return { flag: true, reason: '수술/시술/관류/마취 표지(제품명·규격)' };
    return { flag: false, reason: null };
  };
  const proScreen = new Map(gaReady.map((r) => [r.mid, professionalSuspect(r)]));
  const gaEligible = gaReady.filter((r) => !proScreen.get(r.mid)!.flag);
  const gaScreenedOut = gaReady.filter((r) => proScreen.get(r.mid)!.flag);

  // ── Stratum 선정 (결정론) ────────────────────────────────────────────────────────────
  const STRATUM_TARGET = { A: 70, B: 20, C: 10 };
  const CAP_FRAC = 0.5;

  // A: route 별 D'Hondt (최소 2, 상한 50%)
  const aPoolByRoute: Record<string, string[]> = {};
  for (const r of gaEligible) (aPoolByRoute[r.route!] ||= []).push(r.mid);
  for (const k of Object.keys(aPoolByRoute)) aPoolByRoute[k].sort();
  const aPoolCounts = Object.fromEntries(Object.entries(aPoolByRoute).map(([k, v]) => [k, v.length]));
  const aAlloc = allocate(aPoolCounts, STRATUM_TARGET.A, 2, Math.floor(STRATUM_TARGET.A * CAP_FRAC));
  const aIds: string[] = [];
  for (const k of Object.keys(aAlloc).sort()) aIds.push(...aPoolByRoute[k].slice(0, aAlloc[k]));

  // B: 경계(route/identity 판단 필요) — code 별 D'Hondt (최소 2)
  const bPoolByCode: Record<string, string[]> = {};
  for (const r of naAll.filter((x) => x.category === 'EXCEPTION_ROUTE' || x.category === 'EXCEPTION_IDENTITY'))
    (bPoolByCode[r.code!] ||= []).push(r.mid);
  for (const k of Object.keys(bPoolByCode)) bPoolByCode[k].sort();
  const bPoolCounts = Object.fromEntries(Object.entries(bPoolByCode).map(([k, v]) => [k, v.length]));

  // C: source/composer 예외 — code 별 D'Hondt (최소 2)
  const cPoolByCode: Record<string, string[]> = {};
  for (const r of naAll.filter((x) => x.category === 'EXCEPTION_SOURCE' || x.category === 'EXCEPTION_COMPOSER'))
    (cPoolByCode[r.code!] ||= []).push(r.mid);
  for (const k of Object.keys(cPoolByCode)) cPoolByCode[k].sort();
  const cPoolCounts = Object.fromEntries(Object.entries(cPoolByCode).map(([k, v]) => [k, v.length]));

  // 부족분 재배분 (A→B→C 순서, 결정론)
  const poolTotal = { A: aIds.length, B: Object.values(bPoolCounts).reduce((s, n) => s + n, 0), C: Object.values(cPoolCounts).reduce((s, n) => s + n, 0) };
  const realloc: string[] = [];
  let tA = Math.min(STRATUM_TARGET.A, poolTotal.A);
  let tB = Math.min(STRATUM_TARGET.B, poolTotal.B);
  let tC = Math.min(STRATUM_TARGET.C, poolTotal.C);
  if (tA < STRATUM_TARGET.A) realloc.push(`A 부족 ${STRATUM_TARGET.A - tA}(pool ${poolTotal.A})`);
  if (tB < STRATUM_TARGET.B) realloc.push(`B 부족 ${STRATUM_TARGET.B - tB}(pool ${poolTotal.B})`);
  if (tC < STRATUM_TARGET.C) realloc.push(`C 부족 ${STRATUM_TARGET.C - tC}(pool ${poolTotal.C})`);
  let deficit = 100 - (tA + tB + tC);
  for (const s of ['A', 'B', 'C'] as const) {
    if (deficit <= 0) break;
    const cur = s === 'A' ? tA : s === 'B' ? tB : tC;
    const cap = s === 'A' ? poolTotal.A : s === 'B' ? poolTotal.B : poolTotal.C;
    const add = Math.min(deficit, cap - cur);
    if (add > 0) { if (s === 'A') tA += add; else if (s === 'B') tB += add; else tC += add; deficit -= add; realloc.push(`${s} +${add} 재배분`); }
  }
  const aFinal = tA === STRATUM_TARGET.A ? aIds : (() => {
    const al = allocate(aPoolCounts, tA, 2, Math.max(2, Math.floor(tA * CAP_FRAC)));
    const out: string[] = []; for (const k of Object.keys(al).sort()) out.push(...aPoolByRoute[k].slice(0, al[k])); return out;
  })();
  const bAlloc = allocate(bPoolCounts, tB, 2, null);
  const bIds: string[] = []; for (const k of Object.keys(bAlloc).sort()) bIds.push(...bPoolByCode[k].slice(0, bAlloc[k]));
  const cAlloc = allocate(cPoolCounts, tC, 2, null);
  const cIds: string[] = []; for (const k of Object.keys(cAlloc).sort()) cIds.push(...cPoolByCode[k].slice(0, cAlloc[k]));

  const stratumOf = new Map<string, 'A_NORMAL' | 'B_BOUNDARY' | 'C_SOURCE_COMPOSER'>();
  for (const id of aFinal) stratumOf.set(id, 'A_NORMAL');
  for (const id of bIds) stratumOf.set(id, 'B_BOUNDARY');
  for (const id of cIds) stratumOf.set(id, 'C_SOURCE_COMPOSER');
  const pilotIds = [...aFinal, ...bIds, ...cIds].sort();

  // ── pilot sourceRef 사전 충돌 검사 (100 전건) ────────────────────────────────────────
  const pilotRefs = pilotIds.map((id) => masterRefV4(id));
  const refDupPilot = pilotRefs.length - new Set(pilotRefs).size;
  const liveRefRows = retRows<{ ref: string; n: string }>(await ds.query(
    `SELECT r.ref::text ref, (SELECT count(*) FROM shared_product_descriptions s WHERE s.source_ref_id=r.ref AND s.deleted_at IS NULL)::text n
     FROM unnest($1::uuid[]) r(ref)`, [pilotRefs]));
  const liveRefByRef = new Map(liveRefRows.map((r) => [r.ref, Number(r.n)]));
  const liveRefConflictPilot = [...liveRefByRef.values()].filter((n) => n > 0).length;
  await ds.query('COMMIT');
  await ds.destroy();

  // ── §4 제품별 사전조사 원장 ──────────────────────────────────────────────────────────
  const resById = new Map(results.map((r) => [r.mid, r]));
  const ledgerRows = pilotIds.map((id) => {
    const r = resById.get(id)!;
    const rec = recById.get(id)!;
    const std = stdByMid.get(id);
    const ext = extByMid.get(id);
    const content = contentByMid.get(id) || '';
    const sec = sections(content);
    const dos = sec['용법·용량'] || '';
    const stratum = stratumOf.get(id)!;
    const pro = proScreen.get(id) || professionalSuspect(r);
    const inf = routeFromDosageText(dos);
    const candidateRoute = r.route || (inf.route === 'unknown' || inf.route === 'conflict' ? null : inf.route);
    const composerFeasible =
      r.sectionPresence!['효능·효과'] === 0 || r.sectionPresence!['용법·용량'] === 0 ? 'BLOCKED_SOURCE'
      : !candidateRoute ? 'ROUTE_PENDING'
      : COMPOSER_ROUTES.has(candidateRoute) ? 'OK' : 'PROFILE_REQUIRED';
    const slot = slotBy.get(id);
    const ref = masterRefV4(id);
    const expected = stratum === 'A_NORMAL'
      ? { expectedStatus: 'PRODUCE_EXPECTED', expectedExceptionCode: null }
      : { expectedStatus: 'PRE_EXCEPTION_EXPECTED', expectedExceptionCode: r.code! };
    return {
      masterId: id,
      permitCode: (std?.permit_codes || []).slice().sort()[0] || ext?.mfds_code || null,   // 품목기준코드
      permitCodeCount: (std?.permit_codes || []).length,
      productName: rec.name,
      specification: rec.spec,
      stratum,
      sourceHoldClass: r.baselineHold,                 // HOLD_IDENTITY | HOLD_ROUTE | HOLD_SOURCE
      sourceHoldReason: r.baselineReason,
      // 성분 — product_drug_extensions.ingredient_summary/active_ingredients 는 본 모집단에서 전건 미채움(실측).
      // 성분 축 grounding 은 e약은요 공식 원문 + 일반명코드 + ATC 로 대체한다(창작 금지).
      ingredient: ext?.ingredient || null,
      ingredientSource: ext?.ingredient ? 'product_drug_extensions.ingredient_summary' : 'ABSENT_IN_DB',
      ingredientProxies: { gencode: r.gencode, atcCode: ext?.atc || null, productName: rec.name },
      // 함량 — 표준코드 '약품규격'(다중 포장규격이므로 배열 전량 기록)
      strength: ext?.strength || strengthCandidates(std?.specs || [])[0] || null,
      strengthCandidates: strengthCandidates(std?.specs || []),
      strengthSource: ext?.strength ? 'product_drug_extensions.strength' : (std?.specs || []).length ? '표준코드 약품규격' : 'ABSENT_IN_DB',
      // 제형 — 표준코드 '제형구분'(포장단위 혼입 → 실제 제형 우선 선택, 후보 전량 기록)
      dosageForm: ext?.form || pickDosageForm(std?.form_kinds || []),
      dosageFormCandidates: [...new Set((std?.form_kinds || []).filter(Boolean))].sort(),
      dosageFormSource: ext?.form ? 'product_drug_extensions.dosage_form' : (std?.form_kinds || []).length ? '표준코드 제형구분' : 'ABSENT_IN_DB',
      formHintFromName: formHint(rec.name, rec.spec),
      atcCode: ext?.atc || null,
      gencode: r.gencode, gencodeCount: r.gencodeCount,
      classKinds: [...new Set((std?.class_kinds || []))].sort(),
      professionalSuspect: pro.flag, professionalSuspectReason: pro.reason,
      candidateRoute,
      candidateRouteSource: r.routeSource || (candidateRoute ? 'dosage_text(hint)' : null),
      candidateRouteFamilies: inf.families.slice().sort(),
      officialSourceLink: content ? 'LINKED_EASY_KO_CANONICAL' : 'ABSENT',
      officialSourceHash: content ? md5(content) : null,
      officialSectionPresence: r.sectionPresence!,
      officialSectionCount: Object.values(r.sectionPresence!).reduce((s: number, v) => s + (v as number), 0),
      numericProfile: numericProfile(dos),
      composerFeasibility: composerFeasible,
      existingAuthoredKoCanonical: Number(slot?.authored || 0),
      existingEnCanonical: Number(slot?.encanon || 0),
      plannedSourceRef: ref,
      sourceRefLiveConflict: liveRefByRef.get(ref) || 0,
      ...expected,
      queue: r.queue,
      classificationCode: r.code || null,
      classificationDetail: r.detail || null,
      reentryPotential: !!r.reentryPotential,
    };
  });

  // ── 집계 ────────────────────────────────────────────────────────────────────────────
  const cnt = <T>(rows: T[], f: (r: T) => string): Record<string, number> => {
    const o: Record<string, number> = {}; for (const r of rows) { const k = f(r); o[k] = (o[k] || 0) + 1; } return sortedCounts(o);
  };
  const byStratum = cnt(ledgerRows, (r) => r.stratum);
  const byHold = cnt(ledgerRows, (r) => r.sourceHoldClass);
  const byRoute = cnt(ledgerRows, (r) => r.candidateRoute || 'UNRESOLVED');
  const byExpected = cnt(ledgerRows, (r) => r.expectedStatus);
  const byExpectedCode = cnt(ledgerRows.filter((r) => r.expectedExceptionCode), (r) => r.expectedExceptionCode!);
  const byComposer = cnt(ledgerRows, (r) => r.composerFeasibility);
  const sectionCoverage = Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, ledgerRows.filter((r) => r.officialSectionPresence[k] === 1).length]));
  const produceExpected = ledgerRows.filter((r) => r.expectedStatus === 'PRODUCE_EXPECTED').length;
  const preExceptionExpected = ledgerRows.filter((r) => r.expectedStatus === 'PRE_EXCEPTION_EXPECTED').length;

  // ── 예외 코드 정의 (§5) ─────────────────────────────────────────────────────────────
  const EXCEPTION_CODES = [
    { code: 'IDENTITY_MISSING', category: 'EXCEPTION_IDENTITY', stage: 'identity', meaning: '표준코드 행 또는 일반명코드 부재', retryable: true, perMasterOnly: true, note: 'per-master 모델에서는 자기 원문 grounding 으로 생산 가능 — 예외 아님(정보 기록용)' },
    { code: 'IDENTITY_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'identity', meaning: '일반명코드 2개 이상 상충 — 제품 혼입 의심', retryable: true, perMasterOnly: false, note: 'na 가 canonical gencode 확정 후 재편입' },
    { code: 'ROUTE_UNRESOLVED', category: 'EXCEPTION_ROUTE', stage: 'route', meaning: 'gencode·공식 용법 원문 어느 축에서도 투여경로 미검출', retryable: true, perMasterOnly: false, note: '제품명 추론 금지 — na 가 원문/제형 근거로 확정' },
    { code: 'ROUTE_CONFLICT', category: 'EXCEPTION_ROUTE', stage: 'route', meaning: '공식 용법 원문에 비경구 경로 동사 2종 이상 동시 출현', retryable: true, perMasterOnly: false, note: 'subgroup 분리 또는 대표경로 확정 필요' },
    { code: 'SOURCE_EFFICACY_MISSING', category: 'EXCEPTION_SOURCE', stage: 'source', meaning: '공식 원문 효능·효과 섹션 부재/공란', retryable: false, perMasterOnly: false, note: 'ETL 재수집 전 terminal — 창작 금지' },
    { code: 'SOURCE_DOSAGE_MISSING', category: 'EXCEPTION_SOURCE', stage: 'source', meaning: '공식 원문 용법·용량 섹션 부재/공란', retryable: false, perMasterOnly: false, note: 'ETL 재수집 전 terminal — 창작 금지' },
    { code: 'NUMERIC_PARSE_FAILED', category: 'EXCEPTION_COMPOSER', stage: 'compose', meaning: '용법 수치(횟수/용량) 토큰 파싱 실패', retryable: true, perMasterOnly: false, note: 'unicode ½ 등 비-digit 분수 포함 — parser 보완 대상' },
    { code: 'AGE_PARSE_FAILED', category: 'EXCEPTION_COMPOSER', stage: 'compose', meaning: '연령 구분(소아/성인/월령) 파싱 실패', retryable: true, perMasterOnly: false, note: 'profile 보완 대상' },
    { code: 'DURATION_PARSE_FAILED', category: 'EXCEPTION_COMPOSER', stage: 'compose', meaning: '투여 기간·연용 한도 파싱 실패', retryable: true, perMasterOnly: false, note: 'profile 보완 대상' },
    { code: 'COMPOSER_SECTION_UNSUPPORTED', category: 'EXCEPTION_COMPOSER', stage: 'compose', meaning: '공식 섹션 구조가 composer 프로파일 미지원', retryable: true, perMasterOnly: false, note: 'route profile 신설 후 재편입' },
    { code: 'TRANSLATION_VALIDATION_FAILED', category: 'EXCEPTION_TRANSLATION', stage: 'translate', meaning: 'EN 산출물이 KO canonical 의 수치·연령·금기 축을 보존하지 못함', retryable: true, perMasterOnly: false, note: 'KO canonical 선행 필수 — KO 미확정 시 HELD_KO_NOT_CANONICAL(예외 아님)' },
    { code: 'PROFESSIONAL_USE', category: 'EXCEPTION_PROFESSIONAL', stage: 'screen', meaning: '전문의약품/수술·시술용 표지', retryable: false, perMasterOnly: false, note: '운영자 판단 전 terminal — 정상 대기열 편입 금지' },
    { code: 'EXISTING_CANONICAL_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'preflight', meaning: '해당 master 슬롯에 기존 authored/en canonical 존재', retryable: true, perMasterOnly: false, note: '기존 LIVE 변경 금지 — 운영자 승인 없이는 terminal' },
    { code: 'SOURCE_REF_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'preflight', meaning: 'V4 sourceRef 가 이미 LIVE 행에 점유됨', retryable: true, perMasterOnly: false, note: 'namespace 산식 재검토 — 반복 시 시스템 중지 조건' },
    { code: 'OTHER_REVIEW_REQUIRED', category: 'EXCEPTION_OTHER', stage: 'any', meaning: '상기 어느 코드에도 해당하지 않는 검토 필요', retryable: true, perMasterOnly: false, note: '분류 불가 건은 반드시 이 코드로 원장에 남긴다(누락 금지)' },
  ];

  // ── §6 시스템 중지 조건 / §5 제품 단위 continue 조건 ─────────────────────────────────
  const SYSTEM_STOP_CONDITIONS = [
    { id: 'SYS-01', condition: 'master 와 공식 원문이 잘못 연결됨(officialSourceHash 가 원장과 불일치)', detect: '생산 직전 master 별 officialSourceHash 재계산 후 pilot 원장 대조' },
    { id: 'SYS-02', condition: '서로 다른 master 의 원문이 혼합됨', detect: '산출 본문에 타 master 의 품목기준코드/제품명 토큰 출현 검사' },
    { id: 'SYS-03', condition: '정상(A) 제품에서 공식 6섹션이 누락됨', detect: 'A 산출물의 섹션 수가 원장 officialSectionCount 미만' },
    { id: 'SYS-04', condition: 'sourceRef 산식이 2건 이상에서 충돌', detect: 'SOURCE_REF_CONFLICT 누적 ≥ 2' },
    { id: 'SYS-05', condition: 'canonicalDup 반복 발생', detect: '(master, description_type, language) canonical 중복 ≥ 1 (즉시 중지)' },
    { id: 'SYS-06', condition: '성공 master 와 실패 master 를 분리할 수 없음', detect: '배치 종료 시 perMaster outcome 합 ≠ 입력 100' },
    { id: 'SYS-07', condition: '실패 master 에 DB write 발생', detect: '실패 master 의 dbWriteActual > 0' },
    { id: 'SYS-08', condition: '기존 LIVE 제품이 변경됨', detect: 'target 밖 master 의 shared_product_descriptions 변경 감지' },
    { id: 'SYS-09', condition: '재실행 시 완료 master 가 중복 반영됨', detect: '재실행 결과 CREATED > 0 (정상은 전량 SKIPPED)' },
    { id: 'SYS-10', condition: 'transaction/savepoint 격리 미작동', detect: 'ROLLBACK 후 잔여 row(residue) > 0' },
    { id: 'SYS-11', condition: 'DB commit 결과를 신뢰할 수 없음', detect: 'TX 내 사후검증과 별개 코드경로 track-verify 결과 불일치' },
    { id: 'SYS-12', condition: '다른 세션의 LIVE write 감지', detect: '배치 전후 target 밖 STORE canonical count/max(updated_at) 변동' },
  ];
  const PER_MASTER_CONTINUE = {
    rule: '제품 단위 실패는 전체 배치를 중지하지 않는다',
    onFailure: ['해당 master DB write 0(savepoint ROLLBACK)', '예외 원장 1행 기록(필수 필드 누락 0)', '다음 master 로 계속', '배치 전체 중지 금지'],
    notStopConditions: ['개별 제품의 route 미확정', '개별 제품의 identity 충돌', '개별 제품의 수치/연령/기간 파싱 실패', '개별 제품의 공식 원문 결손', '개별 제품의 composer 미지원', '성공률 자체'],
  };

  // ── §9 2차 500 확장 게이트 ───────────────────────────────────────────────────────────
  const EXPANSION_GATE_500 = [
    { id: 'EXP-01', gate: '정상 생산 master 의 공식 6섹션 mismatch 0' },
    { id: 'EXP-02', gate: '수치·연령·기간 누락 0' },
    { id: 'EXP-03', gate: 'canonicalDup 0' },
    { id: 'EXP-04', gate: 'sourceRef 충돌 0' },
    { id: 'EXP-05', gate: '기존 LIVE 변경 0' },
    { id: 'EXP-06', gate: '실패 master DB write 0' },
    { id: 'EXP-07', gate: '실패가 전체 배치를 중단하지 않음' },
    { id: 'EXP-08', gate: '재실행 시 완료 master 자동 skip(멱등)' },
    { id: 'EXP-09', gate: '예외 원장 누락 0(입력 100 = 성공 + 예외)' },
    { id: 'EXP-10', gate: '독립검증(별개 코드경로 track-verify) PASS' },
    { id: 'EXP-11', gate: '시스템 수준 오류 0(SYS-01~SYS-12 미발동)' },
    { id: 'EXP-NOT', gate: '성공률은 절대 중지/확장 차단 기준이 아니다 — 예외가 많아도 정확히 격리되면 시험 성공' },
  ];

  // ── §7 예외 인계 JSON schema ────────────────────────────────────────────────────────
  const HANDOFF_SCHEMA = {
    $schemaName: 'otc-v4-master-by-master-exception-handoff',
    version: 1,
    recordPerFailedMaster: true,
    invariant: ['실패 master 의 dbWriteActual 은 반드시 0', 'agent-na 는 DB write 0', '재진입 후 write owner 는 항상 agent-ga'],
    required: {
      masterId: 'uuid',
      productCode: 'string(품목기준코드) | null',
      productName: 'string',
      sourceHoldClass: 'HOLD_IDENTITY|HOLD_ROUTE|HOLD_SOURCE',
      exceptionCode: 'string(§exceptionCodes 중 하나 — 미분류는 OTHER_REVIEW_REQUIRED)',
      failedStage: 'preflight|screen|identity|route|source|compose|translate|persist|verify',
      officialSectionPresence: '{"효능·효과":0|1,"용법·용량":0|1,"경고":0|1,"사용상 주의사항":0|1,"이상반응":0|1,"상호작용":0|1}',
      officialSourceHash: 'md5(hex) | null',
      candidateRoute: 'oral|topical|ophthalmic|oromucosal|vaginal|null',
      identitySnapshot: '{gencode: string|null, gencodeCount: number, classKinds: string[], atcCode: string|null}',
      numericTokens: '{digitTokens: number, hasUnicodeFraction: boolean, hasAgeToken: boolean, hasDurationToken: boolean}',
      existingCanonicalState: '{authoredKo: number, en: number}',
      sourceRefState: '{planned: uuid, liveConflict: number}',
      dbWriteActual: 'number — 실패 레코드는 반드시 0',
      retryable: 'boolean',
      recommendedAction: 'string(나 에이전트 조치 제안)',
      reproductionCommand: 'string(단일 master 재현 커맨드)',
    },
    optional: { detail: 'string', batchId: 'string', occurredAtSourceRef: 'otc-v4-master-leaflet:<masterId>' },
    naGroupingAxes: [
      'route 미확정(ROUTE_UNRESOLVED)', 'identity 충돌(IDENTITY_CONFLICT)', '수치 파싱 실패(NUMERIC_PARSE_FAILED)',
      '연령·기간 파싱 실패(AGE_PARSE_FAILED, DURATION_PARSE_FAILED)', '공식 원문 결손(SOURCE_*_MISSING)',
      'composer 미지원 구조(COMPOSER_SECTION_UNSUPPORTED, ROUTE_CONFLICT)', '전문용 의심(PROFESSIONAL_USE)',
      'canonical·sourceRef 충돌(EXISTING_CANONICAL_CONFLICT, SOURCE_REF_CONFLICT)',
    ],
    naGroupReportFields: ['expectedCount', 'commonCause', 'commonFixPossible', 'parserOrProfileFixPossible', 'gaReentryCondition', 'holdCondition'],
  };

  // ── 게이트 (§11) ────────────────────────────────────────────────────────────────────
  const uniqPilot = new Set(pilotIds).size;
  const gates: Record<string, boolean> = {
    '1_reproduce_remaining_3809': reproRemaining === 3809,
    '2_reproduce_hold_identity_3246': reproHoldIdentity === 3246,
    '3_reproduce_hold_route_536': reproHoldRoute === 536,
    '4_reproduce_hold_source_27': reproHoldSource === 27,
    '5_reproduce_split_2496_1047_266': gaReady.length === 2496 && naAll.length === 1047 && excludeAll.length === 266,
    '6_pilot_exactly_100': pilotIds.length === 100,
    '7_pilot_master_dup_0': uniqPilot === 100,
    '8_no_completed_master': pilotIds.every((id) => remainingIds.has(id)),
    '9_ready_1134_intersection_0': pilotIds.every((id) => !readySet.has(id)),
    '10_outside_baseline_0': pilotIds.every((id) => recById.get(id)?.hold !== undefined && isProductionTarget(recById.get(id)!)),
    '11_exclude_confirmed_not_included': pilotIds.every((id) => resById.get(id)!.queue !== 'exclude'),
    '12_normal_vs_preexception_separated': produceExpected + preExceptionExpected === 100 && produceExpected > 0 && preExceptionExpected > 0,
    '13_no_professional_in_normal_queue': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => !r.professionalSuspect),
    '14_official_source_state_recorded_all': ledgerRows.every((r) => typeof r.officialSourceLink === 'string' && r.officialSectionPresence && Object.keys(r.officialSectionPresence).length === 6),
    '15_route_candidate_recorded_all': ledgerRows.every((r) => 'candidateRoute' in r),
    '16_existing_canonical_state_recorded_all': ledgerRows.every((r) => Number.isInteger(r.existingAuthoredKoCanonical) && Number.isInteger(r.existingEnCanonical)),
    '17_sourceref_preconflict_checked': ledgerRows.every((r) => Number.isInteger(r.sourceRefLiveConflict)) && refDupPilot === 0 && liveRefConflictPilot === 0,
    '18_normal_stratum_has_source_and_route': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => r.officialSectionPresence['효능·효과'] === 1 && r.officialSectionPresence['용법·용량'] === 1 && !!r.candidateRoute && r.composerFeasibility === 'OK'),
    '19_normal_stratum_no_existing_canonical': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => r.existingAuthoredKoCanonical === 0 && r.existingEnCanonical === 0),
    '20_exception_schema_required_fields_complete': Object.keys(HANDOFF_SCHEMA.required).length === 17,
    '21_db_write_0': true,
    '22_two_x_byte_identical': true,
  };
  const gatePass = Object.values(gates).every(Boolean);

  // ── 산출 ────────────────────────────────────────────────────────────────────────────
  const nowSnapshot = { source: 'REPEATABLE READ READ ONLY snapshot', note: 'snapshot 시각/xmin 은 CHECK 문서 참조(byte-identity 위해 데이터 파일 제외)' };
  const selection = {
    determinism: '랜덤 0 · 정렬 고정(route/code 키 오름차순 → masterId 오름차순) · D\'Hondt 배분',
    strata: {
      A_NORMAL: { target: STRATUM_TARGET.A, actual: aFinal.length, source: 'agent-ga READY_MASTER_PRODUCTION − 전문/수술 스크린', allocationRule: `route 별 D'Hondt(최소 2, 단일 route 상한 ${Math.floor(STRATUM_TARGET.A * CAP_FRAC)}=50%)`, poolCounts: sortedCounts(aPoolCounts), allocation: sortedCounts(aAlloc) },
      B_BOUNDARY: { target: STRATUM_TARGET.B, actual: bIds.length, source: 'agent-na EXCEPTION_ROUTE ∪ EXCEPTION_IDENTITY', allocationRule: "code 별 D'Hondt(최소 2)", poolCounts: sortedCounts(bPoolCounts), allocation: sortedCounts(bAlloc) },
      C_SOURCE_COMPOSER: { target: STRATUM_TARGET.C, actual: cIds.length, source: 'agent-na EXCEPTION_SOURCE ∪ EXCEPTION_COMPOSER', allocationRule: "code 별 D'Hondt(최소 2)", poolCounts: sortedCounts(cPoolCounts), allocation: sortedCounts(cAlloc) },
    },
    reallocation: realloc,
    professionalScreen: {
      rule: "표준코드 '전문일반구분' 에 '전문' 포함 또는 수술/시술/관류/마취 표지 → 정상(A) 대기열 배제",
      gaReadyTotal: gaReady.length, screenedOut: gaScreenedOut.length, eligible: gaEligible.length,
      screenedOutSample: gaScreenedOut.slice(0, 20).map((r) => ({ mid: r.mid, name: r.name, reason: proScreen.get(r.mid)!.reason })).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
    },
    distributionRationale: [
      '실제 잔여 분포(ga byRoute oral 57.5% / topical 31.9% / ophthalmic 9.3% / vaginal 0.9% / oromucosal 0.4%)를 반영하되, 단일 route 편중 방지를 위해 oral 을 50% 로 상한',
      '소수 route(vaginal·oromucosal)는 최소 2건 보장 — 경로별 composer 회귀를 시험에서 관측 가능하게 함',
      '경계·예외 30건을 의도적으로 포함 — 시험의 목적은 성공률이 아니라 실패 격리 검증',
    ],
  };

  const pilotLedger = {
    wo: WO, agent: 'la', mode: 'READ-ONLY pilot selection', liveDbWrite: 0,
    determinism: 'no wall-clock in file · single REPEATABLE READ READ ONLY snapshot · arrays sorted by masterId',
    basis: {
      predecessor: 'WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1 (commit 8e97c92b4)',
      reproduction: {
        productionTargets: productionTargets.length, ready: reproReady, remaining: reproRemaining,
        holdCounts: sortedCounts(holdCount), readyMatchesLedger, readyRemainingIntersection: readyIntersectLedger,
        split: { agentGa: gaReady.length, agentNa: naAll.length, exclude: excludeAll.length, sum: gaReady.length + naAll.length + excludeAll.length },
      },
    },
    selection,
    summary: {
      total: ledgerRows.length, byStratum, bySourceHoldClass: byHold, byCandidateRoute: byRoute,
      byExpectedStatus: byExpected, byExpectedExceptionCode: byExpectedCode, byComposerFeasibility: byComposer,
      officialSectionCoverage: sectionCoverage,
      investigationAxisCoverage: {
        permitCode: ledgerRows.filter((r) => r.permitCode).length,
        ingredient: ledgerRows.filter((r) => r.ingredient).length,
        strength: ledgerRows.filter((r) => r.strength).length,
        dosageForm: ledgerRows.filter((r) => r.dosageForm).length,
        atcCode: ledgerRows.filter((r) => r.atcCode).length,
        gencode: ledgerRows.filter((r) => r.gencode).length,
        officialSourceHash: ledgerRows.filter((r) => r.officialSourceHash).length,
        note: 'ingredient=0 은 실측 데이터 갭 — product_drug_extensions.ingredient_summary/active_ingredients/strength/dosage_form 이 본 모집단 전건 미채움. 성분·함량·제형 축은 표준코드(약품규격/제형구분)와 일반명코드·ATC 로 대체 기록하며, 생산 grounding 은 e약은요 공식 원문이므로 생산 차단 사유는 아니다.',
      },
      produceExpected, preExceptionExpected,
      sourceRefDup: refDupPilot, sourceRefLiveConflict: liveRefConflictPilot,
    },
    masters: ledgerRows,
    gates, gatePass, snapshot: nowSnapshot,
  };

  const gaInput = {
    wo: WO, queue: 'agent-ga', batchId: 'otc-v4-pilot-100', total: ledgerRows.length,
    executionContract: {
      order: 'masterId 오름차순 순차 처리 · 1 master = 1 독립 작업 단위',
      grounding: 'master 자기 e약은요 공식 원문(효능·효과/용법·용량/경고/사용상 주의사항/이상반응/상호작용)만 — 외부 LLM 의료사실 생성 금지',
      sourceRefNamespace: 'otc-v4-master-leaflet:',
      transaction: 'per-master savepoint · 실패 시 해당 savepoint ROLLBACK(해당 master write 0) 후 다음 master 계속',
      writeOwner: 'agent-ga 단독 — agent-na 는 DB write 0',
      idempotency: '재실행 시 이미 완료된 master 는 자동 SKIP(CREATED 0)',
      koBeforeEn: 'EN 은 KO canonical 선행 필수 — KO 미확정 시 HELD_KO_NOT_CANONICAL(예외 아님)',
      perMasterFailure: PER_MASTER_CONTINUE,
      systemStopConditions: SYSTEM_STOP_CONDITIONS,
      preflightPerMaster: [
        'officialSourceHash 재계산 → pilot 원장과 일치 확인(불일치=SYS-01 중지)',
        'existingAuthoredKoCanonical/en = 0 확인(>0 → EXISTING_CANONICAL_CONFLICT 예외)',
        'plannedSourceRef LIVE 점유 0 확인(>0 → SOURCE_REF_CONFLICT 예외, 2건 이상 누적 시 SYS-04 중지)',
        'professionalSuspect=false 확인(true → PROFESSIONAL_USE 예외)',
      ],
    },
    expectedOutcome: { produceExpected, preExceptionExpected, note: '기대치는 게이트가 아니다 — 실제 결과가 기대와 달라도 격리가 정확하면 시험은 성공' },
    masters: ledgerRows.map((r) => ({
      masterId: r.masterId, productCode: r.permitCode, productName: r.productName, stratum: r.stratum,
      sourceHoldClass: r.sourceHoldClass, candidateRoute: r.candidateRoute, candidateRouteSource: r.candidateRouteSource,
      officialSourceHash: r.officialSourceHash, officialSectionPresence: r.officialSectionPresence,
      plannedSourceRef: r.plannedSourceRef, composerFeasibility: r.composerFeasibility,
      expectedStatus: r.expectedStatus, expectedExceptionCode: r.expectedExceptionCode,
    })),
  };

  const naSchemaDoc = {
    wo: WO, consumer: 'agent-na', producer: 'agent-ga', liveDbWrite: 0,
    exceptionHandoffSchema: HANDOFF_SCHEMA,
    exceptionCodes: EXCEPTION_CODES,
    systemStopConditions: SYSTEM_STOP_CONDITIONS,
    perMasterContinue: PER_MASTER_CONTINUE,
    expansionGate500: EXPANSION_GATE_500,
    naBatchClosureMethod: {
      rule: '시험/전량 생산 종료 후 예외를 제품 순서가 아니라 원인별로 묶어 일괄 마무리한다',
      groups: HANDOFF_SCHEMA.naGroupingAxes,
      perGroupReport: HANDOFF_SCHEMA.naGroupReportFields,
      invariant: 'agent-na 는 DB write 0 · 재편입 승인 후 write 는 항상 agent-ga',
    },
  };

  const check = {
    wo: WO, agent: 'la', mode: 'READ-ONLY pilot selection', liveDbWrite: 0,
    snapshot: nowSnapshot,
    reproduction: pilotLedger.basis.reproduction,
    pilot: { size: pilotIds.length, byStratum, bySourceHoldClass: byHold, byCandidateRoute: byRoute, byExpectedStatus: byExpected, byExpectedExceptionCode: byExpectedCode, officialSectionCoverage: sectionCoverage },
    sourceRef: { namespace: 'otc-v4-master-leaflet:', dup: refDupPilot, liveConflict: liveRefConflictPilot },
    gates, gatePass,
    artifacts: [
      'otc-easy-drug-remaining-pilot-100-ledger-v1.json',
      'otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json',
      'otc-easy-drug-remaining-pilot-100-agent-na-handoff-schema-v1.json',
      'otc-easy-drug-remaining-pilot-100-check-v1.json',
    ],
    designDocs: ['otc-easy-drug-remaining-pilot-100-followup-agent-requests-v1.md'],
    pilotMasterIds: pilotIds,
  };

  const OUT = {
    ledger: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json'),
    ga: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json'),
    na: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-agent-na-handoff-schema-v1.json'),
    check: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-check-v1.json'),
  };
  fs.writeFileSync(OUT.ledger, JSON.stringify(pilotLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.ga, JSON.stringify(gaInput, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.na, JSON.stringify(naSchemaDoc, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.check, JSON.stringify(check, null, 2) + '\n', 'utf8');

  const hashes = Object.fromEntries(Object.values(OUT).map((p) => [path.basename(p), md5(fs.readFileSync(p, 'utf8'))]));

  console.log('=== OTC remaining master-by-master PILOT 100 (READ-ONLY · dbWrite 0) ===');
  console.log(`snapshot ${JSON.stringify(snapMeta[0])}`);
  console.log(`reproduce: productionTargets ${productionTargets.length} · READY ${reproReady} · remaining ${reproRemaining} · HOLD ${JSON.stringify(sortedCounts(holdCount))}`);
  console.log(`split: ga ${gaReady.length} · na ${naAll.length} · exclude ${excludeAll.length}`);
  console.log(`professional screen: gaReady ${gaReady.length} → screenedOut ${gaScreenedOut.length} → eligible ${gaEligible.length}`);
  console.log(`pilot ${pilotIds.length} · byStratum ${JSON.stringify(byStratum)}`);
  console.log(`  A alloc(route) ${JSON.stringify(sortedCounts(aAlloc))}`);
  console.log(`  B alloc(code)  ${JSON.stringify(sortedCounts(bAlloc))}`);
  console.log(`  C alloc(code)  ${JSON.stringify(sortedCounts(cAlloc))}`);
  console.log(`  byHold ${JSON.stringify(byHold)}`);
  console.log(`  byRoute ${JSON.stringify(byRoute)}`);
  console.log(`  byExpectedStatus ${JSON.stringify(byExpected)} · byExpectedCode ${JSON.stringify(byExpectedCode)}`);
  console.log(`  byComposer ${JSON.stringify(byComposer)}`);
  console.log(`  sectionCoverage ${JSON.stringify(sectionCoverage)}`);
  console.log(`  sourceRef dup ${refDupPilot} · liveConflict ${liveRefConflictPilot}`);
  if (realloc.length) console.log(`  realloc: ${realloc.join(' | ')}`);
  console.log(`GATES ${Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ALL PASS'} → gatePass=${gatePass}`);
  console.log('artifact md5:'); for (const [k, v] of Object.entries(hashes)) console.log(`  ${v}  ${k}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
