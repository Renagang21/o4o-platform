/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1
 *   — V4 제품별(master-by-master) 생산 공용 계약 (에이전트 가)
 *
 * 선행: WO-...-PILOT-100-QUEUE-V1 (commit 324823745, 에이전트 라, READ-ONLY)
 *
 * ── V4 가 V3 와 다른 점 ────────────────────────────────────────────────────────────
 *   V3 = content fingerprint 단위(동일 원문 다수 master 를 1건으로 저작).
 *   V4 = **master 1건 = 독립 저작 단위**. 대표값·union 금지. sourceRef 도 master 별로 유일.
 *
 * ⚠️ 불변 계약:
 *   - grounding 은 해당 master 자기 e약은요 공식 원문 6섹션뿐이다. 타 master 원문 혼입 0.
 *   - 공식 원문에 없는 의료 사실 생성 0.
 *   - sourceRef = uuid(md5('otc-v4-master-leaflet:' + masterId)) — la 원장 `plannedSourceRef` 와 동일 산식.
 *   - 섹션 파서 · normalize · md5 는 la census/queue 와 **byte-identical**.
 *   - 본 모듈에는 어떤 DB write 도 없다(조회·계산 전용).
 *
 * 접속: Cloud SQL Auth Proxy(기본 127.0.0.1:5493, --auto-iam-authn, user o4o_api).
 *       자격증명 값을 읽거나 출력하지 않는다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalize, resolveRoute, ROUTE_PROFILE, AUTHORED_SOURCES } from './otc-v2-store-leaflet-runner.shared.js';

export const WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1';
export const QUEUE_WO = 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1';
export const BATCH_ID = 'otc-v4-pilot-100';
export const AUTHORED_SOURCE_V4 = 'mfds_drug_otc';

export const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
export const PILOT_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json');
export const GA_INPUT = path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json');

export const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
export const H = (s: string): string => md5(s).slice(0, 16);

/** la census/queue VERBATIM — 공식 원문 HTML 섹션(제목→본문) 파싱. */
export function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}

export const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
export const MANDATORY_SECTIONS = ['효능·효과', '용법·용량'] as const;
export const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
export const COMPOSER_ROUTES = new Set(['oral', 'oromucosal', 'ophthalmic', 'topical', 'vaginal']);

/** master 원문 → 6 섹션 raw 맵(정규화 전). 누락 섹션은 ''. */
export function sixSectionsRaw(content: string): Record<string, string> {
  const sec = sections(content);
  const out: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) out[k] = sec[k] || '';
  return out;
}

