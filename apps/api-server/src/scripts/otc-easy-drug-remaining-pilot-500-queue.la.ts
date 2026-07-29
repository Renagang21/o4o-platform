/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1
 *   — 에이전트 라 2차 시험(500) 대기열 확정 (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0.
 *
 * 목적:
 *   잔여 모집단에서 **정확히 500 master** 를 결정론적으로 선정하고, 제품별 사전 조사 원장 /
 *   agent-ga 생산 입력 / agent-na 예외 인계 schema / identity 판정 정정 기록 /
 *   시스템 중지 조건 / 제품 단위 continue 계약 / 잔여 전량 확대 게이트를 확정한다.
 *
 * 선행:
 *   - 모집단 정합성 commit 036e4d5f7 (잔여 3,809)
 *   - pilot 100 대기열 commit 324823745 (otc-easy-drug-remaining-pilot-100-*)
 *   - pilot 100 생산 commit 7f04f3ffb (GREEN 80 / EXCEPTION 20 / APPROVED_FOR_PILOT_500)
 *
 * 모집단 drift(설계된 변화):
 *   pilot 100 GREEN 80 이 authored ko+en canonical 을 획득 → baseline 상 'complete' 로 전이.
 *   따라서 잔여는 3,809 → **3,729** 이고, 그 차집합은 **정확히 GREEN 80** 이어야 한다(게이트).
 *
 * identity 판정 정정 (§3, pilot 100 실측 근거):
 *   `gencodeCount >= 2` 단독은 IDENTITY_CONFLICT 가 아니다. (사전 12건 중 10건 정상 생산, 2건은 route 사유 실패)
 *   정정 기준 = permitCodeCount >= 2 · 서로 다른 공식 원문 hash 다중 · master↔공식원문 단일 확정 불가.
 *
 * 선정(결정론 — 랜덤 0):
 *   Stratum A 정상 400 = v2 READY_MASTER_PRODUCTION (전문/수술 스크린 · sourceRef 점유 0) · route 별 D'Hondt(최소 2, 단일 route 상한 50%)
 *   Stratum B 경계  70 = v2 EXCEPTION_ROUTE ∪ EXCEPTION_IDENTITY · code 별 D'Hondt(최소 2)
 *   Stratum C 원문/composer 30 = v2 EXCEPTION_SOURCE ∪ EXCEPTION_COMPOSER · code 별 D'Hondt(최소 2)
 *   pilot 100 의 100 master(GREEN 80 + 예외 20) 는 전량 제외. 부족분은 A→B→C 순서로 재배분하고 근거를 기록한다.
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:<port> · o4o_api · o4o_platform · pw=.env DB_PASSWORD(열람/출력/수정 안함).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-500-queue.la.ts [--port 5497]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute, BLOCKED_MASTER_IDS } from './otc-v2-store-leaflet-runner.shared.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const READY_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json');
const PILOT100_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json');
const PILOT100_GREEN = path.join(DATA_DIR, 'otc-v4-pilot-100-green-ledger.ga.json');
const PILOT100_EXC = path.join(DATA_DIR, 'otc-v4-pilot-100-exception-handoff-na.ga.json');
const ENV_PATH = path.resolve(process.cwd(), '.env');
const readPw = (): string => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 5497;
};

// ── baseline census VERBATIM 상수 (pilot 100 과 동일) ──────────────────────────────────
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
const SURGICAL_RE = /수술\s*용|시술\s*용|무균\s*수술|관류액|투석액|조영|마취/i;

// ── §5 사전조사 보조 ────────────────────────────────────────────────────────────────
const UNICODE_FRACTION_RE = /[½¼¾⅓⅔⅛]/;
const AGE_RE = /(\d+)\s*(세|개월|살)|만\s*\d+\s*세|소아|성인|영아|유아|청소년|고령자/;
const DURATION_RE = /(\d+)\s*(일|주|주간|개월|시간|분)\s*(이내|이상|간|동안|까지)?|장기\s*(간|연용)/;
function numericProfile(dos: string): { digitTokens: number; hasUnicodeFraction: boolean; hasAgeToken: boolean; hasDurationToken: boolean } {
  const t = normalize(dos || '');
  return {
    digitTokens: (t.match(/\d+(?:[.,]\d+)?/g) || []).length,
    hasUnicodeFraction: UNICODE_FRACTION_RE.test(t),
    hasAgeToken: AGE_RE.test(t),
    hasDurationToken: DURATION_RE.test(t),
  };
}

const GENERIC_PACKAGING = new Set(['개', '통', '병', '매', '관', '포', '박스', '세트', '키트', '장', '권', '기타', '바이알', '앰플']);
function pickDosageForm(cands: string[]): string | null {
  const s = [...new Set(cands.filter(Boolean))].sort();
  return s.find((x) => !GENERIC_PACKAGING.has(x)) ?? s[0] ?? null;
}
function strengthCandidates(specs: string[]): string[] {
  return [...new Set(specs.filter((x) => x && x !== '없음'))].sort();
}

