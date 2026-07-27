/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — V3 공용 계약 (에이전트 가)
 *
 * 목적: ophthalmic-unit-1(253 master / 26 content fingerprint) 을 content-fingerprint V3 기준으로
 *       재현·저작·검증하기 위한 **순수 계약 모듈**. reproduce · executor · verifier 세 스크립트가
 *       동일한 fp 산식·섹션 파서·sourceRef 산식·DB 조회를 공유하도록 한 곳에 둔다(산식 drift 0).
 *
 * ⚠️ 불변 계약:
 *   - fp 산식 / sections() / normalize / contentFpToUuid 는 `la` census
 *     (otc-easy-drug-ready-1134-content-fingerprint-census.la.ts) 와 **byte-identical** 이어야 한다.
 *   - 공용 러너(otc-v2-store-leaflet-runner.shared.ts) 와 점안 GREEN 프로파일
 *     (otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts) 은 **import 만** 한다 — 수정 금지.
 *   - LIVE DB write 0. 이 모듈에는 어떤 write 도 없다(조회·계산 전용).
 *   - 자격증명 값을 읽거나 출력하지 않는다. process.env 로만 전달한다.
 *
 * 접속: Cloud SQL Auth Proxy (기본 127.0.0.1:5455, --auto-iam-authn, user o4o_api). env override 가능.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  normalize,
  resolveRoute,
  BLOCKED_MASTER_IDS,
  AUTHORED_SOURCES,
} from './otc-v2-store-leaflet-runner.shared.js';

// ── census VERBATIM: 해시 · 섹션 파서 · fp · sourceRef ───────────────────────────────
export const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
export const H = (s: string): string => md5(s).slice(0, 16);

/** census-v2/la census VERBATIM — 공식 원문 HTML 섹션(제목→본문) 파싱. */
export function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}

/** content fingerprint 축 섹션(순서 고정). la census 와 동일. 저장방법 제외. */
export const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
export const MANDATORY_SECTIONS = ['효능·효과', '용법·용량'] as const;
export const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

/** master 원문 → 섹션별 정규화 해시 벡터. 누락 섹션은 H('')(결정적). la census VERBATIM. */
export function sectionHashVector(sec: Record<string, string>): Record<string, string> {
  const v: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) v[k] = H(normalize(sec[k] || ''));
  return v;
}

/** 신규 content fingerprint. la census VERBATIM. gencode·route + 6개 섹션 정규화 해시. */
export function contentFingerprint(gencode: string, route: string, hv: Record<string, string>): string {
  return H([gencode, route, ...CONTENT_SECTIONS.map((k) => hv[k])].join('|'));
}