/** V4 sourceRef — la queue `masterRefV4` VERBATIM. V2(gencode fp) · V3(content fp) 와 namespace 분리. */
export function masterRefV4(masterId: string): string {
  const h = md5('otc-v4-master-leaflet:' + masterId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── route 추론(la queue VERBATIM) ────────────────────────────────────────────────────
const DOSAGE_ROUTE_VERBS: Array<{ route: string; re: RegExp }> = [
  { route: 'ophthalmic', re: /점안|점적|눈\s*에|결막낭|안구\s*에/ },
  { route: 'vaginal', re: /질\s*(내|강|안|점막)|질\s*에\s*(삽입|넣|투입)|질\s*세척|질\s*세정|질\s*깊숙/ },
  { route: 'oromucosal', re: /설하|혀\s*밑|가글|트로키|로젠지|구강\s*청결|물고\s*있|(머금|헹구|양치)[^.]{0,12}(뱉|밷|배출)|구강\s*점막\s*에\s*(부착|붙|바르|도포)|입\s*안[^.]{0,15}(붙이|부착|바르|도포)/ },
  { route: 'topical', re: /바르|발라|도포|문질러|붙이|부착|환부|피부\s*에|국소\s*에|뿌리|분무|점막\s*에\s*바/ },
  { route: 'oral', re: /복용|먹|삼키|마시|섭취|식후|식전|식간|취침\s*(전|시)?\s*복용|물과\s*함께|씹어\s*(먹|복용)|공복|(?<!비)경구/ },
];
export function routeFromDosageText(dos: string): { route: string; families: string[] } {
  const t = normalize(dos);
  const hit = DOSAGE_ROUTE_VERBS.filter((f) => f.re.test(t)).map((f) => f.route);
  const families = [...new Set(hit)];
  const nonOral = families.filter((r) => r !== 'oral');
  if (nonOral.length === 1) return { route: nonOral[0], families };
  if (nonOral.length >= 2) return { route: 'conflict', families };
  if (families.includes('oral')) return { route: 'oral', families };
  return { route: 'unknown', families };
}

/**
 * master 단위 route 확정. gencode 1순위 → 공식 용법 원문 2순위. 제품명 추론 금지.
 * 확정 불가 시 route=null + exceptionCode 를 돌려준다(임의 선택 금지).
 */
export function resolveRouteForMaster(
  gencode: string | null,
  gencodeCount: number,
  dosageRaw: string,
): { route: string | null; source: string | null; exceptionCode: 'ROUTE_UNRESOLVED' | 'ROUTE_CONFLICT' | null; detail: string | null; families: string[] } {
  const gencodeReason = gencodeCount === 1 && gencode ? resolveRoute(gencode).reason : 'gencode 부재';
  if (gencodeCount === 1 && gencode) {
    const rr = resolveRoute(gencode);
    if (rr.ok && COMPOSER_ROUTES.has(rr.route)) return { route: rr.route, source: 'gencode', exceptionCode: null, detail: null, families: [rr.route] };
  }
  const inf = routeFromDosageText(dosageRaw || '');
  if (inf.route !== 'unknown' && inf.route !== 'conflict' && COMPOSER_ROUTES.has(inf.route)) {
    return { route: inf.route, source: 'dosage_text', exceptionCode: null, detail: null, families: inf.families };
  }
  if (inf.route === 'conflict') {
    return { route: null, source: null, exceptionCode: 'ROUTE_CONFLICT', detail: `공식 용법 원문 다중 경로 동사: ${inf.families.join('/')} (gencode ${gencodeReason})`, families: inf.families };
  }
  const code = gencodeReason?.startsWith('external_site_ambiguous') ? 'ROUTE_CONFLICT' : 'ROUTE_UNRESOLVED';
  return { route: null, source: null, exceptionCode: code, detail: `gencode ${gencodeReason}, 공식 용법 원문에서 경로 동사 미검출`, families: inf.families };
}

// ── pilot 원장 로더 ────────────────────────────────────────────────────────────────
export interface PilotMaster {
  masterId: string;
  permitCode: string | null;
  permitCodeCount: number;
  productName: string;
  specification: string | null;
  stratum: 'A_NORMAL' | 'B_BOUNDARY' | 'C_SOURCE_COMPOSER';
  sourceHoldClass: 'HOLD_IDENTITY' | 'HOLD_ROUTE' | 'HOLD_SOURCE';
  gencode: string | null;
  gencodeCount: number;
  classKinds: string[];
  atcCode: string | null;
  dosageForm: string | null;
  strength: string | null;
  professionalSuspect: boolean;
  professionalSuspectReason: string | null;
  candidateRoute: string | null;
  candidateRouteSource: string | null;
  officialSourceLink: string;
  officialSourceHash: string | null;
  officialSectionPresence: Record<string, 0 | 1>;
  officialSectionCount: number;
  numericProfile: { digitTokens: number; hasUnicodeFraction: boolean; hasAgeToken: boolean; hasDurationToken: boolean };
  composerFeasibility: string;
  existingAuthoredKoCanonical: number;
  existingEnCanonical: number;
  plannedSourceRef: string;
  sourceRefLiveConflict: number;
  expectedStatus: 'PRODUCE_EXPECTED' | 'PRE_EXCEPTION_EXPECTED';
  expectedExceptionCode: string | null;
  queue: string;
}

/** pilot 100 원장 로드(masterId 오름차순 고정). 원장 파일은 읽기 전용 — 수정 금지. */
export function loadPilot(): PilotMaster[] {
  const j = JSON.parse(fs.readFileSync(PILOT_LEDGER, 'utf8'));
  const rows = (j.masters as PilotMaster[]).slice().sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));
  if (rows.length !== 100) throw new Error(`STOP: pilot 원장 ${rows.length} != 100`);
  const uniq = new Set(rows.map((r) => r.masterId));
  if (uniq.size !== 100) throw new Error(`STOP: pilot master 중복 — unique ${uniq.size}`);
  for (const r of rows) {
    if (r.plannedSourceRef !== masterRefV4(r.masterId)) throw new Error(`STOP: ${r.masterId} sourceRef 산식 불일치`);
  }
  return rows;
}

