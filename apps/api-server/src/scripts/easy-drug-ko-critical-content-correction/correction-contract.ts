/**
 * WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1 — 공용 계약 (조회·계산 전용, DB write 0)
 *
 * 선행 감사: WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1 (commit 2deeb8e73)
 *   → `../easy-drug-ko-source-consistency-audit/results/verdict-index.jsonl`
 *   에서 `KO_WRONG_ATTRIBUTION` · `KO_CONTRADICTED` 대조단위를 1차 대상으로 읽는다.
 *
 * ── 불변 계약 (WO 처리원칙 1~10) ──────────────────────────────────────────────
 *   1. grounding 은 **해당 제품 자기 e약은요 공식 원문**뿐이다.
 *      원천 = product_candidates.raw_payload->'officialConsumerText' (itemSeq 로 직접 귀속).
 *   2. 다른 제품·성분군·ATC 설명서 재사용 0. 대표저작·union 0.
 *   3. 숫자 부분 치환 0 — 섹션 단위로 **재조립**한다.
 *   4. 재조립은 검증된 V4 제품별 composer(`composeKoV4`)를 그대로 쓴다.
 *      → 수치보존 게이트·경로동사 게이트·타 제품 허가코드 혼입 검사 승계.
 *   5. 원문 필수 섹션(효능·효과 / 용법·용량) 부재 또는 anomaly 발생 시 HOLD(비노출).
 *   7. 기존 오류본은 물리 삭제하지 않고 `status='deprecated'` 로 강등해 보존한다.
 *      (저장소 선례 = hff-lut31-retire-replace-apply.ts / OTC easy→authored 강등)
 *   8. EN·zh·ja write 0.
 *   10. product_masters write 0. 신규 행의 source_ref_id 는 **은퇴 행에서 승계**한다
 *       (sourceRef 신규 산식 도입 0 = "sourceRef 변경 0").
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { composeKoV4, type MasterIdentity } from '../otc-v4-master-leaflet-composer.ga.js';
import { resolveRouteForMaster, CONTENT_SECTIONS } from '../otc-v4-master-leaflet-contract.ga.js';

export const WO = 'WO-O4O-EASY-DRUG-KO-CRITICAL-CONTENT-CORRECTION-V1';
export const AUDIT_WO = 'WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1';
export const AUDIT_COMMIT = '2deeb8e73';
/** 1차 시정 대상 판정. 감사 판정 우선순위상 이 둘이 "현재 잘못된 정보가 노출 중" 인 등급이다. */
export const TARGET_VERDICTS = ['KO_WRONG_ATTRIBUTION', 'KO_CONTRADICTED'] as const;
export const RETIRED_STATUS = 'deprecated';

export const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const RESULTS_DIR = path.join(HERE, 'results');
export const VERDICT_INDEX = path.join(
  HERE, '..', 'easy-drug-ko-source-consistency-audit', 'results', 'verdict-index.jsonl',
);

export const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

// ── 대상 원장 ────────────────────────────────────────────────────────────────────
export interface TargetUnit { itemSeq: string; contentMd5: string; verdict: string; sourceType: string; nMaster: number }

/** 감사 산출 verdict-index 에서 1차 대상 대조단위를 읽는다. 감사 산출물은 읽기 전용. */
export function loadTargets(): TargetUnit[] {
  const rows = fs.readFileSync(VERDICT_INDEX, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const t = rows.filter((r: any) => (TARGET_VERDICTS as readonly string[]).includes(r.verdict));
  const key = new Set(t.map((r: any) => `${r.itemSeq}|${r.contentMd5}`));
  if (key.size !== t.length) throw new Error(`STOP: 대상 (itemSeq,md5) 중복 — unique ${key.size}/${t.length}`);
  return t.map((r: any) => ({
    itemSeq: r.itemSeq, contentMd5: r.contentMd5, verdict: r.verdict,
    sourceType: r.sourceType, nMaster: r.nMaster,
  }));
}

// ── 공식 원문 6섹션 ──────────────────────────────────────────────────────────────
/**
 * e약은요 raw_payload 의 officialConsumerText 키 → V4 composer 가 기대하는 6섹션 이름.
 * 저장방법(storage)은 CONTENT_SECTIONS 에 없으므로 카드 본문에 넣지 않는다(V3/V4 계약과 동일).
 */
export const OCT_TO_SECTION: Record<string, (typeof CONTENT_SECTIONS)[number]> = {
  efficacy: '효능·효과',
  usage: '용법·용량',
  warning: '경고',
  caution: '사용상 주의사항',
  sideEffect: '이상반응',
  interaction: '상호작용',
};

/** officialConsumerText → 6섹션 raw 맵. 누락 섹션은 ''. 값 가공 0(공백 트림만). */
export function sixSectionsFromOct(oct: Record<string, unknown> | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) out[k] = '';
  if (!oct) return out;
  for (const [src, dst] of Object.entries(OCT_TO_SECTION)) {
    const v = oct[src];
    if (typeof v === 'string' && v.trim()) out[dst] = v.trim();
  }
  return out;
}

