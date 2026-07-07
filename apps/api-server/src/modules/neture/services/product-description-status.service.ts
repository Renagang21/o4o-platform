/**
 * ProductDescriptionStatusService — ProductMaster 기준 설명 상태 통합 조회 (read-only)
 *
 * WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1
 *
 * master 1건에 대해 canonical / needs_review(shared_product_descriptions) + draft
 * (product_candidate_description_drafts, 성분·함량·제형 그룹 파싱 조인) 상태를 한 축으로 집계한다.
 * **read-only** — INSERT/UPDATE/DELETE 없음. 전부 parameterized SELECT.
 *
 * draft 연결 기준(확실한 경우만): OTC draft 는 master FK 가 없고 (성분·함량·제형) 그룹 단위다.
 * draft 적재/승격 dry-run 에서 검증된 것과 **동일한 결정적 파싱 조인**
 *   (name 괄호 성분 = seed_json.ingredient) AND (spec 첫 토큰 = strengthToken) AND (제형 키워드 = doseForm)
 *   AND drug_category='otc' 로만 연결한다. 추정/유사매칭 없음.
 */

import type { DataSource } from 'typeorm';

export type DescriptionFinalStatus = 'canonical' | 'needs_review' | 'draft' | 'none';

export interface DescriptionStatusParams {
  finalStatus?: DescriptionFinalStatus;
  regulatoryType?: string;
  sourceType?: string; // canonical/needs_review source_type 필터
  draftOnly?: boolean; // draft 연결이 있는 master 만
  q?: string; // 상품명/제조사/바코드/master id
  page?: number;
  limit?: number;
}

export interface DescriptionStatusRow {
  masterId: string;
  productName: string;
  manufacturerName: string | null;
  regulatoryType: string | null;
  primaryIdentifier: string | null;
  canonicalCount: number;
  needsReviewCount: number;
  draftCount: number;
  finalStatus: DescriptionFinalStatus;
  canonicalSourceTypes: string[];
  needsReviewSourceTypes: string[];
  draftVerdicts: string[];
  canonicalDescriptionId: string | null;
  needsReviewDescriptionId: string | null;
  draftId: string | null;
}

/** 공통 CTE — draft 그룹 파싱 조인 + SPD 집계. 하위 목록/카운트가 공유. */
const BASE_CTE = `
  WITH draft_groups AS (
    SELECT id AS draft_id, guard_result->>'verdict' AS verdict,
      seed_json->>'ingredient' AS ing, seed_json->>'strengthToken' AS str, seed_json->>'doseForm' AS form
    FROM product_candidate_description_drafts
    WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL
  ),
  draft_master AS (
    SELECT pm.id AS master_id,
      (array_agg(dg.draft_id))[1] AS draft_id,
      array_agg(DISTINCT dg.verdict) AS verdicts
    FROM product_masters pm
    JOIN draft_groups dg
      ON substring(pm.name from '\\(([^()]+)\\)\\s*$') = dg.ing
     AND split_part(pm.specification, ' / ', 1) = dg.str
     AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
               WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
               WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END) = dg.form
    WHERE pm.regulatory_type='DRUG' AND pm.drug_category='otc'
    GROUP BY pm.id
  ),
  spd_agg AS (
    SELECT master_id,
      count(*) FILTER (WHERE status='canonical') AS canonical_count,
      count(*) FILTER (WHERE status='needs_review') AS needs_review_count,
      array_agg(DISTINCT source_type) FILTER (WHERE status='canonical') AS canonical_sources,
      array_agg(DISTINCT source_type) FILTER (WHERE status='needs_review') AS needs_review_sources,
      (array_agg(id ORDER BY updated_at DESC) FILTER (WHERE status='canonical'))[1] AS canonical_id,
      (array_agg(id ORDER BY updated_at DESC) FILTER (WHERE status='needs_review'))[1] AS needs_review_id
    FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY master_id
  ),
  joined AS (
    SELECT m.id AS master_id, m.name, m.manufacturer_name, m.regulatory_type, m.barcode,
      COALESCE(s.canonical_count,0) AS canonical_count,
      COALESCE(s.needs_review_count,0) AS needs_review_count,
      (dm.master_id IS NOT NULL)::int AS draft_count,
      COALESCE(s.canonical_sources, '{}') AS canonical_sources,
      COALESCE(s.needs_review_sources, '{}') AS needs_review_sources,
      COALESCE(dm.verdicts, '{}') AS draft_verdicts,
      s.canonical_id, s.needs_review_id, dm.draft_id,
      CASE WHEN COALESCE(s.canonical_count,0)>0 THEN 'canonical'
           WHEN COALESCE(s.needs_review_count,0)>0 THEN 'needs_review'
           WHEN dm.master_id IS NOT NULL THEN 'draft'
           ELSE 'none' END AS final_status
    FROM product_masters m
    LEFT JOIN spd_agg s ON s.master_id = m.id
    LEFT JOIN draft_master dm ON dm.master_id = m.id
  )`;