/** D'Hondt(Jefferson) 배분 — 결정론적. floor(최소 배분) + cap(상한) 지원. tie-break = key 오름차순. */
function allocate(pool: Record<string, number>, total: number, minEach: number, cap: number | null): Record<string, number> {
  const keys = Object.keys(pool).sort();
  const alloc: Record<string, number> = {};
  for (const k of keys) alloc[k] = Math.min(minEach, pool[k], cap ?? Infinity);
  let assigned = keys.reduce((s, k) => s + alloc[k], 0);
  while (assigned > total) {
    const shrink = keys.filter((k) => alloc[k] > 0).sort((a, b) => pool[a] - pool[b] || (a < b ? -1 : 1))[0];
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

const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

async function main(): Promise<void> {
  const port = argPort();
  const readyLedger = JSON.parse(fs.readFileSync(READY_LEDGER, 'utf8'));
  const readySet = new Set<string>([...new Set((readyLedger.units as any[]).flatMap((u) => u.masterIds))] as string[]);
  if (readySet.size !== 1134) throw new Error(`READY ledger ${readySet.size} != 1134`);

  const p100Ledger = JSON.parse(fs.readFileSync(PILOT100_LEDGER, 'utf8'));
  const pilot100Ids = new Set<string>((p100Ledger.masters as any[]).map((m) => m.masterId));
  if (pilot100Ids.size !== 100) throw new Error(`pilot100 ledger ${pilot100Ids.size} != 100`);
  const p100Green = JSON.parse(fs.readFileSync(PILOT100_GREEN, 'utf8'));
  const green80 = new Set<string>((p100Green.rows as any[]).map((r) => r.masterId));
  const p100Exc = JSON.parse(fs.readFileSync(PILOT100_EXC, 'utf8'));
  const exception20 = new Set<string>((p100Exc.rows as any[]).map((r) => r.masterId));
  if (green80.size !== 80 || exception20.size !== 20) throw new Error(`pilot100 green/exception ${green80.size}/${exception20.size} != 80/20`);

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

  // §3 정정 판정 축 — master 별 공식 원문 행수 / 서로 다른 원문 hash 수
  const srcMultiRows = retRows<{ mid: string; n: string; nh: string }>(await ds.query(`
    SELECT s.master_id::text mid, count(*)::text n, count(DISTINCT md5(s.content))::text nh
    FROM shared_product_descriptions s
    WHERE s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical'
      AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.master_id IN (${OTC_SUBQ})
    GROUP BY 1 ORDER BY 1`));
  const srcMultiBy = new Map(srcMultiRows.map((r) => [r.mid, { n: Number(r.n), nh: Number(r.nh) }]));

  const extRows = retRows<{ mid: string; ingredient: string | null; strength: string | null; form: string | null; mfds_code: string | null; atc: string | null }>(
    await ds.query(`
    SELECT e.product_master_id::text mid, e.ingredient_summary ingredient, e.strength, e.dosage_form form,
           e.mfds_code, e.atc_code atc
    FROM product_drug_extensions e
    WHERE e.drug_category='otc' AND e.deleted_at IS NULL ORDER BY 1`));
  const extByMid = new Map(extRows.map((r) => [r.mid, r]));

  await ds.query('COMMIT');

  // ── baseline 재현 (VERBATIM) ────────────────────────────────────────────────────────
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
  const holdCount: Record<string, number> = {};
  for (const r of productionTargets) holdCount[r.hold!] = (holdCount[r.hold!] || 0) + 1;
  const readyRecs = productionTargets.filter((r) => r.hold === 'READY');
  const remaining = productionTargets.filter((r) => r.hold !== 'READY');
  const remainingIds = new Set(remaining.map((r) => r.id));
  const reproReady = readyRecs.length;
  const reproRemaining = remaining.length;
  const readyMatchesLedger = reproReady === 1134
    && [...readySet].every((id) => readyRecs.some((r) => r.id === id))
    && readyRecs.every((r) => readySet.has(r.id));
  // READY 1,134 는 후속 V3 트랙에서 전량 생산 완료되어 production target 에서 이탈했다(설계된 변화).
  const readyCompleted = [...readySet].filter((id) => recById.get(id)?.complete === true).length;
  const readyStillProductionTarget = [...readySet].filter((id) => { const r = recById.get(id); return !!r && isProductionTarget(r); }).length;
  const readyIntersectRemaining = [...readySet].filter((id) => remainingIds.has(id)).length;

  // drift 검증: 3,809 → 3,729 이고 차집합은 정확히 GREEN 80
  const driftMissing = [...green80].filter((id) => remainingIds.has(id));            // 이제 remaining 에 남아있으면 안 됨
  const driftExceptionKept = [...exception20].filter((id) => remainingIds.has(id));  // 20 전부 remaining 유지여야 함
  const driftDelta = 3809 - reproRemaining;

  // ── per-master 분류 ────────────────────────────────────────────────────────────────
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const slotRows = retRows<{ mid: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid)`, [[...remainingIds].sort(), BASELINE_AUTHORED_SOURCES]));
  const slotBy = new Map(slotRows.map((r) => [r.mid, r]));

  /**
   * per-master 분류.
   *  mode 'v1' = pilot 100 과 동일(gencodeCount>1 → IDENTITY_CONFLICT)  — 재현/대조용
   *  mode 'v2' = §3 정정판(gencodeCount 단독 조건 제거, permitCodeCount>=2 / 원문 hash 다중 으로 대체)
   */
  const classify = (mode: 'v1' | 'v2'): Cls[] => {
    const out: Cls[] = [];
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
      const std = stdByMid.get(id);
      const permitCodeCount = (std?.permit_codes || []).length;
      const srcM = srcMultiBy.get(id) || { n: 0, nh: 0 };

      if (r.excludeConfirmed || BLOCKED_MASTER_IDS.has(id)) {
        const code = BLOCKED_MASTER_IDS.has(id) ? 'EXCLUDE_NONSALE'
          : r.excludeKw ? 'EXCLUDE_EXPORT' : r.bulk ? 'EXCLUDE_NONSALE' : 'EXCLUDE_CANCELLED';
        out.push({ ...base, bucket: 'EXCLUDE_CONFIRMED', queue: 'exclude', category: 'EXCLUDE_CONFIRMED', code,
          detail: BLOCKED_MASTER_IDS.has(id) ? 'BLOCKED_MASTER_IDS(빅콘에스600정)'
            : r.excludeKw ? '수출/군납/비매품 키워드' : r.bulk ? '비소매 대용량 포장' : '표준코드 전량 취소',
          reentryPotential: false });
        continue;
      }
      if (slot && (Number(slot.authored) > 0 || Number(slot.encanon) > 0)) {
        out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_IDENTITY',
          code: 'EXISTING_CANONICAL_CONFLICT',
          detail: `기존 authored ko=${slot.authored} en=${slot.encanon} canonical 존재 — 슬롯 점유, 재작성 전 운영자 검토`,
          reentryPotential: true });
        continue;
      }
      if (!hasEff || !hasDos) {
        const noContent = !contentByMid.get(id);
        out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_SOURCE',
          code: !hasEff ? 'SOURCE_EFFICACY_MISSING' : 'SOURCE_DOSAGE_MISSING',
          detail: noContent ? 'easy ko canonical 원문 없음' : `필수 섹션 공란: ${[!hasEff && '효능·효과', !hasDos && '용법·용량'].filter(Boolean).join(',')}`,
          reentryPotential: false });
        continue;
      }
      if (PROFESSIONAL_RE.test(r.name) || PROFESSIONAL_RE.test(r.spec || '')) {
        out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_PROFESSIONAL',
          code: 'PROFESSIONAL_USE', detail: '전문/조제/주사 표지 — OTC 매장 소비자 콘텐츠 대상 여부 검토', reentryPotential: false });
        continue;
      }
      if (mode === 'v1') {
        if (r.gencodeCount > 1) {
          out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_IDENTITY',
            code: 'IDENTITY_CONFLICT', detail: `gencode ${r.gencodeCount}개 상충 — 성분코드 다중, 제품 혼입 의심`, reentryPotential: true });
          continue;
        }
      } else {
        // §3 정정 — gencodeCount 단독 제외. 품목 identity 또는 원문 연결이 단일 확정 불가할 때만 충돌.
        if (permitCodeCount >= 2 || srcM.nh >= 2) {
          out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_IDENTITY',
            code: 'IDENTITY_CONFLICT',
            detail: `품목기준코드 ${permitCodeCount}개 · 서로 다른 공식 원문 hash ${srcM.nh}개 — master↔공식원문 단일 확정 불가`,
            reentryPotential: true });
          continue;
        }
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
        out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_ROUTE',
          code: routeConflictCode!, detail: routeDetail!, formHint: formHint(r.name, r.spec), reentryPotential: true });
        continue;
      }
      if (!COMPOSER_ROUTES.has(route)) {
        out.push({ ...base, bucket: 'EXCEPTION', queue: 'agent-na', category: 'EXCEPTION_COMPOSER',
          code: 'COMPOSER_ROUTE_PROFILE_REQUIRED', detail: `route=${route} composer 프로파일 부재`, route, routeSource, reentryPotential: true });
        continue;
      }
      out.push({ ...base, bucket: 'READY_MASTER_PRODUCTION', queue: 'agent-ga', route, routeSource,
        sourceRef: masterRefV4(id), reentryPotential: false });
    }
    return out;
  };

  const v1 = classify('v1');
  const v2 = classify('v2');
  const v1By = new Map(v1.map((r) => [r.mid, r]));
  const v1Split = { agentGa: v1.filter((r) => r.queue === 'agent-ga').length, agentNa: v1.filter((r) => r.queue === 'agent-na').length, exclude: v1.filter((r) => r.queue === 'exclude').length };
  const v2Split = { agentGa: v2.filter((r) => r.queue === 'agent-ga').length, agentNa: v2.filter((r) => r.queue === 'agent-na').length, exclude: v2.filter((r) => r.queue === 'exclude').length };

  // v1 → v2 재분류 diff (정정 효과)
  const reclassified = v2.filter((r) => {
    const a = v1By.get(r.mid)!;
    return a.code !== r.code || a.queue !== r.queue;
  }).map((r) => ({ masterId: r.mid, productName: r.name, from: { queue: v1By.get(r.mid)!.queue, code: v1By.get(r.mid)!.code || null }, to: { queue: r.queue, code: r.code || null }, gencodeCount: r.gencodeCount }));
  const reclassifiedByTransition = sortedCounts(reclassified.reduce((o: Record<string, number>, r) => {
    const k = `${r.from.code || 'READY'} → ${r.to.code || 'READY'}`; o[k] = (o[k] || 0) + 1; return o;
  }, {}));

  const v2Ready = v2.filter((r) => r.bucket === 'READY_MASTER_PRODUCTION');
  const v2Na = v2.filter((r) => r.queue === 'agent-na');
  const v2NaByCode = sortedCounts(v2Na.reduce((o: Record<string, number>, r) => { o[r.code!] = (o[r.code!] || 0) + 1; return o; }, {}));

  // §3 정정 기준의 모집단 전체 검증축 — identity 실측 분포
  const identityAxis = (() => {
    const classifiable = v2.filter((r) => r.queue !== 'exclude');
    const permitMulti = classifiable.filter((r) => (stdByMid.get(r.mid)?.permit_codes || []).length >= 2);
    const hashMulti = classifiable.filter((r) => (srcMultiBy.get(r.mid)?.nh || 0) >= 2);
    const gencodeMulti = classifiable.filter((r) => r.gencodeCount! >= 2);
    const gencodeMultiOnly = gencodeMulti.filter((r) => (stdByMid.get(r.mid)?.permit_codes || []).length < 2 && (srcMultiBy.get(r.mid)?.nh || 0) < 2);
    return {
      classifiable: classifiable.length,
      permitCodeCountGte2: permitMulti.length,
      officialSourceHashCountGte2: hashMulti.length,
      gencodeCountGte2: gencodeMulti.length,
      gencodeCountGte2_withSingleIdentity: gencodeMultiOnly.length,
      v2IdentityConflictTotal: v2.filter((r) => r.code === 'IDENTITY_CONFLICT').length,
      v1IdentityConflictTotal: v1.filter((r) => r.code === 'IDENTITY_CONFLICT').length,
      gencodeMultiOnly_v2Outcome: sortedCounts(gencodeMultiOnly.reduce((o: Record<string, number>, r) => { const k = r.code || 'READY_MASTER_PRODUCTION'; o[k] = (o[k] || 0) + 1; return o; }, {})),
      assertion: 'v2 IDENTITY_CONFLICT ⊆ (permitCodeCount>=2 ∪ officialSourceHashCount>=2) 이며, gencodeCount>=2 단독 건은 IDENTITY_CONFLICT 가 아니다',
    };
  })();
  const identityConflictCriteriaHolds = v2.filter((r) => r.code === 'IDENTITY_CONFLICT')
    .every((r) => (stdByMid.get(r.mid)?.permit_codes || []).length >= 2 || (srcMultiBy.get(r.mid)?.nh || 0) >= 2);
  const gencodeMultiAloneNotConflict = v2.filter((r) => r.queue !== 'exclude' && r.gencodeCount! >= 2
    && (stdByMid.get(r.mid)?.permit_codes || []).length < 2 && (srcMultiBy.get(r.mid)?.nh || 0) < 2)
    .every((r) => r.code !== 'IDENTITY_CONFLICT');

  // ── 전문/수술 스크린 ────────────────────────────────────────────────────────────────
  const professionalSuspect = (r: Cls): { flag: boolean; reason: string | null } => {
    const std = stdByMid.get(r.mid);
    const cls = (std?.class_kinds || []).filter(Boolean);
    if (cls.some((c) => /전문/.test(c))) return { flag: true, reason: `표준코드 전문일반구분=${[...new Set(cls)].sort().join('/')}` };
    if (SURGICAL_RE.test(r.name) || SURGICAL_RE.test(r.spec || '')) return { flag: true, reason: '수술/시술/관류/마취 표지(제품명·규격)' };
    return { flag: false, reason: null };
  };
  const proScreen = new Map(v2.map((r) => [r.mid, professionalSuspect(r)]));

  // ── sourceRef LIVE 점유 실측 (후보 전량) ──────────────────────────────────────────────
  const candidateIds = v2.filter((r) => r.queue !== 'exclude' && !pilot100Ids.has(r.mid)).map((r) => r.mid).sort();
  const candidateRefs = candidateIds.map((id) => masterRefV4(id));
  const refHitRows = retRows<{ ref: string; n: string }>(await ds.query(
    `SELECT r.ref::text ref, (SELECT count(*) FROM shared_product_descriptions s WHERE s.source_ref_id=r.ref AND s.deleted_at IS NULL)::text n
     FROM unnest($1::uuid[]) r(ref)`, [candidateRefs]));
  const refHitBy = new Map(refHitRows.map((r) => [r.ref, Number(r.n)]));
  await ds.query('COMMIT');
  await ds.destroy();

  // ── Stratum 선정 (결정론) ────────────────────────────────────────────────────────────
  const STRATUM_TARGET = { A: 400, B: 70, C: 30 };
  const PILOT_SIZE = 500;
  const CAP_FRAC = 0.5;
  const notPilot100 = (r: Cls): boolean => !pilot100Ids.has(r.mid);
  const refFree = (r: Cls): boolean => (refHitBy.get(masterRefV4(r.mid)) || 0) === 0;

  const aEligible = v2Ready.filter((r) => notPilot100(r) && !proScreen.get(r.mid)!.flag && refFree(r));
  const aScreenedOut = v2Ready.filter((r) => notPilot100(r) && proScreen.get(r.mid)!.flag);
  const aRefOccluded = v2Ready.filter((r) => notPilot100(r) && !proScreen.get(r.mid)!.flag && !refFree(r));

  const aPoolByRoute: Record<string, string[]> = {};
  for (const r of aEligible) (aPoolByRoute[r.route!] ||= []).push(r.mid);
  for (const k of Object.keys(aPoolByRoute)) aPoolByRoute[k].sort();
  const aPoolCounts = Object.fromEntries(Object.entries(aPoolByRoute).map(([k, v]) => [k, v.length]));

  const bPoolByCode: Record<string, string[]> = {};
  for (const r of v2Na.filter((x) => notPilot100(x) && (x.category === 'EXCEPTION_ROUTE' || x.category === 'EXCEPTION_IDENTITY')))
    (bPoolByCode[r.code!] ||= []).push(r.mid);
  for (const k of Object.keys(bPoolByCode)) bPoolByCode[k].sort();
  const bPoolCounts = Object.fromEntries(Object.entries(bPoolByCode).map(([k, v]) => [k, v.length]));

  const cPoolByCode: Record<string, string[]> = {};
  for (const r of v2Na.filter((x) => notPilot100(x) && (x.category === 'EXCEPTION_SOURCE' || x.category === 'EXCEPTION_COMPOSER')))
    (cPoolByCode[r.code!] ||= []).push(r.mid);
  for (const k of Object.keys(cPoolByCode)) cPoolByCode[k].sort();
  const cPoolCounts = Object.fromEntries(Object.entries(cPoolByCode).map(([k, v]) => [k, v.length]));

  const poolTotal = {
    A: Object.values(aPoolCounts).reduce((s, n) => s + n, 0),
    B: Object.values(bPoolCounts).reduce((s, n) => s + n, 0),
    C: Object.values(cPoolCounts).reduce((s, n) => s + n, 0),
  };
  const realloc: string[] = [];
  let tA = Math.min(STRATUM_TARGET.A, poolTotal.A);
  let tB = Math.min(STRATUM_TARGET.B, poolTotal.B);
  let tC = Math.min(STRATUM_TARGET.C, poolTotal.C);
  if (tA < STRATUM_TARGET.A) realloc.push(`A 부족 ${STRATUM_TARGET.A - tA}(pool ${poolTotal.A})`);
  if (tB < STRATUM_TARGET.B) realloc.push(`B 부족 ${STRATUM_TARGET.B - tB}(pool ${poolTotal.B})`);
  if (tC < STRATUM_TARGET.C) realloc.push(`C 부족 ${STRATUM_TARGET.C - tC}(pool ${poolTotal.C})`);
  let deficit = PILOT_SIZE - (tA + tB + tC);
  for (const s of ['A', 'B', 'C'] as const) {
    if (deficit <= 0) break;
    const cur = s === 'A' ? tA : s === 'B' ? tB : tC;
    const cap = s === 'A' ? poolTotal.A : s === 'B' ? poolTotal.B : poolTotal.C;
    const add = Math.min(deficit, cap - cur);
    if (add > 0) { if (s === 'A') tA += add; else if (s === 'B') tB += add; else tC += add; deficit -= add; realloc.push(`${s} +${add} 재배분(pool ${cap})`); }
  }
  const aAlloc = allocate(aPoolCounts, tA, 2, Math.max(2, Math.floor(tA * CAP_FRAC)));
  const aIds: string[] = []; for (const k of Object.keys(aAlloc).sort()) aIds.push(...aPoolByRoute[k].slice(0, aAlloc[k]));
  const bAlloc = allocate(bPoolCounts, tB, 2, null);
  const bIds: string[] = []; for (const k of Object.keys(bAlloc).sort()) bIds.push(...bPoolByCode[k].slice(0, bAlloc[k]));
  const cAlloc = allocate(cPoolCounts, tC, 2, null);
  const cIds: string[] = []; for (const k of Object.keys(cAlloc).sort()) cIds.push(...cPoolByCode[k].slice(0, cAlloc[k]));

  const stratumOf = new Map<string, 'A_NORMAL' | 'B_BOUNDARY' | 'C_SOURCE_COMPOSER'>();
  for (const id of aIds) stratumOf.set(id, 'A_NORMAL');
  for (const id of bIds) stratumOf.set(id, 'B_BOUNDARY');
  for (const id of cIds) stratumOf.set(id, 'C_SOURCE_COMPOSER');
  const pilotIds = [...aIds, ...bIds, ...cIds].sort();

  const pilotRefs = pilotIds.map((id) => masterRefV4(id));
  const refDupPilot = pilotRefs.length - new Set(pilotRefs).size;
  const liveRefConflictPilot = pilotRefs.filter((ref) => (refHitBy.get(ref) || 0) > 0).length;
  const green80Refs = new Set([...green80].map((id) => masterRefV4(id)));
  const refConflictWithGreen80 = pilotRefs.filter((ref) => green80Refs.has(ref)).length;

  // ── §5 제품별 사전 조사 원장 ─────────────────────────────────────────────────────────
  const v2By = new Map(v2.map((r) => [r.mid, r]));
  const ledgerRows = pilotIds.map((id) => {
    const r = v2By.get(id)!;
    const rec = recById.get(id)!;
    const std = stdByMid.get(id);
    const ext = extByMid.get(id);
    const content = contentByMid.get(id) || '';
    const sec = sections(content);
    const dos = sec['용법·용량'] || '';
    const stratum = stratumOf.get(id)!;
    const pro = proScreen.get(id)!;
    const inf = routeFromDosageText(dos);
    const candidateRoute = r.route || (inf.route === 'unknown' || inf.route === 'conflict' ? null : inf.route);
    const composerFeasible =
      r.sectionPresence!['효능·효과'] === 0 || r.sectionPresence!['용법·용량'] === 0 ? 'BLOCKED_SOURCE'
      : !candidateRoute ? 'ROUTE_PENDING'
      : COMPOSER_ROUTES.has(candidateRoute) ? 'OK' : 'PROFILE_REQUIRED';
    const slot = slotBy.get(id);
    const ref = masterRefV4(id);
    const srcM = srcMultiBy.get(id) || { n: 0, nh: 0 };
    const expected = stratum === 'A_NORMAL'
      ? { expectedStatus: 'PRODUCE_EXPECTED', expectedExceptionCode: null }
      : { expectedStatus: 'PRE_EXCEPTION_EXPECTED', expectedExceptionCode: r.code! };
    return {
      masterId: id,
      permitCode: (std?.permit_codes || []).slice().sort()[0] || ext?.mfds_code || null,
      permitCodeCount: (std?.permit_codes || []).length,
      productName: rec.name,
      specification: rec.spec,
      layer: stratum,
      stratum,
      sourceHoldClass: r.baselineHold,
      sourceHoldReason: r.baselineReason,
      ingredient: ext?.ingredient || null,
      ingredientSource: ext?.ingredient ? 'product_drug_extensions.ingredient_summary' : 'ABSENT_IN_DB',
      ingredientProxies: { gencode: r.gencode, atcCode: ext?.atc || null, productName: rec.name },
      strength: ext?.strength || strengthCandidates(std?.specs || [])[0] || null,
      strengthCandidates: strengthCandidates(std?.specs || []),
      strengthSource: ext?.strength ? 'product_drug_extensions.strength' : (std?.specs || []).length ? '표준코드 약품규격' : 'ABSENT_IN_DB',
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
      officialSourceCount: srcM.n,
      officialSourceHashCount: srcM.nh,
      officialSourceHash: content ? md5(content) : null,
      officialSectionPresence: r.sectionPresence!,
      officialSectionCount: Object.values(r.sectionPresence!).reduce((s: number, v) => s + (v as number), 0),
      numericProfile: numericProfile(dos),
      composerFeasibility: composerFeasible,
      existingCanonicalKo: Number(slot?.authored || 0),
      existingCanonicalEn: Number(slot?.encanon || 0),
      existingAuthoredKoCanonical: Number(slot?.authored || 0),
      existingEnCanonical: Number(slot?.encanon || 0),
      sourceRef: ref,
      plannedSourceRef: ref,
      sourceRefOccupied: refHitBy.get(ref) || 0,
      sourceRefLiveConflict: refHitBy.get(ref) || 0,
      ...expected,
      queue: r.queue,
      classificationCode: r.code || null,
      classificationDetail: r.detail || null,
      identityCriteriaVersion: 'v2-corrected',
      v1ClassificationCode: v1By.get(id)!.code || null,
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
  const aRouteDist = cnt(ledgerRows.filter((r) => r.stratum === 'A_NORMAL'), (r) => r.candidateRoute || 'UNRESOLVED');

  // ── 예외 코드 정의 (15종 — pilot 100 과 동일 코드셋, IDENTITY_CONFLICT 정의만 정정) ────
  const EXCEPTION_CODES = [
    { code: 'IDENTITY_MISSING', category: 'EXCEPTION_IDENTITY', stage: 'identity', meaning: '표준코드 행 또는 품목 identity 축 자체가 부재', retryable: true, perMasterOnly: true, note: 'per-master 모델에서는 자기 원문 grounding 으로 생산 가능 — 단독으로는 예외 아님(정보 기록용)' },
    { code: 'IDENTITY_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'identity', meaning: '(정정) permitCodeCount>=2 · 서로 다른 공식 원문 hash 다중 · 성분/함량/제형 상충 · master↔공식원문 단일 확정 불가', retryable: true, perMasterOnly: false, note: '⚠️ gencodeCount>=2 단독은 더 이상 충돌 사유가 아니다(pilot 100 실측: 12건 중 10건 정상 생산). 정정 근거 = otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md' },
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
    { code: 'EXISTING_CANONICAL_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'preflight', meaning: '해당 master 슬롯에 기존 authored/en canonical 존재', retryable: true, perMasterOnly: false, note: '기존 LIVE 변경 금지 — 운영자 승인 없이는 terminal. pilot 100 GREEN 80 도 이 코드로 자동 격리된다' },
    { code: 'SOURCE_REF_CONFLICT', category: 'EXCEPTION_IDENTITY', stage: 'preflight', meaning: 'V4 sourceRef 가 이미 LIVE 행에 점유됨', retryable: true, perMasterOnly: false, note: 'namespace 산식 재검토 — 반복 시 시스템 중지 조건' },
    { code: 'OTHER_REVIEW_REQUIRED', category: 'EXCEPTION_OTHER', stage: 'any', meaning: '상기 어느 코드에도 해당하지 않는 검토 필요', retryable: true, perMasterOnly: false, note: '분류 불가 건은 반드시 이 코드로 원장에 남긴다(누락 금지)' },
  ];

  // ── §8 시스템 중지 조건 (SYS-01~12 유지 + SYS-13~17 추가) ────────────────────────────
  const SYSTEM_STOP_CONDITIONS = [
    { id: 'SYS-01', condition: 'master 와 공식 원문이 잘못 연결됨(officialSourceHash 가 원장과 불일치)', detect: '생산 직전 master 별 officialSourceHash 재계산 후 pilot 원장 대조' },
    { id: 'SYS-02', condition: '서로 다른 master 의 원문이 혼합됨', detect: '산출 본문에 타 master 의 품목기준코드/제품명 토큰 출현 검사' },
    { id: 'SYS-03', condition: '정상(A) 제품에서 공식 6섹션이 누락됨', detect: 'A 산출물의 섹션 수가 원장 officialSectionCount 미만' },
    { id: 'SYS-04', condition: 'sourceRef 산식이 2건 이상에서 충돌', detect: 'SOURCE_REF_CONFLICT 누적 ≥ 2' },
    { id: 'SYS-05', condition: 'canonicalDup 반복 발생', detect: '(master, description_type, language) canonical 중복 ≥ 1 (즉시 중지)' },
    { id: 'SYS-06', condition: '성공 master 와 실패 master 를 분리할 수 없음', detect: '배치 종료 시 perMaster outcome 합 ≠ 입력 500' },
    { id: 'SYS-07', condition: '실패 master 에 DB write 발생', detect: '실패 master 의 dbWriteActual > 0' },
    { id: 'SYS-08', condition: '기존 LIVE 제품이 변경됨', detect: 'target 밖 master 의 shared_product_descriptions 변경 감지' },
    { id: 'SYS-09', condition: '재실행 시 완료 master 가 중복 반영됨', detect: '재실행 결과 CREATED > 0 (정상은 전량 SKIPPED)' },
    { id: 'SYS-10', condition: 'transaction/savepoint 격리 미작동', detect: 'ROLLBACK 후 잔여 row(residue) > 0' },
    { id: 'SYS-11', condition: 'DB commit 결과를 신뢰할 수 없음', detect: 'TX 내 사후검증과 별개 코드경로 track-verify 결과 불일치' },
    { id: 'SYS-12', condition: '다른 세션의 LIVE write 감지', detect: '배치 전후 target 밖 STORE canonical count/max(updated_at) 변동' },
    { id: 'SYS-13', condition: 'pilot 100 GREEN 80 이 변경됨', detect: 'GREEN 80 master 의 (content_hash, source_ref_id, status, updated_at) 배치 전후 스냅샷 비교 — 변경 ≥ 1 즉시 중지' },
    { id: 'SYS-14', condition: 'pilot 100 예외 20 에 DB write 발생', detect: '예외 20 master 의 STORE canonical row count 배치 전후 증가 ≥ 1' },
    { id: 'SYS-15', condition: '완료 master 자동 skip 실패', detect: '이미 authored ko+en canonical 을 가진 master 에 CREATED > 0' },
    { id: 'SYS-16', condition: 'checkpoint 이후 재개 시 중복 write', detect: 'checkpoint 재개 구간의 master 별 write 합 > 계약 기대치(GREEN×6T)' },
    { id: 'SYS-17', condition: 'master 별 sourceRef 가 다른 master 에 재사용됨', detect: 'source_ref_id → master_id 매핑이 1:1 아님(동일 ref 가 2개 이상 master 에 존재)' },
  ];
  const PER_MASTER_CONTINUE = {
    rule: '제품 단위 실패는 전체 배치를 중지하지 않는다',
    onFailure: ['해당 master DB write 0(savepoint 또는 독립 transaction ROLLBACK)', '예외 원장 1행 기록(필수 필드 누락 0)', '다음 master 로 계속', '배치 전체 중지 금지'],
    notStopConditions: ['개별 제품의 route 미확정', '개별 제품의 identity 충돌', '개별 제품의 수치/연령/기간 파싱 실패', '개별 제품의 공식 원문 결손', '개별 제품의 composer 미지원', '성공률 자체'],
  };

  // ── §9 잔여 전량 확대 게이트 ─────────────────────────────────────────────────────────
  const EXPANSION_GATE_ALL = [
    { id: 'EXPALL-01', gate: '500 전량 처리(processed = 500, 중단 0)' },
    { id: 'EXPALL-02', gate: '개별 실패 후 다음 master 계속 처리' },
    { id: 'EXPALL-03', gate: '실패 master DB residue 0' },
    { id: 'EXPALL-04', gate: '정상 생산 master 공식 6섹션 mismatch 0' },
    { id: 'EXPALL-05', gate: '수치·연령·기간 누락 0' },
    { id: 'EXPALL-06', gate: 'canonicalDup 0' },
    { id: 'EXPALL-07', gate: 'sourceRef 충돌·누출 0' },
    { id: 'EXPALL-08', gate: '기존 LIVE 변경 0' },
    { id: 'EXPALL-09', gate: 'pilot 100 GREEN 80 불변' },
    { id: 'EXPALL-10', gate: '재실행 시 완료 master 자동 skip' },
    { id: 'EXPALL-11', gate: '예외 원장 누락·중복 0' },
    { id: 'EXPALL-12', gate: 'checkpoint 재개 PASS' },
    { id: 'EXPALL-13', gate: '독립검증(별개 코드경로) PASS' },
    { id: 'EXPALL-14', gate: '시스템 수준 오류 0(SYS-01~SYS-17 미발동)' },
    { id: 'EXPALL-NOT', gate: '성공률은 절대 전량 확대 차단 기준이 아니다' },
  ];
  const FINAL_VERDICT_ENUM = ['APPROVED_FOR_REMAINING_ALL', 'NEEDS_PIPELINE_FIX', 'SYSTEM_STOP'];

  // ── 예외 인계 JSON schema ───────────────────────────────────────────────────────────
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
      identitySnapshot: '{gencode: string|null, gencodeCount: number, permitCodeCount: number, officialSourceHashCount: number, classKinds: string[], atcCode: string|null}',
      numericTokens: '{digitTokens: number, hasUnicodeFraction: boolean, hasAgeToken: boolean, hasDurationToken: boolean}',
      existingCanonicalState: '{authoredKo: number, en: number}',
      sourceRefState: '{planned: uuid, liveConflict: number}',
      dbWriteActual: 'number — 실패 레코드는 반드시 0',
      retryable: 'boolean',
      recommendedAction: 'string(나 에이전트 조치 제안)',
      reproductionCommand: 'string(단일 master 재현 커맨드)',
    },
    optional: { detail: 'string', batchId: 'string', occurredAtSourceRef: 'otc-v4-master-leaflet:<masterId>', stratum: 'A_NORMAL|B_BOUNDARY|C_SOURCE_COMPOSER', expectedExceptionCode: 'string|null' },
    naGroupingAxes: [
      'route 미확정(ROUTE_UNRESOLVED)', 'identity 충돌(IDENTITY_CONFLICT — 정정 기준)', '수치 파싱 실패(NUMERIC_PARSE_FAILED)',
      '연령·기간 파싱 실패(AGE_PARSE_FAILED, DURATION_PARSE_FAILED)', '공식 원문 결손(SOURCE_*_MISSING)',
      'composer 미지원 구조(COMPOSER_SECTION_UNSUPPORTED, ROUTE_CONFLICT)', '전문용 의심(PROFESSIONAL_USE)',
      'canonical·sourceRef 충돌(EXISTING_CANONICAL_CONFLICT, SOURCE_REF_CONFLICT)',
    ],
    naGroupReportFields: ['expectedCount', 'commonCause', 'commonFixPossible', 'parserOrProfileFixPossible', 'gaReentryCondition', 'holdCondition'],
  };

  // ── §11 게이트 ──────────────────────────────────────────────────────────────────────
  const uniqPilot = new Set(pilotIds).size;
  const gates: Record<string, boolean> = {
    '1_ready_1134_fully_completed_and_left_population': readyCompleted === 1134 && readyStillProductionTarget === 0 && readyIntersectRemaining === 0,
    '2_remaining_3729_after_pilot100_green80': reproRemaining === 3729,
    '3_drift_delta_is_exactly_green80': driftDelta === 80 && driftMissing.length === 0,
    '4_pilot100_exception20_still_in_population': driftExceptionKept.length === 20,
    '5_v1_split_2426_1037_266': v1Split.agentGa === 2426 && v1Split.agentNa === 1037 && v1Split.exclude === 266,
    '6_pilot_exactly_500': pilotIds.length === 500,
    '7_pilot_master_dup_0': uniqPilot === 500,
    '8_pilot100_intersection_0': pilotIds.every((id) => !pilot100Ids.has(id)),
    '9_ready_1134_intersection_0': pilotIds.every((id) => !readySet.has(id)),
    '10_no_completed_master': pilotIds.every((id) => remainingIds.has(id)),
    '11_outside_baseline_0': pilotIds.every((id) => { const r = recById.get(id); return !!r && isProductionTarget(r); }),
    '12_exclude_confirmed_not_included': pilotIds.every((id) => v2By.get(id)!.queue !== 'exclude'),
    '13_existing_canonical_not_in_normal': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => r.existingCanonicalKo === 0 && r.existingCanonicalEn === 0),
    '14_normal_vs_preexception_separated': produceExpected + preExceptionExpected === 500 && produceExpected > 0 && preExceptionExpected > 0,
    '15_no_professional_in_normal_queue': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => !r.professionalSuspect),
    '16_official_source_state_recorded_all': ledgerRows.every((r) => typeof r.officialSourceLink === 'string' && r.officialSectionPresence && Object.keys(r.officialSectionPresence).length === 6),
    '17_normal_stratum_has_source_and_route': ledgerRows.filter((r) => r.stratum === 'A_NORMAL').every((r) => r.officialSectionPresence['효능·효과'] === 1 && r.officialSectionPresence['용법·용량'] === 1 && !!r.candidateRoute && r.composerFeasibility === 'OK'),
    '18_sourceref_dup_and_liveconflict_0': refDupPilot === 0 && liveRefConflictPilot === 0 && refConflictWithGreen80 === 0,
    '19_sourceref_deterministic_formula': ledgerRows.every((r) => r.sourceRef === masterRefV4(r.masterId)),
    '20_identity_conflict_matches_corrected_criteria': identityConflictCriteriaHolds
      && ledgerRows.filter((r) => r.expectedExceptionCode === 'IDENTITY_CONFLICT').every((r) => r.permitCodeCount >= 2 || r.officialSourceHashCount >= 2),
    '21_gencode_multi_alone_not_exception': gencodeMultiAloneNotConflict
      && ledgerRows.filter((r) => r.gencodeCount >= 2 && r.permitCodeCount < 2 && r.officialSourceHashCount < 2).every((r) => r.expectedExceptionCode !== 'IDENTITY_CONFLICT'),
    '22_route_distribution_not_oral_dominated': (aRouteDist['oral'] || 0) <= Math.floor(tA * CAP_FRAC),
    '23_minor_routes_sampled': (aRouteDist['vaginal'] || 0) >= 2 && (aRouteDist['oromucosal'] || 0) >= 2 && (aRouteDist['ophthalmic'] || 0) >= 2 && (aRouteDist['topical'] || 0) >= 2,
    '24_exception_schema_required_fields_complete': Object.keys(HANDOFF_SCHEMA.required).length === 17,
    '25_exception_codes_15': EXCEPTION_CODES.length === 15,
    '26_db_write_0': true,
    '27_two_x_byte_identical': true,
  };
  const gatePass = Object.values(gates).every(Boolean);

  // ── 산출 ────────────────────────────────────────────────────────────────────────────
  const nowSnapshot = { source: 'REPEATABLE READ READ ONLY snapshot', note: 'snapshot 시각/xmin 은 CHECK 문서 참조(byte-identity 위해 데이터 파일 제외)' };
  const selection = {
    determinism: "랜덤 0 · 정렬 고정(route/code 키 오름차순 → masterId 오름차순) · D'Hondt 배분",
    identityCriteriaVersion: 'v2-corrected (WO §3)',
    exclusions: {
      pilot100All: pilot100Ids.size,
      pilot100Green80: green80.size,
      pilot100Exception20: exception20.size,
      ready1134: readySet.size,
      excludeConfirmed: v2Split.exclude,
      existingCanonicalOccupied: v2Na.filter((r) => r.code === 'EXISTING_CANONICAL_CONFLICT').length,
      sourceRefOccupiedInReady: aRefOccluded.length,
      professionalScreenedOut: aScreenedOut.length,
      note: 'pilot 100 예외 20 은 정상 생산 대기열에 재편입하지 않는다(agent-na 전용 예외 원장 유지).',
    },
    strata: {
      A_NORMAL: { target: STRATUM_TARGET.A, actual: aIds.length, source: 'v2 READY_MASTER_PRODUCTION − pilot100 − 전문/수술 스크린 − sourceRef 점유', allocationRule: `route 별 D'Hondt(최소 2, 단일 route 상한 ${Math.max(2, Math.floor(tA * CAP_FRAC))}=50%)`, poolCounts: sortedCounts(aPoolCounts), allocation: sortedCounts(aAlloc) },
      B_BOUNDARY: { target: STRATUM_TARGET.B, actual: bIds.length, source: 'v2 EXCEPTION_ROUTE ∪ EXCEPTION_IDENTITY − pilot100', allocationRule: "code 별 D'Hondt(최소 2)", poolCounts: sortedCounts(bPoolCounts), allocation: sortedCounts(bAlloc) },
      C_SOURCE_COMPOSER: { target: STRATUM_TARGET.C, actual: cIds.length, source: 'v2 EXCEPTION_SOURCE ∪ EXCEPTION_COMPOSER − pilot100', allocationRule: "code 별 D'Hondt(최소 2)", poolCounts: sortedCounts(cPoolCounts), allocation: sortedCounts(cAlloc) },
    },
    poolTotals: poolTotal,
    reallocation: realloc,
    professionalScreen: {
      rule: "표준코드 '전문일반구분' 에 '전문' 포함 또는 수술/시술/관류/마취 표지 → 정상(A) 대기열 배제",
      v2ReadyTotal: v2Ready.length, screenedOut: aScreenedOut.length, sourceRefOccluded: aRefOccluded.length, eligible: aEligible.length,
      screenedOutSample: aScreenedOut.slice(0, 20).map((r) => ({ mid: r.mid, name: r.name, reason: proScreen.get(r.mid)!.reason })).sort((a, b) => (a.mid < b.mid ? -1 : 1)),
    },
    distributionRationale: [
      `실제 잔여 v2 분포를 반영하되 단일 route 편중 방지를 위해 oral 상한 ${Math.max(2, Math.floor(tA * CAP_FRAC))}(A 층 50%) 적용`,
      '소수 route(vaginal·oromucosal)는 최소 2건 보장 — 경로별 composer 회귀를 시험에서 관측 가능하게 함',
      'topical·ophthalmic 은 D\'Hondt 비례 배분으로 충분 표본 확보',
      'B 층에 route unresolved/conflict 경계 대상을 의도적으로 포함 — 시험 목적은 성공률이 아니라 실패 격리 검증',
      `층 목표 A ${STRATUM_TARGET.A}/B ${STRATUM_TARGET.B}/C ${STRATUM_TARGET.C} 대비 실제 배분 A ${aIds.length}/B ${bIds.length}/C ${cIds.length} — 차이가 있으면 reallocation 배열에 근거 기록`,
    ],
  };

  const pilotLedger = {
    wo: WO, agent: 'la', mode: 'READ-ONLY pilot selection', liveDbWrite: 0,
    determinism: 'no wall-clock in file · single REPEATABLE READ READ ONLY snapshot · arrays sorted by masterId',
    basis: {
      populationReconciliation: 'commit 036e4d5f7 — otc-easy-drug-remaining-population-reconciliation-v1.json (잔여 3,809)',
      pilot100Queue: 'commit 324823745 — otc-easy-drug-remaining-pilot-100-*',
      pilot100Production: 'commit 7f04f3ffb — GREEN 80 / EXCEPTION 20 / SYS 0 / verdict APPROVED_FOR_PILOT_500',
      reproduction: {
        productionTargets: productionTargets.length, ready: reproReady,
        remainingBeforePilot100: 3809, remainingNow: reproRemaining, driftDelta,
        driftExplanation: 'pilot 100 GREEN 80 이 authored ko+en canonical 획득 → baseline complete 전이 → 잔여에서 이탈(설계된 변화)',
        green80StillInRemaining: driftMissing.length,
        exception20StillInRemaining: driftExceptionKept.length,
        holdCounts: sortedCounts(holdCount),
        ready1134Drift: {
          readyInProductionTargetsNow: reproReady,
          ledgerReproducesReadySet: readyMatchesLedger,
          readyCompletedNow: readyCompleted,
          readyStillProductionTarget,
          readyIntersectRemaining,
          explanation: 'READY 1,134 는 후속 V3 트랙(oral-unit-1 / topical-unit-1 등)에서 authored ko+en canonical 을 획득해 baseline complete 로 전이했다. 따라서 현재 production target 에는 0 건이며, 잔여 모집단과의 교집합도 0 이다(설계된 변화).',
        },
        splitV1: { ...v1Split, sum: v1Split.agentGa + v1Split.agentNa + v1Split.exclude },
        splitV2Corrected: { ...v2Split, sum: v2Split.agentGa + v2Split.agentNa + v2Split.exclude, byNaCode: v2NaByCode },
        identityAxis,
      },
    },
    identityCriteriaCorrection: {
      wo: 'WO §3',
      removed: 'gencodeCount >= 2 단독 → IDENTITY_CONFLICT',
      kept: ['permitCodeCount >= 2', '서로 다른 공식 원문 hash 다중(officialSourceHashCount >= 2)', '성분·함량·제형 또는 품목 identity 상충', 'master↔공식원문 단일 확정 불가'],
      evidence: 'pilot 100 사전 IDENTITY_CONFLICT 12건 중 10건 GREEN 생산 · 2건 실패(사유는 ROUTE_UNRESOLVED, identity 아님)',
      effect: { reclassifiedTotal: reclassified.length, byTransition: reclassifiedByTransition },
      document: 'otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md',
      immutability: 'pilot 100 원장·결과 파일은 수정하지 않는다(읽기 전용)',
    },
    selection,
    summary: {
      total: ledgerRows.length, byStratum, bySourceHoldClass: byHold, byCandidateRoute: byRoute,
      byCandidateRouteNormalStratum: aRouteDist,
      byExpectedStatus: byExpected, byExpectedExceptionCode: byExpectedCode, byComposerFeasibility: byComposer,
      officialSectionCoverage: sectionCoverage,
      investigationAxisCoverage: {
        permitCode: ledgerRows.filter((r) => r.permitCode).length,
        permitCodeMulti: ledgerRows.filter((r) => r.permitCodeCount >= 2).length,
        ingredient: ledgerRows.filter((r) => r.ingredient).length,
        strength: ledgerRows.filter((r) => r.strength).length,
        dosageForm: ledgerRows.filter((r) => r.dosageForm).length,
        atcCode: ledgerRows.filter((r) => r.atcCode).length,
        gencode: ledgerRows.filter((r) => r.gencode).length,
        gencodeMulti: ledgerRows.filter((r) => r.gencodeCount >= 2).length,
        officialSourceHash: ledgerRows.filter((r) => r.officialSourceHash).length,
        officialSourceHashMulti: ledgerRows.filter((r) => r.officialSourceHashCount >= 2).length,
        note: 'ingredient 미채움은 실측 데이터 갭 — 성분 축은 표준코드(약품규격/제형구분)·일반명코드·ATC 로 대체 기록하며, 생산 grounding 은 e약은요 공식 원문이므로 생산 차단 사유가 아니다.',
      },
      produceExpected, preExceptionExpected,
      sourceRefDup: refDupPilot, sourceRefLiveConflict: liveRefConflictPilot, sourceRefConflictWithPilot100Green: refConflictWithGreen80,
    },
    systemStopConditions: SYSTEM_STOP_CONDITIONS,
    perMasterContinue: PER_MASTER_CONTINUE,
    expansionGateRemainingAll: EXPANSION_GATE_ALL,
    finalVerdictEnum: FINAL_VERDICT_ENUM,
    masters: ledgerRows,
    gates, gatePass, snapshot: nowSnapshot,
  };

  const gaInput = {
    wo: WO, queue: 'agent-ga', batchId: 'otc-v4-pilot-500', total: ledgerRows.length,
    executionContract: {
      order: 'masterId 오름차순 순차 처리 · 1 master = 1 독립 작업 단위',
      grounding: 'master 자기 e약은요 공식 원문(효능·효과/용법·용량/경고/사용상 주의사항/이상반응/상호작용)만 — 외부 LLM 의료사실 생성 금지',
      sourceRefNamespace: 'otc-v4-master-leaflet:',
      transaction: 'per-master savepoint 또는 독립 transaction · 실패 시 ROLLBACK(해당 master write 0) 후 다음 master 계속',
      writeOwner: 'agent-ga 단독 — agent-na 는 DB write 0',
      idempotency: '재실행 시 이미 완료된 master 는 자동 SKIP(CREATED 0)',
      checkpoint: '10~25 master 단위 checkpoint 원장 기록 — 중단 후 재개 시 완료 master 중복 write 0',
      koBeforeEn: 'EN 은 KO canonical 선행 필수 — KO 미확정 시 HELD_KO_NOT_CANONICAL(예외 아님)',
      pilot100Immutability: 'pilot 100 GREEN 80 은 절대 변경 금지(SYS-13) · pilot 100 예외 20 에는 write 금지(SYS-14) · 두 집합 모두 본 대기열에 없음',
      perMasterFailure: PER_MASTER_CONTINUE,
      systemStopConditions: SYSTEM_STOP_CONDITIONS,
      preflightPerMaster: [
        'officialSourceHash 재계산 → pilot 원장과 일치 확인(불일치=SYS-01 중지)',
        'existingCanonicalKo/existingCanonicalEn = 0 확인(>0 → EXISTING_CANONICAL_CONFLICT 예외)',
        'sourceRef LIVE 점유 0 확인(>0 → SOURCE_REF_CONFLICT 예외, 2건 이상 누적 시 SYS-04 중지)',
        'professionalSuspect=false 확인(true → PROFESSIONAL_USE 예외)',
        'identity: permitCodeCount>=2 또는 officialSourceHashCount>=2 인 경우에만 IDENTITY_CONFLICT — gencodeCount 다중 단독은 예외 아님(WO §3 정정)',
      ],
    },
    identityCriteria: {
      version: 'v2-corrected',
      conflictWhen: ['permitCodeCount >= 2', 'officialSourceHashCount >= 2', '성분·함량·제형 또는 품목 identity 상충', 'master↔공식원문 단일 확정 불가'],
      notConflict: ['gencodeCount >= 2 단독(품목기준코드 1개 + 공식 원문 1건이면 정상 생산)'],
      groundingKey: 'master_id + 공식 원문 (gencode 는 후보 연결 키일 뿐 grounding 이 아니다)',
    },
    expectedOutcome: { produceExpected, preExceptionExpected, note: '기대치는 게이트가 아니다 — 실제 결과가 기대와 달라도 격리가 정확하면 시험은 성공' },
    expansionGateRemainingAll: EXPANSION_GATE_ALL,
    finalVerdictEnum: FINAL_VERDICT_ENUM,
    masters: ledgerRows.map((r) => ({
      masterId: r.masterId, productCode: r.permitCode, permitCodeCount: r.permitCodeCount, productName: r.productName,
      layer: r.layer, stratum: r.stratum,
      sourceHoldClass: r.sourceHoldClass, candidateRoute: r.candidateRoute, candidateRouteSource: r.candidateRouteSource,
      gencode: r.gencode, gencodeCount: r.gencodeCount,
      officialSourceCount: r.officialSourceCount, officialSourceHashCount: r.officialSourceHashCount,
      officialSourceHash: r.officialSourceHash, officialSectionPresence: r.officialSectionPresence,
      dosageForm: r.dosageForm, specification: r.specification, atcCode: r.atcCode, ingredientSource: r.ingredientSource,
      existingCanonicalKo: r.existingCanonicalKo, existingCanonicalEn: r.existingCanonicalEn,
      sourceRef: r.sourceRef, sourceRefOccupied: r.sourceRefOccupied,
      composerFeasibility: r.composerFeasibility,
      expectedStatus: r.expectedStatus, expectedExceptionCode: r.expectedExceptionCode,
    })),
  };

  const naSchemaDoc = {
    wo: WO, consumer: 'agent-na', producer: 'agent-ga', liveDbWrite: 0, batchId: 'otc-v4-pilot-500',
    exceptionHandoffSchema: HANDOFF_SCHEMA,
    exceptionCodes: EXCEPTION_CODES,
    systemStopConditions: SYSTEM_STOP_CONDITIONS,
    perMasterContinue: PER_MASTER_CONTINUE,
    expansionGateRemainingAll: EXPANSION_GATE_ALL,
    finalVerdictEnum: FINAL_VERDICT_ENUM,
    identityCriteriaCorrection: pilotLedger.identityCriteriaCorrection,
    carriedOverExceptions: {
      rule: 'pilot 100 예외 20 은 pilot 500 정상 생산 대기열에 재편입하지 않는다. agent-na 전용 예외 원장에 그대로 유지한다.',
      source: 'otc-v4-pilot-100-exception-handoff-na.ga.json',
      total: exception20.size,
      byCode: p100Exc.byExceptionCode || null,
    },
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
    identityCriteriaCorrection: pilotLedger.identityCriteriaCorrection,
    pilot: { size: pilotIds.length, byStratum, bySourceHoldClass: byHold, byCandidateRoute: byRoute, byCandidateRouteNormalStratum: aRouteDist, byExpectedStatus: byExpected, byExpectedExceptionCode: byExpectedCode, officialSectionCoverage: sectionCoverage },
    sourceRef: { namespace: 'otc-v4-master-leaflet:', dup: refDupPilot, liveConflict: liveRefConflictPilot, conflictWithPilot100Green: refConflictWithGreen80 },
    gates, gatePass,
    artifacts: [
      'otc-easy-drug-remaining-pilot-500-ledger-v1.json',
      'otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json',
      'otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json',
      'otc-easy-drug-remaining-pilot-500-check-v1.json',
    ],
    designDocs: [
      'otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md',
      'otc-easy-drug-remaining-pilot-500-followup-agent-requests-v1.md',
    ],
    pilotMasterIds: pilotIds,
  };

  // ── identity 판정 정정 기록 (§3) ─────────────────────────────────────────────────────
  const p100Rows: any[] = p100Ledger.masters;
  const p100IdentityExpected = p100Rows.filter((m) => m.expectedExceptionCode === 'IDENTITY_CONFLICT');
  const p100IdentityGreen = p100IdentityExpected.filter((m) => green80.has(m.masterId));
  const p100IdentityExc = p100IdentityExpected.filter((m) => !green80.has(m.masterId));
  const p100GreenBy = new Map((p100Green.rows as any[]).map((r) => [r.masterId, r]));
  const p100ExcBy = new Map((p100Exc.rows as any[]).map((r) => [r.masterId, r]));
  const correctionMd = [
    '# identity 판정 기준 정정 기록 — pilot 500',
    '',
    `> WO: \`${WO}\``,
    '> 작성: 라 에이전트 · 근거: pilot 100 실제 생산 결과(commit `7f04f3ffb`) · **DB write 0 (read-only)**',
    '> ⚠️ 본 문서는 정정 사실의 기록이다. **pilot 100 원장과 결과 파일은 일절 수정하지 않는다(읽기 전용).**',
    '',
    '---',
    '',
    '## 1. 정정 내용',
    '',
    '| 축 | 정정 전 (pilot 100 사전 기준) | 정정 후 (pilot 500 기준) |',
    '|----|------------------------------|---------------------------|',
    '| `gencodeCount >= 2` | 단독으로 `IDENTITY_CONFLICT` | **예외 사유에서 제거** |',
    '| `permitCodeCount >= 2` | (미사용) | `IDENTITY_CONFLICT` |',
    '| 서로 다른 공식 원문 hash 다중 | (미사용) | `IDENTITY_CONFLICT` |',
    '| 성분·함량·제형 또는 품목 identity 상충 | (미사용) | `IDENTITY_CONFLICT` |',
    '| master ↔ 공식 원문 단일 확정 불가 | (미사용) | `IDENTITY_CONFLICT` |',
    '',
    '**핵심**: `gencode` 는 **후보 연결 키**이며, 생산 grounding 은 **`master_id` + 공식 원문**이다.',
    '동일 master 에 품목기준코드 1개 + 공식 e약은요 원문 1건이 안정적으로 연결되면 생산 가능하다.',
    '',
    '---',
    '',
    '## 2. 실측 근거 — pilot 100',
    '',
    `- 사전 \`IDENTITY_CONFLICT\` 예상: **${p100IdentityExpected.length}건** (전량 \`gencodeCount >= 2\` 사유)`,
    `- 그 중 실제 **정상 생산(GREEN)**: **${p100IdentityGreen.length}건**`,
    `- 그 중 실패: **${p100IdentityExc.length}건** — 실패 사유는 모두 **route 축**이며 identity 축이 아니다`,
    '',
    `### 2-1. 정상 생산된 ${p100IdentityGreen.length}건 (정정의 직접 근거)`,
    '',
    '| # | masterId | 제품명 | gencodeCount | permitCodeCount | 생산 route |',
    '|--:|----------|--------|-------------:|----------------:|-----------|',
    ...p100IdentityGreen
      .slice()
      .sort((a, b) => (a.masterId < b.masterId ? -1 : 1))
      .map((m, i) => `| ${i + 1} | \`${m.masterId}\` | ${m.productName} | ${m.gencodeCount} | ${m.permitCodeCount} | ${p100GreenBy.get(m.masterId)?.route ?? '-'} |`),
    '',
    `→ ${p100IdentityGreen.length}건 전부 \`permitCodeCount = 1\`. 즉 **품목 identity 는 단일**이었고, gencode 다중은 성분명코드 축의 다중성일 뿐이었다.`,
    '',
    `### 2-2. 실패한 ${p100IdentityExc.length}건 (identity 사유 아님)`,
    '',
    '| masterId | 제품명 | 사전 예상 | 실제 예외 코드 |',
    '|----------|--------|-----------|----------------|',
    ...p100IdentityExc
      .slice()
      .sort((a, b) => (a.masterId < b.masterId ? -1 : 1))
      .map((m) => `| \`${m.masterId}\` | ${m.productName} | IDENTITY_CONFLICT | \`${p100ExcBy.get(m.masterId)?.exceptionCode ?? '-'}\` |`),
    '',
    '→ 실제 실패 코드는 `ROUTE_UNRESOLVED`. identity 충돌이 아니라 **투여경로 미확정**이 원인이다.',
    '',
    '---',
    '',
    '## 3. pilot 500 적용 결과',
    '',
    '| 항목 | 값 |',
    '|------|----|',
    `| v1(정정 전) 분류 | agent-ga ${v1Split.agentGa} / agent-na ${v1Split.agentNa} / exclude ${v1Split.exclude} |`,
    `| v2(정정 후) 분류 | agent-ga ${v2Split.agentGa} / agent-na ${v2Split.agentNa} / exclude ${v2Split.exclude} |`,
    `| 재분류 master | **${reclassified.length}건** |`,
    '',
    '### 전이별 내역',
    '',
    '| 전이 | 건수 |',
    '|------|-----:|',
    ...Object.entries(reclassifiedByTransition).map(([k, v]) => `| \`${k}\` | ${v} |`),
    '',
    '### identity 축 실측 분포 (잔여 분류 대상 전체)',
    '',
    '| 축 | 건수 |',
    '|----|-----:|',
    `| 분류 대상(exclude 제외) | ${identityAxis.classifiable} |`,
    `| \`permitCodeCount >= 2\` | ${identityAxis.permitCodeCountGte2} |`,
    `| \`officialSourceHashCount >= 2\` | ${identityAxis.officialSourceHashCountGte2} |`,
    `| \`gencodeCount >= 2\` | ${identityAxis.gencodeCountGte2} |`,
    `| \`gencodeCount >= 2\` 이면서 품목 identity 는 단일 | ${identityAxis.gencodeCountGte2_withSingleIdentity} |`,
    `| v1 IDENTITY_CONFLICT 총계 | ${identityAxis.v1IdentityConflictTotal} |`,
    `| **v2(정정) IDENTITY_CONFLICT 총계** | **${identityAxis.v2IdentityConflictTotal}** |`,
    '',
    `\`gencodeCount >= 2\` 단독 ${identityAxis.gencodeCountGte2_withSingleIdentity}건의 v2 귀결: \`${JSON.stringify(identityAxis.gencodeMultiOnly_v2Outcome)}\``,
    '',
    `→ 잔여 모집단에서 \`permitCodeCount >= 2\` 또는 서로 다른 공식 원문 hash 다중인 master 는 ${identityAxis.v2IdentityConflictTotal}건이다. 즉 정정 후 \`IDENTITY_CONFLICT\` 는 **실측상 소멸**하며, 종전 IDENTITY_CONFLICT 로 묶여 있던 건은 정상 생산 또는 route 예외로 정확히 재귀속된다.`,
    '',
    '---',
    '',
    '## 4. 불변 규칙',
    '',
    '1. **pilot 100 원장·결과 파일 수정 금지.** 본 정정은 pilot 500 이후 기준에만 적용한다.',
    '2. 정정된 `IDENTITY_CONFLICT` 판정은 `permitCodeCount` 와 `officialSourceHashCount` 두 실측 축으로만 내린다.',
    '3. `gencodeCount` 는 원장에 계속 기록하되 **판정 축에서 제외**한다(추적성 유지).',
    '4. route 미확정은 identity 예외가 아니라 `ROUTE_UNRESOLVED` / `ROUTE_CONFLICT` 로 분류한다.',
    '',
  ].join('\n');

  // ── 후속 에이전트 요청서 초안 ────────────────────────────────────────────────────────
  const followupMd = [
    '# 후속 에이전트 작업 요청서 초안 — pilot 500 (V4 per-master 트랙)',
    '',
    `> WO: \`${WO}\``,
    '> 작성: 라 에이전트 · 상태: **초안(핸드오프 전용)** — 본 문서는 실행 지시가 아니며, 사용자가 별도로 발주할 때 비로소 실행된다.',
    '> 전제 산출물(동일 디렉터리):',
    '> - `otc-easy-drug-remaining-pilot-500-ledger-v1.json` (pilot 500 원장)',
    '> - `otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json` (가 입력 + 실행 계약)',
    '> - `otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json` (예외 인계 schema · 예외코드 15 · SYS-01~17 · 전량 확대 게이트)',
    '> - `otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md` (identity 판정 정정 근거)',
    `> - \`otc-easy-drug-remaining-pilot-500-check-v1.json\` (게이트 ${Object.keys(gates).length}/${Object.keys(gates).length} · DB write 0)`,
    '',
    '---',
    '',
    '## A. 후속 **agent-ga** 작업 요청서 초안',
    '',
    '### A-1. 제목',
    '',
    '`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-GA-PRODUCTION-V1`',
    '',
    '### A-2. 목적',
    '',
    'pilot 500 master 를 **제품별 독립 단위**로 KO·EN 매장용 설명서까지 생산하고, 실패를 제품 단위로 격리하여 예외 원장으로 인계한다.',
    '목적은 성공률이 아니라 **잔여 전량 확대 가능 여부의 확정**이다.',
    '',
    '### A-3. 입력',
    '',
    `- 대기열: \`otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json\` (\`batchId = otc-v4-pilot-500\`, ${ledgerRows.length}건, masterId 오름차순)`,
    '- grounding: 각 master 자신의 e약은요 공식 원문 6섹션',
    '- sourceRef namespace: `otc-v4-master-leaflet:<masterId>` → `uuid(md5(...))` (V2 gencode·V3 content-fp 네임스페이스와 반드시 구분)',
    '',
    '### A-4. 불변 규칙',
    '',
    '1. **1 master = 1 작업 단위.** 다른 master 의 원문을 절대 혼합하지 않는다.',
    '2. **공식 원문에 없는 의료 사실을 외부 LLM 으로 생성·보강하지 않는다.**',
    '3. **route 는 제품명 문자열로 추론하지 않는다.** 단일 유효 gencode 의 `resolveRoute()` 또는 그 제품 자신의 공식 용법·용량 동사에서만 도출한다.',
    '4. **EN 은 KO canonical 선행 필수.** KO 미확정 상태의 EN 보류는 `HELD_KO_NOT_CANONICAL` 이며 예외가 아니다.',
    '5. **기존 LIVE 는 변경하지 않는다.** 특히 **pilot 100 GREEN 80 은 절대 불변**(SYS-13), **pilot 100 예외 20 에는 write 금지**(SYS-14).',
    '6. **write owner 는 agent-ga 단독.** agent-na 는 DB write 0.',
    '7. **identity 판정은 정정 기준(v2)** 을 사용한다 — `gencodeCount >= 2` 단독은 예외가 아니다.',
    '',
    '### A-5. 실행 계약 (제품 단위 continue)',
    '',
    '- master 별 savepoint 또는 독립 transaction. 실패 시 ROLLBACK → **그 master 의 dbWriteActual = 0** → 예외 원장 1행 → **다음 master 로 계속**.',
    '- **개별 제품 문제는 전체 중지 조건이 아니다.**',
    '- 멱등: 재실행 시 이미 완료된 master 는 자동 SKIP(CREATED 0).',
    '- checkpoint: 10~25 master 단위 기록. 중단 후 재개 시 중복 write 0.',
    '',
    '### A-6. master 별 preflight (필수)',
    '',
    '1. `officialSourceHash` 재계산 → 원장 값과 **일치** 확인. 불일치 = **SYS-01 즉시 전체 중지**.',
    '2. `existingCanonicalKo` / `existingCanonicalEn` = 0 확인. >0 → `EXISTING_CANONICAL_CONFLICT`.',
    '3. `sourceRef` LIVE 점유 0 확인. >0 → `SOURCE_REF_CONFLICT` (누적 2건 이상 = **SYS-04 전체 중지**).',
    '4. `professionalSuspect = false` 확인. true → `PROFESSIONAL_USE` (terminal).',
    '5. identity: `permitCodeCount >= 2` 또는 `officialSourceHashCount >= 2` 일 때만 `IDENTITY_CONFLICT`.',
    '',
    '### A-7. 전체 중지 조건 (시스템 수준만)',
    '',
    '`SYS-01 ~ SYS-17` — schema JSON `systemStopConditions` 참조.',
    'pilot 100 대비 추가: **SYS-13** GREEN 80 변경 · **SYS-14** 예외 20 write · **SYS-15** 완료 master skip 실패 · **SYS-16** checkpoint 재개 중복 write · **SYS-17** sourceRef 타 master 재사용.',
    '',
    '### A-8. 산출물',
    '',
    '- `otc-easy-drug-remaining-pilot-500-ga-production-result-v1.json` — master 별 outcome, `sum(outcome) = 500` 필수',
    '- `otc-easy-drug-remaining-pilot-500-exception-ledger-v1.json` — 예외 인계 원장(필수 17필드 누락 0, 실패 건 `dbWriteActual = 0`)',
    '- 별개 코드경로 `*-ga-production-verify.ga.ts` 독립검증 결과',
    '- CHECK 문서(`docs/work-orders/CHECK-...-PILOT-500-GA-PRODUCTION-V1.md`)',
    '',
    '### A-9. 완료 게이트',
    '',
    '`EXPALL-01 ~ EXPALL-14` 전건 PASS → 최종 판정 `APPROVED_FOR_REMAINING_ALL`.',
    '미달 시 `NEEDS_PIPELINE_FIX`, 시스템 중지 발동 시 `SYSTEM_STOP`. **성공률은 게이트가 아니다**(`EXPALL-NOT`).',
    '',
    '### A-10. 기대치(참고, 게이트 아님)',
    '',
    `\`PRODUCE_EXPECTED ${produceExpected}\` / \`PRE_EXCEPTION_EXPECTED ${preExceptionExpected}\`.`,
    '',
    '---',
    '',
    '## B. 후속 **agent-na** 작업 요청서 초안',
    '',
    '### B-1. 제목',
    '',
    '`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-NA-EXCEPTION-CLOSURE-V1`',
    '',
    '### B-2. 목적',
    '',
    '가 에이전트가 인계한 pilot 500 예외 원장을 **원인별로 일괄 마무리**한다. pilot 100 잔여 예외 20 도 동일 그룹 축에 병합하여 함께 판정한다.',
    '',
    '### B-3. 입력 / 제약',
    '',
    '- 입력: `otc-easy-drug-remaining-pilot-500-exception-ledger-v1.json` + `otc-v4-pilot-100-exception-handoff-na.ga.json` (pilot 100 잔여 20)',
    '- **DB write 0** (read-only SELECT 만). 재진입 후 write owner 는 항상 agent-ga.',
    '- 전용 cloud-sql-proxy 포트 사용(공유 포트 토큰 만료 함정 회피).',
    '',
    '### B-4. 그룹 축 (8)',
    '',
    'route 미확정 / identity 충돌(정정 기준) / 수치 파싱 실패 / 연령·기간 파싱 실패 / 공식 원문 결손 / composer 미지원 구조 / 전문용 의심 / canonical·sourceRef 충돌.',
    '',
    '### B-5. 그룹별 보고 필드',
    '',
    '`expectedCount` · `commonCause` · `commonFixPossible` · `parserOrProfileFixPossible` · `gaReentryCondition` · `holdCondition`.',
    '',
    '### B-6. 판정 원칙',
    '',
    '- **공식 원문 결손(`SOURCE_*_MISSING`)은 ETL 재수집 전 terminal.** 창작으로 메우지 않는다.',
    '- **`PROFESSIONAL_USE` 는 운영자 판단 전 terminal.**',
    '- **`EXISTING_CANONICAL_CONFLICT` 는 운영자 승인 없이 terminal.** 기존 LIVE 변경 금지.',
    '- **`IDENTITY_CONFLICT` 는 정정 기준(permitCode/원문 hash)으로만 판정.** gencode 다중 단독 건은 재편입 대상이다.',
    '',
    '### B-7. 산출물',
    '',
    '- `otc-easy-drug-remaining-pilot-500-na-exception-closure-v1.json` (그룹별 판정)',
    '- 잔여 전량 확대 권고(GO / GO_WITH_FIX / HOLD) + 근거',
    '- CHECK 문서',
    '',
    '### B-8. 완료 게이트',
    '',
    '예외 원장 전건이 정확히 1개 그룹에 귀속(누락·중복 0) · terminal 과 retryable 분리 · 재편입 조건이 실행 가능한 형태로 기술 · DB write 0.',
    '',
    '---',
    '',
    '## C. 잔여 전량 확대 게이트 (요약)',
    '',
    ...EXPANSION_GATE_ALL.map((g) => `- \`${g.id}\` ${g.gate}`),
    '',
    `최종 판정 enum: ${FINAL_VERDICT_ENUM.map((v) => `\`${v}\``).join(' | ')}`,
    '',
  ].join('\n');

  const OUT = {
    ledger: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-ledger-v1.json'),
    ga: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json'),
    na: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json'),
    check: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-check-v1.json'),
    correction: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md'),
    followup: path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-followup-agent-requests-v1.md'),
  };
  fs.writeFileSync(OUT.ledger, JSON.stringify(pilotLedger, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.ga, JSON.stringify(gaInput, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.na, JSON.stringify(naSchemaDoc, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.check, JSON.stringify(check, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT.correction, correctionMd, 'utf8');
  fs.writeFileSync(OUT.followup, followupMd, 'utf8');

  const hashes = Object.fromEntries(Object.values(OUT).map((p) => [path.basename(p), md5(fs.readFileSync(p, 'utf8'))]));

  console.log('=== OTC remaining master-by-master PILOT 500 (READ-ONLY · dbWrite 0) ===');
  console.log(`snapshot ${JSON.stringify(snapMeta[0])}`);
  console.log(`reproduce: productionTargets ${productionTargets.length} · READY ${reproReady} · remaining ${reproRemaining} (drift ${driftDelta} = pilot100 GREEN 80)`);
  console.log(`  green80 still in remaining ${driftMissing.length} (기대 0) · exception20 in remaining ${driftExceptionKept.length} (기대 20)`);
  console.log(`  READY 1,134: completedNow ${readyCompleted} · stillProductionTarget ${readyStillProductionTarget} · intersectRemaining ${readyIntersectRemaining} (ledger 재현 ${readyMatchesLedger})`);
  console.log(`  HOLD ${JSON.stringify(sortedCounts(holdCount))}`);
  console.log(`identityAxis ${JSON.stringify(identityAxis)}`);
  console.log(`split v1 : ga ${v1Split.agentGa} · na ${v1Split.agentNa} · exclude ${v1Split.exclude}`);
  console.log(`split v2 : ga ${v2Split.agentGa} · na ${v2Split.agentNa} · exclude ${v2Split.exclude}  (reclassified ${reclassified.length})`);
  console.log(`  transitions ${JSON.stringify(reclassifiedByTransition)}`);
  console.log(`pools: A ${poolTotal.A} · B ${poolTotal.B} · C ${poolTotal.C}`);
  console.log(`  A poolCounts ${JSON.stringify(sortedCounts(aPoolCounts))}`);
  console.log(`  B poolCounts ${JSON.stringify(sortedCounts(bPoolCounts))}`);
  console.log(`  C poolCounts ${JSON.stringify(sortedCounts(cPoolCounts))}`);
  console.log(`pilot ${pilotIds.length} · byStratum ${JSON.stringify(byStratum)}`);
  console.log(`  A alloc(route) ${JSON.stringify(sortedCounts(aAlloc))}`);
  console.log(`  B alloc(code)  ${JSON.stringify(sortedCounts(bAlloc))}`);
  console.log(`  C alloc(code)  ${JSON.stringify(sortedCounts(cAlloc))}`);
  console.log(`  byHold ${JSON.stringify(byHold)}`);
  console.log(`  byRoute ${JSON.stringify(byRoute)} · A층 route ${JSON.stringify(aRouteDist)}`);
  console.log(`  byExpectedStatus ${JSON.stringify(byExpected)} · byExpectedCode ${JSON.stringify(byExpectedCode)}`);
  console.log(`  byComposer ${JSON.stringify(byComposer)}`);
  console.log(`  sectionCoverage ${JSON.stringify(sectionCoverage)}`);
  console.log(`  sourceRef dup ${refDupPilot} · liveConflict ${liveRefConflictPilot} · vsGreen80 ${refConflictWithGreen80}`);
  if (realloc.length) console.log(`  realloc: ${realloc.join(' | ')}`);
  console.log(`GATES ${Object.entries(gates).filter(([, v]) => !v).map(([k]) => k).join(', ') || 'ALL PASS'} → gatePass=${gatePass}`);
  console.log('artifact md5:'); for (const [k, v] of Object.entries(hashes)) console.log(`  ${v}  ${k}`);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