// ── 제품별 재조립 ────────────────────────────────────────────────────────────────
export interface MasterRow {
  masterId: string;
  productName: string;
  itemSeq: string;
  permitCodeCount: number;
  gencodes: string[];
  classKinds: string[];
  dosageForm: string | null;
  /** 현재 노출 중인 오류 canonical */
  descId: string;
  descSourceType: string;
  descSourceRefId: string | null;
  descSummary: string | null;
  contentMd5: string;
  verdict: string;
  oct: Record<string, unknown> | null;
}

export type HoldCode =
  | 'SOURCE_EFFICACY_MISSING' | 'SOURCE_DOSAGE_MISSING'
  | 'ROUTE_UNRESOLVED' | 'ROUTE_CONFLICT'
  | 'PROFESSIONAL_USE' | 'IDENTITY_CONFLICT'
  | 'COMPOSE_ANOMALY' | 'BUILD_INCOMPLETE' | 'NO_CHANGE';

export interface CorrectionPlanRow {
  masterId: string;
  itemSeq: string;
  productName: string;
  verdict: string;
  route: string | null;
  routeSource: string | null;
  oldDescId: string;
  oldMd5: string;
  oldSourceType: string;
  sourceRefId: string | null;
  newMd5: string | null;
  newHtml: string | null;
  newSummary: string | null;
  officialSectionPresence: Record<string, 0 | 1>;
  anomalies: string[];
  holdCode: HoldCode | null;
  action: 'REPLACE' | 'HOLD';
}

const isProfessional = (kinds: string[]): boolean => kinds.some((k) => k.includes('전문'));

/** 제품 1건 재조립. 원문·identity 결손이나 composer anomaly 는 전부 HOLD 로 떨어뜨린다(부분 수정 금지). */
export function planMaster(m: MasterRow): CorrectionPlanRow {
  const sec = sixSectionsFromOct(m.oct);
  const presence = Object.fromEntries(
    CONTENT_SECTIONS.map((k) => [k, sec[k] ? 1 : 0]),
  ) as Record<string, 0 | 1>;
  const gencode = m.gencodes.length === 1 ? m.gencodes[0] : null;
  const rr = resolveRouteForMaster(gencode, m.gencodes.length, sec['용법·용량'] || '');

  const base = {
    masterId: m.masterId, itemSeq: m.itemSeq, productName: m.productName, verdict: m.verdict,
    route: rr.route, routeSource: rr.source,
    oldDescId: m.descId, oldMd5: m.contentMd5, oldSourceType: m.descSourceType,
    sourceRefId: m.descSourceRefId,
    officialSectionPresence: presence,
  };
  const hold = (holdCode: HoldCode, anomalies: string[]): CorrectionPlanRow => ({
    ...base, newMd5: null, newHtml: null, newSummary: null, anomalies, holdCode, action: 'HOLD',
  });

  if (!sec['효능·효과']) return hold('SOURCE_EFFICACY_MISSING', ['공식 원문 효능·효과 부재']);
  if (!sec['용법·용량']) return hold('SOURCE_DOSAGE_MISSING', ['공식 원문 용법·용량 부재']);
  if (isProfessional(m.classKinds)) return hold('PROFESSIONAL_USE', [`전문일반구분: ${m.classKinds.join('/')}`]);
  if (m.permitCodeCount > 1) return hold('IDENTITY_CONFLICT', [`품목기준코드 ${m.permitCodeCount}건 다중 연결`]);
  if (!rr.route) return hold(rr.exceptionCode ?? 'ROUTE_UNRESOLVED', [rr.detail ?? 'route 확정 불가']);

  const identity: MasterIdentity = {
    masterId: m.masterId,
    productName: m.productName,
    permitCode: m.itemSeq,
    gencode,
    gencodeCount: m.gencodes.length,
    dosageForm: m.dosageForm,
    route: rr.route,
  };
  const r = composeKoV4(sec, identity);
  if (r.anomalies.length) return hold(r.build.html ? 'COMPOSE_ANOMALY' : 'BUILD_INCOMPLETE', r.anomalies);
  if (!r.build.html) return hold('BUILD_INCOMPLETE', [`필수필드 누락 ${r.build.missing.join(',')}`]);

  const newMd5 = md5(r.build.html);
  if (newMd5 === m.contentMd5) return hold('NO_CHANGE', ['재조립 결과가 기존 오류본과 동일 — 시정 효과 없음']);

  const summary = r.source.efficacy.split('\n')[0]?.slice(0, 200) || null;
  return { ...base, newMd5, newHtml: r.build.html, newSummary: summary, anomalies: [], holdCode: null, action: 'REPLACE' };
}