export class ProductDescriptionStatusService {
  constructor(private dataSource: DataSource) {}

  private buildWhere(params: DescriptionStatusParams): { sql: string; args: unknown[] } {
    const where: string[] = [];
    const args: unknown[] = [];
    const add = (clause: (i: number) => string, value: unknown) => {
      args.push(value);
      where.push(clause(args.length));
    };
    if (params.finalStatus) add((i) => `final_status = $${i}`, params.finalStatus);
    if (params.regulatoryType) add((i) => `regulatory_type = $${i}`, params.regulatoryType);
    if (params.draftOnly) where.push(`draft_count > 0`);
    if (params.sourceType) {
      args.push(params.sourceType);
      const i = args.length;
      where.push(`($${i} = ANY(canonical_sources) OR $${i} = ANY(needs_review_sources))`);
    }
    if (params.q?.trim()) {
      args.push(`%${params.q.trim()}%`);
      const i = args.length;
      where.push(`(name ILIKE $${i} OR manufacturer_name ILIKE $${i} OR barcode ILIKE $${i} OR master_id::text ILIKE $${i})`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  async list(params: DescriptionStatusParams): Promise<{ items: DescriptionStatusRow[]; total: number }> {
    const { sql: whereSql, args } = this.buildWhere(params);

    const [{ count }]: { count: string }[] = await this.dataSource.query(
      `${BASE_CTE} SELECT COUNT(*) AS count FROM joined ${whereSql}`,
      args,
    );
    const total = Number(count);

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(((params.page ?? 1) - 1) * limit, 0);
    const rows: {
      master_id: string; name: string; manufacturer_name: string | null; regulatory_type: string | null;
      barcode: string | null; canonical_count: string; needs_review_count: string; draft_count: string;
      canonical_sources: string[]; needs_review_sources: string[]; draft_verdicts: string[];
      canonical_id: string | null; needs_review_id: string | null; draft_id: string | null; final_status: string;
    }[] = await this.dataSource.query(
      `${BASE_CTE}
       SELECT master_id, name, manufacturer_name, regulatory_type, barcode,
         canonical_count, needs_review_count, draft_count,
         canonical_sources, needs_review_sources, draft_verdicts,
         canonical_id, needs_review_id, draft_id, final_status
       FROM joined ${whereSql}
       ORDER BY (final_status='none') ASC, name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    return {
      items: rows.map((r) => ({
        masterId: r.master_id,
        productName: r.name,
        manufacturerName: r.manufacturer_name,
        regulatoryType: r.regulatory_type,
        primaryIdentifier: r.barcode,
        canonicalCount: Number(r.canonical_count),
        needsReviewCount: Number(r.needs_review_count),
        draftCount: Number(r.draft_count),
        finalStatus: r.final_status as DescriptionFinalStatus,
        canonicalSourceTypes: r.canonical_sources ?? [],
        needsReviewSourceTypes: r.needs_review_sources ?? [],
        draftVerdicts: r.draft_verdicts ?? [],
        canonicalDescriptionId: r.canonical_id,
        needsReviewDescriptionId: r.needs_review_id,
        draftId: r.draft_id,
      })),
      total,
    };
  }

  /** finalStatus 별 집계(대시보드/필터 뱃지용). */
  async summary(): Promise<Record<string, number>> {
    const rows: { final_status: string; masters: string }[] = await this.dataSource.query(
      `${BASE_CTE} SELECT final_status, COUNT(*) AS masters FROM joined GROUP BY final_status`,
    );
    return Object.fromEntries(rows.map((r) => [r.final_status, Number(r.masters)]));
  }
}
