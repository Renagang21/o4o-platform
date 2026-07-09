/**
 * ProductDescriptionReviewListService — 설명서 검토 목록 (admin, read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-LIST-V1
 *
 * 두 설명 store 를 공통 row 로 정규화해 통합 조회한다 (서버 페이지네이션).
 *  - shared_product_descriptions (SPD, master 기준 canonical/needs_review)
 *  - product_candidate_description_drafts (OTC/HFF 초안, review_status)
 *
 * 원칙: **read-only**. 본문(content) 대량 전송 금지 — summary/snippet 만. parameterized query.
 */

import type { DataSource } from 'typeorm';

export interface ReviewListParams {
  page?: number;
  limit?: number;
  q?: string;
  source?: string; // all | SPD | OTC_DRAFT
  status?: string; // needs_review(기본) | canonical | draft | approved | ... | all
  descriptionType?: string; // all | STORE | SUPPLIER_STORE | B2B | B2C
  category?: string; // all | OTC | HFF | MEDICAL_DEVICE | QUASI_DRUG | 기타
  sort?: string; // updated_at(기본) | created_at
  order?: string; // desc(기본) | asc
}

export interface ReviewListRow {
  reviewItemId: string; // "spd:uuid" | "draft:uuid"
  sourceStore: 'SPD' | 'OTC_DRAFT';
  sourceLabel: string;
  id: string;
  masterId: string | null;
  candidateId: string | null;
  productName: string | null;
  manufacturerName: string | null;
  descriptionType: string;
  status: string;
  category: string | null;
  sourceType: string | null;
  groupKey: string | null;
  updatedAt: string;
  createdAt: string;
  summary: string | null;
}

/** category(WO) → SPD regulatory_type 매핑 (best-effort). */
function categoryToRegulatoryType(cat: string): string | null {
  switch (cat) {
    case 'OTC': return 'DRUG';
    case 'HFF': return 'HEALTH_FUNCTIONAL';
    case 'MEDICAL_DEVICE': return 'MEDICAL_DEVICE';
    case 'QUASI_DRUG': return 'QUASI_DRUG';
    default: return null; // 기타/알 수 없음
  }
}

export class ProductDescriptionReviewListService {
  constructor(private dataSource: DataSource) {}