// ── DB 접속 (read/write 양쪽에서 공용) ────────────────────────────────────────────
export interface Db {
  query: (text: string, params?: unknown[]) => Promise<any[]>;
  destroy: () => Promise<void>;
  pool: any;
}
export function argPort(): number {
  const i = process.argv.indexOf('--port');
  if (i >= 0 && process.argv[i + 1]) return parseInt(process.argv[i + 1], 10);
  return parseInt(process.env.PROXY_PORT || '15441', 10);
}
/** cloud-sql-proxy 경유 접속. 자격증명 값은 읽지도 출력하지도 않는다(env 위임). */
export async function connect(): Promise<Db> {
  const pg = await import('pg');
  const Pool = (pg as any).Pool || (pg as any).default?.Pool;
  const pool = new Pool({
    host: '127.0.0.1',
    port: argPort(),
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000,
    max: 4,
  });
  return {
    query: async (text: string, params?: unknown[]) => (await pool.query(text, params)).rows,
    destroy: async () => { await pool.end(); },
    pool,
  };
}

/**
 * 대상 대조단위에 걸린 ProductMaster 를 실측 조회한다. write 0.
 * 대상 식별은 (itemSeq, md5(content)) 쌍으로 한다 — itemSeq 만으로 조으면
 * 같은 허가품목 안의 **정상 본문**(포장군 내 본문 분기 21단위)까지 끌려온다.
 */
export async function fetchTargetMasters(db: Db, targets: TargetUnit[]): Promise<MasterRow[]> {
  const seqs = [...new Set(targets.map((t) => t.itemSeq))];
  const pairKey = new Map(targets.map((t) => [`${t.itemSeq}|${t.contentMd5}`, t]));

  const rows = await db.query(`
    WITH lk AS (
      SELECT pi.product_master_id AS master_id, pi.normalized_value AS item_seq
      FROM product_identifiers pi
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
        AND pi.normalized_value = ANY($1::text[])
    ),
    pcnt AS (
      SELECT product_master_id AS master_id, count(DISTINCT normalized_value)::int n
      FROM product_identifiers
      WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL
      GROUP BY 1
    ),
    std AS (
      SELECT pi.product_master_id AS master_id,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) class_kinds,
             min(NULLIF(pc.raw_payload->'source'->>'제형','')) dosage_form
      FROM product_identifiers pi
      JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
        AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      GROUP BY 1
    ),
    ed AS (
      SELECT normalized_identifier_value AS item_seq, raw_payload->'officialConsumerText' AS oct
      FROM product_candidates
      WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
        AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
        AND normalized_identifier_value = ANY($1::text[])
    )
    SELECT lk.master_id::text "masterId", pm.name "productName", lk.item_seq "itemSeq",
           COALESCE(pcnt.n, 1) "permitCodeCount",
           COALESCE(std.gencodes, '{}') "gencodes",
           COALESCE(std.class_kinds, '{}') "classKinds",
           std.dosage_form "dosageForm",
           sd.id::text "descId", sd.source_type "descSourceType",
           sd.source_ref_id::text "descSourceRefId", sd.summary "descSummary",
           md5(sd.content) "contentMd5", ed.oct "oct"
    FROM lk
    JOIN product_masters pm ON pm.id = lk.master_id
    JOIN shared_product_descriptions sd ON sd.master_id = lk.master_id
      AND sd.deleted_at IS NULL AND sd.description_type='STORE'
      AND COALESCE(sd.language,'ko')='ko' AND sd.status='canonical'
    LEFT JOIN pcnt ON pcnt.master_id = lk.master_id
    LEFT JOIN std ON std.master_id = lk.master_id
    LEFT JOIN ed ON ed.item_seq = lk.item_seq
    ORDER BY 1`, [seqs]);

  const out: MasterRow[] = [];
  for (const r of rows as any[]) {
    const t = pairKey.get(`${r.itemSeq}|${r.contentMd5}`);
    if (!t) continue; // 같은 허가품목의 정상 본문 — 대상 아님
    out.push({ ...r, verdict: t.verdict });
  }
  return out;
}