/** V3 sourceRef namespace — la census contentFpToUuid VERBATIM. fpToUuidV2(V2) 와 반드시 다르다. */
export function contentFpToUuid(fp: string): string {
  const h = md5('otc-v3-content-leaflet:' + fp);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export { normalize, resolveRoute, BLOCKED_MASTER_IDS, AUTHORED_SOURCES };

export const OPHTHALMIC_ROUTE = 'ophthalmic';
export const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
export const V3_UNIT_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json');
export const V3_SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-content-fingerprint-reapproval-ssot-v1.json');

// ── V3 unit ledger 로더 (ophthalmic-unit-1 슬라이스) ─────────────────────────────────
export interface V3FpEntry {
  fp: string;
  route: string;
  gencode: string;
  size: number;
  sourceRef: string;
  sectionPresence: Record<string, 0 | 1>;
  masterIds: string[];
}
export interface OphthalmicUnit {
  unit: string;
  route: string;
  fpCount: number;
  masterCount: number;
  fingerprints: V3FpEntry[];
  allMasterIds: string[];
}

/** ophthalmic-unit-1 을 V3 unit ledger 에서 읽어온다(정렬 고정). SSOT 파일은 읽기만 한다. */
export function loadOphthalmicUnit(unitName = 'ophthalmic-unit-1'): OphthalmicUnit {
  const ledger = JSON.parse(fs.readFileSync(V3_UNIT_LEDGER, 'utf8'));
  if (ledger.fingerprintKind !== 'content') throw new Error('unit ledger 가 content-fingerprint 원장이 아니다');
  const unit = (ledger.units as any[]).find((u) => u.unit === unitName);
  if (!unit) throw new Error(`unit '${unitName}' 없음`);
  if (unit.route !== OPHTHALMIC_ROUTE) throw new Error(`unit route ${unit.route} != ophthalmic`);
  const fpSet = new Set<string>(unit.fingerprints);
  const fps: V3FpEntry[] = (ledger.fingerprints as V3FpEntry[])
    .filter((f) => fpSet.has(f.fp))
    .map((f) => ({ ...f, masterIds: [...f.masterIds].sort() }))
    .sort((a, b) => (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));
  if (fps.length !== unit.fpCount) throw new Error(`unit fpCount ${unit.fpCount} != ledger 재현 ${fps.length}`);
  const allMasterIds = [...new Set(fps.flatMap((f) => f.masterIds))].sort();
  const masterSum = fps.reduce((t, f) => t + f.size, 0);
  if (masterSum !== unit.masterCount) throw new Error(`unit masterCount ${unit.masterCount} != fp size 합 ${masterSum}`);
  if (allMasterIds.length !== unit.masterCount) throw new Error(`master 중복: unique ${allMasterIds.length} != ${unit.masterCount}`);
  return { unit: unit.unit, route: unit.route, fpCount: unit.fpCount, masterCount: unit.masterCount, fingerprints: fps, allMasterIds };
}

// ── DB 접속 · 조회 (census VERBATIM 조인) — write 0 ──────────────────────────────────
/**
 * 접속 래퍼. **pg.Pool 직접 사용** — TypeORM DataSource 는 빈 문자열 password 를 undefined 로
 * 바꿔 pg SASL('client password must be a string')을 유발한다. --auto-iam-authn 프록시는 빈 문자열
 * password 를 받아야 하므로(검증됨: pw='' OK), TypeORM 을 우회해 pg 에 그대로 넘긴다.
 * query() 는 rows 배열을 돌려준다(retRows 계약과 호환). destroy() 로 풀을 닫는다.
 */
export interface Db {
  query: (text: string, params?: unknown[]) => Promise<unknown[]>;
  destroy: () => Promise<void>;
  pool: any;
}
export async function connect(): Promise<Db> {
  const pg = await import('pg');
  const Pool = (pg as any).Pool || (pg as any).default?.Pool;
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5455', 10),
    user: process.env.DB_USERNAME || 'o4o_api',
    password: process.env.DB_PASSWORD ?? '', // IAM 자동인증 = 빈 문자열(pg 에 string 그대로 전달)
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

const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

export interface MasterState {
  gencodeByMid: Map<string, string | null>;
  contentByMid: Map<string, string>;
  /** 슬롯 상태: easy ko canonical 수 / authored ko canonical 수 / en canonical 수 */
  slotByMid: Map<string, { easy: number; authoredKoCanon: number; enCanon: number; authoredKoAny: number }>;
}

/** census/fetchTargetState VERBATIM 조인 — gencode·easy ko 원문·슬롯. */
export async function fetchMasterState(ds: any, ids: string[]): Promise<MasterState> {
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id=pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1 ORDER BY 1`, [ids]));
  const gencodeByMid = new Map<string, string | null>();
  for (const r of stdRows) {
    const gs = (r.gencodes || []).filter(Boolean).sort();
    gencodeByMid.set(r.mid, gs.length === 1 ? gs[0] : null);
  }

  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [ids]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));

  const slotRows = retRows<{ mid: string; easy: string; authoredcanon: string; encanon: string; authoredany: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authoredcanon,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authoredany
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [ids, AUTHORED_SOURCES as unknown as string[]]));
  const slotByMid = new Map(slotRows.map((r) => [r.mid, {
    easy: +r.easy, authoredKoCanon: +r.authoredcanon, enCanon: +r.encanon, authoredKoAny: +r.authoredany,
  }]));

  return { gencodeByMid, contentByMid, slotByMid };
}

/** 신규 V3 sourceRef 가 LIVE 에 이미 존재하는지(충돌). read-only. */
export async function liveSourceRefConflict(ds: any, refValues: string[]): Promise<number> {
  const rows = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refValues]));
  return parseInt(rows[0]?.n || '0', 10);
}

/** master 원문 → 6 섹션 raw 맵(정규화 전). */
export function sixSectionsRaw(content: string): Record<string, string> {
  const sec = sections(content);
  const out: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) out[k] = sec[k] || '';
  return out;
}