  async listReview(params: ReviewListParams): Promise<{ items: ReviewListRow[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;
    const source = (params.source && ['SPD', 'OTC_DRAFT'].includes(params.source)) ? params.source : 'all';
    const status = params.status || 'needs_review';
    const descType = params.descriptionType && params.descriptionType !== 'all' ? params.descriptionType : null;
    const category = params.category && params.category !== 'all' ? params.category : null;
    const sortCol = params.sort === 'created_at' ? 'created_at' : 'updated_at';
    const orderDir = (params.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const q = params.q?.trim();

    const includeSpd = source !== 'OTC_DRAFT' && (!descType || ['STORE', 'SUPPLIER_STORE', 'B2B', 'B2C'].includes(descType));
    // OTC_DRAFT 는 항상 STORE 성격 → descType 이 STORE/미지정일 때만 포함
    const includeDraft = source !== 'SPD' && (!descType || descType === 'STORE');

    const args: unknown[] = [];
    const push = (v: unknown) => { args.push(v); return `$${args.length}`; };

    // ── SPD CTE ──
    const spdCtes: string[] = [];
    if (includeSpd) {
      const w: string[] = [`spd.deleted_at IS NULL`];
      if (status !== 'all') w.push(`spd.status = ${push(status)}`);
      if (descType) w.push(`spd.description_type = ${push(descType)}`);
      if (category) {
        const rt = categoryToRegulatoryType(category);
        if (rt) w.push(`pm.regulatory_type = ${push(rt)}`);
        else w.push(`pm.regulatory_type IS NULL`); // 기타
      }
      if (q) {
        const like = push(`%${q}%`);
        w.push(`(pm.name ILIKE ${like} OR pm.manufacturer_name ILIKE ${like} OR spd.master_id::text ILIKE ${like} OR spd.source_type ILIKE ${like})`);
      }
      spdCtes.push(`
        SELECT 'spd:'||spd.id AS review_item_id, 'SPD'::text AS source_store,
               spd.id::text AS id, spd.master_id::text AS master_id, NULL::text AS candidate_id,
               pm.name AS product_name, pm.manufacturer_name AS manufacturer_name,
               spd.description_type AS description_type, spd.status AS status,
               pm.regulatory_type AS category, spd.source_type AS source_type, NULL::text AS group_key,
               spd.summary AS summary, spd.updated_at AS updated_at, spd.created_at AS created_at
          FROM shared_product_descriptions spd
          JOIN product_masters pm ON pm.id = spd.master_id
         WHERE ${w.join(' AND ')}`);
    }

    // ── OTC_DRAFT CTE ──
    const draftCtes: string[] = [];
    if (includeDraft) {
      const w: string[] = [`d.deleted_at IS NULL`];
      if (status !== 'all') w.push(`d.review_status = ${push(status)}`);
      if (category) {
        // draft 는 대개 HFF — HFF/OTC 만 포함, 그 외 category 필터 시 0
        if (!['HFF', 'OTC'].includes(category)) w.push(`1 = 0`);
      }
      if (q) {
        const like = push(`%${q}%`);
        w.push(`(pc.candidate_name ILIKE ${like} OR pc.candidate_manufacturer ILIKE ${like} OR d.candidate_id::text ILIKE ${like} OR d.source_identifier_value ILIKE ${like} OR d.source_label ILIKE ${like})`);
      }
      draftCtes.push(`
        SELECT 'draft:'||d.id AS review_item_id, 'OTC_DRAFT'::text AS source_store,
               d.id::text AS id, pc.matched_product_master_id::text AS master_id, d.candidate_id::text AS candidate_id,
               COALESCE(pc.candidate_name, d.title) AS product_name, pc.candidate_manufacturer AS manufacturer_name,
               'STORE'::varchar AS description_type, d.review_status AS status,
               COALESCE(pc.candidate_category, d.source_label) AS category, d.source_label AS source_type,
               d.source_identifier_value AS group_key,
               d.summary AS summary, d.updated_at AS updated_at, d.created_at AS created_at
          FROM product_candidate_description_drafts d
          LEFT JOIN product_candidates pc ON pc.id = d.candidate_id
         WHERE ${w.join(' AND ')}`);
    }

    const cteSql = [...spdCtes, ...draftCtes].join('\n        UNION ALL\n');
    if (!cteSql) {
      return { items: [], total: 0, page, limit };
    }

    const countRows: Array<{ total: string }> = await this.dataSource.query(
      `WITH unified AS (${cteSql}) SELECT count(*)::text AS total FROM unified`,
      args,
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const dataRows: Array<Record<string, unknown>> = await this.dataSource.query(
      `WITH unified AS (${cteSql})
        SELECT * FROM unified
        ORDER BY ${sortCol} ${orderDir} NULLS LAST
        LIMIT ${push(limit)} OFFSET ${push(offset)}`,
      args,
    );

    const items: ReviewListRow[] = dataRows.map((r) => ({
      reviewItemId: r.review_item_id as string,
      sourceStore: r.source_store as 'SPD' | 'OTC_DRAFT',
      sourceLabel: r.source_store === 'SPD' ? '공식 설명서' : 'OTC 초안',
      id: r.id as string,
      masterId: (r.master_id as string) ?? null,
      candidateId: (r.candidate_id as string) ?? null,
      productName: (r.product_name as string) ?? null,
      manufacturerName: (r.manufacturer_name as string) ?? null,
      descriptionType: r.description_type as string,
      status: r.status as string,
      category: (r.category as string) ?? null,
      sourceType: (r.source_type as string) ?? null,
      groupKey: (r.group_key as string) ?? null,
      updatedAt: r.updated_at as string,
      createdAt: r.created_at as string,
      summary: (r.summary as string) ?? null,
    }));

    return { items, total, page, limit };
  }
}