// ── DB 접속 (pg.Pool 직접 — V3 계약 VERBATIM 사유) ──────────────────────────────────
export interface Db {
  query: (text: string, params?: unknown[]) => Promise<any[]>;
  destroy: () => Promise<void>;
  pool: any;
}
export async function connect(): Promise<Db> {
  // ⚠️ apps/api-server/.env 는 로컬 개발용(o4o_user@localhost:5432)이라 프록시 접속에 쓰면 SASL 실패한다.
  //    프로덕션 read/write 는 cloud-sql-proxy(--auto-iam-authn) + o4o_api 고정이므로 env 를 따르지 않는다.
  const i = process.argv.indexOf('--port');
  const port = i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : parseInt(process.env.PROXY_PORT || '5493', 10);
  const pg = await import('pg');
  const Pool = (pg as any).Pool || (pg as any).default?.Pool;
  const pool = new Pool({
    host: '127.0.0.1',
    port,
    user: 'o4o_api',
    database: process.env.DB_NAME || 'o4o_platform',
    statement_timeout: 900000,
    max: 4,
  });
  return {
    query: async (text: string, params?: unknown[]) => (await pool.query(text, params)).rows,
    destroy: async () => { await pool.end(); },
    pool,
  };
}

// ── master 실측 상태 조회 (read-only) ────────────────────────────────────────────────
export interface MasterLive {
  masterId: string;
  productName: string | null;
  easyContent: string | null;
  gencodes: string[];
  classKinds: string[];
  slot: { easyKoCanon: number; authoredKoCanon: number; authoredKoAny: number; enCanon: number };
}

/** la queue VERBATIM 조인으로 pilot master 실측 상태를 읽는다. write 0. */
export async function fetchMasterLive(db: Db, ids: string[]): Promise<Map<string, MasterLive>> {
  const nameRows = await db.query(
    `SELECT id::text mid, name FROM product_masters WHERE id = ANY($1::uuid[]) ORDER BY 1`, [ids]);
  const stdRows = await db.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) class_kinds
    FROM product_identifiers pi
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1 ORDER BY 1`, [ids]);
  const easyRows = await db.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids]);
  const slotRows = await db.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::int easy,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::int authoredcanon,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::int authoredany,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::int encanon
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [ids, AUTHORED_SOURCES as unknown as string[]]);

  const nameBy = new Map(nameRows.map((r: any) => [r.mid, r.name]));
  const stdBy = new Map(stdRows.map((r: any) => [r.mid, r]));
  const easyBy = new Map(easyRows.map((r: any) => [r.id, r.content]));
  const out = new Map<string, MasterLive>();
  for (const r of slotRows as any[]) {
    const std = stdBy.get(r.mid) as any;
    out.set(r.mid, {
      masterId: r.mid,
      productName: nameBy.get(r.mid) ?? null,
      easyContent: easyBy.get(r.mid) ?? null,
      gencodes: ((std?.gencodes || []) as string[]).filter(Boolean).slice().sort(),
      classKinds: ((std?.class_kinds || []) as string[]).filter(Boolean).slice().sort(),
      slot: { easyKoCanon: r.easy, authoredKoCanon: r.authoredcanon, authoredKoAny: r.authoredany, enCanon: r.encanon },
    });
  }
  return out;
}

export { normalize, resolveRoute, ROUTE_PROFILE, AUTHORED_SOURCES };
