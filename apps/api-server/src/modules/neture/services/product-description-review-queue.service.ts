/**
 * ProductDescriptionReviewQueueService — 설명서 검토 Queue (Group 중심, read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-REVIEW-QUEUE-V1
 *
 * Dashboard 다음 단계. 운영자가 설명서를 "목록"이 아니라 **검토 대상(Group)** 단위로 처리하는
 * 업무동선의 시작. 설명서는 (성분·함량·제형) Group 중심으로 관리한다.
 *
 * 원칙: **read-only** — INSERT/UPDATE/DELETE·migration·Draft 구조 변경·ProductMaster 변경 없음.
 * 전부 parameterized SELECT.
 *
 * - list: OTC 초안(product_candidate_description_drafts)을 source_identifier_value(=groupKey)로 집계.
 *   적용 Master 수는 초안 seed_json.groupScope(masterTotal/spdMasters)를 사용(목록은 가볍게, join 안 함).
 * - detail: 대표 초안 1건의 상담 블록(content_json) + **적용 대상 Master 목록**을 결정적 parse join으로 해석.
 *   join 기준은 description-status 통합뷰와 동일: (name 괄호 성분)=ingredient AND (spec 첫 토큰)=strengthToken
 *   AND (제형 키워드)=doseForm AND drug_category='otc'. 추정 매칭 없음.
 */

import type { DataSource } from 'typeorm';

export interface ReviewQueueParams {
  q?: string;
  source?: string; // source_label 정확일치
  status?: string; // review_status
  sort?: 'applied_master' | 'updated_at' | 'group';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ReviewQueueRow {
  groupKey: string;
  draftId: string; // 대표 초안 (상세 진입 키)
  ingredient: string | null;
  primaryUse: string | null; // content_json.efficacy 요약
  title: string | null;
  sourceLabel: string | null;
  reviewStatus: string;
  groupMasterCount: number | null; // 그룹 대상 Master 수 (masterTotal)
  appliedMasterCount: number | null; // 적용(SPD) Master 수 (spdMasters)
  author: string | null; // ai_provider
  reviewer: string | null; // reviewed_by
  draftCount: number;
  generatedAt: string | null;
  updatedAt: string | null;
}

export interface ReviewQueueAppliedMaster {
  masterId: string;
  name: string;
  manufacturerName: string | null;
  barcode: string | null;
  hasCanonical: boolean;
  hasNeedsReview: boolean;
}

export interface ReviewQueueDetail {
  groupKey: string;
  draftId: string;
  ingredient: string | null;
  strengthToken: string | null;
  doseForm: string | null;
  sourceLabel: string | null;
  reviewStatus: string;
  reviewFlags: string[];
  author: string | null;
  aiModel: string | null;
  reviewer: string | null;
  generatedAt: string | null;
  updatedAt: string | null;
  blocks: {
    bodyMarkdown: string | null;
    primaryClinicalUse: string | null; // efficacy
    selectionPoint: string | null; // ingredientSelection
    counselingPoint: string | null; // usage
    safetyBlock: string | null; // caution
    usageLabel: string | null;
    contentSource: string | null;
  };
  appliedMasters: ReviewQueueAppliedMaster[];
  appliedMasterTotal: number;
  appliedMasterSampleLimited: boolean;
}

const APPLIED_MASTER_LIMIT = 100;

export class ProductDescriptionReviewQueueService {
  constructor(private dataSource: DataSource) {}

  private buildOuterWhere(params: ReviewQueueParams): { sql: string; args: unknown[] } {
    const where: string[] = [];
    const args: unknown[] = [];
    if (params.status) {
      args.push(params.status);
      where.push(`review_status = $${args.length}`);
    }
    if (params.source) {
      args.push(params.source);
      where.push(`source_label = $${args.length}`);
    }
    if (params.q?.trim()) {
      args.push(`%${params.q.trim()}%`);
      const i = args.length;
      where.push(`(group_key ILIKE $${i} OR ingredient ILIKE $${i} OR title ILIKE $${i} OR primary_use ILIKE $${i})`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  private readonly GROUP_CTE = `
    WITH grp AS (
      SELECT source_identifier_value AS group_key,
        (array_agg(id ORDER BY updated_at DESC))[1] AS draft_id,
        (array_agg(seed_json->>'ingredient' ORDER BY updated_at DESC))[1] AS ingredient,
        (array_agg(content_json->>'efficacy' ORDER BY updated_at DESC))[1] AS primary_use,
        (array_agg(title ORDER BY updated_at DESC))[1] AS title,
        (array_agg(source_label ORDER BY updated_at DESC))[1] AS source_label,
        (array_agg(review_status ORDER BY updated_at DESC))[1] AS review_status,
        (array_agg(ai_provider ORDER BY updated_at DESC))[1] AS ai_provider,
        (array_agg(reviewed_by::text ORDER BY updated_at DESC))[1] AS reviewed_by,
        max((seed_json->'groupScope'->>'masterTotal')::int) AS master_total,
        max((seed_json->'groupScope'->>'spdMasters')::int) AS spd_masters,
        count(*)::int AS draft_count,
        max(updated_at) AS updated_at,
        max(generated_at) AS generated_at
      FROM product_candidate_description_drafts
      WHERE deleted_at IS NULL AND source_identifier_value IS NOT NULL
      GROUP BY source_identifier_value
    )`;

  async list(params: ReviewQueueParams): Promise<{ items: ReviewQueueRow[]; total: number }> {
    const { sql: whereSql, args } = this.buildOuterWhere(params);

    const countRows: { count: string }[] = await this.dataSource.query(
      `${this.GROUP_CTE} SELECT COUNT(*) AS count FROM grp ${whereSql}`,
      args,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const sortCol = params.sort === 'updated_at' ? 'updated_at'
      : params.sort === 'group' ? 'group_key'
      : 'spd_masters'; // 기본: 적용 Master 많은 순 (Queue 우선순위)
    const order = params.order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(((params.page ?? 1) - 1) * limit, 0);

    const rows: any[] = await this.dataSource.query(
      `${this.GROUP_CTE}
       SELECT group_key, draft_id, ingredient, primary_use, title, source_label, review_status,
         ai_provider, reviewed_by, master_total, spd_masters, draft_count, updated_at, generated_at
       FROM grp ${whereSql}
       ORDER BY ${sortCol} ${order} NULLS LAST, updated_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    return {
      items: rows.map((r) => ({
        groupKey: r.group_key,
        draftId: r.draft_id,
        ingredient: r.ingredient,
        primaryUse: r.primary_use ? String(r.primary_use).slice(0, 160) : null,
        title: r.title,
        sourceLabel: r.source_label,
        reviewStatus: r.review_status,
        groupMasterCount: r.master_total == null ? null : Number(r.master_total),
        appliedMasterCount: r.spd_masters == null ? null : Number(r.spd_masters),
        author: r.ai_provider,
        reviewer: r.reviewed_by,
        draftCount: Number(r.draft_count),
        generatedAt: r.generated_at,
        updatedAt: r.updated_at,
      })),
      total,
    };
  }

  /** 필터 옵션(source_label / review_status 분포) — Toolbar 채움용. */
  async filterOptions(): Promise<{ sources: { value: string; count: number }[]; statuses: { value: string; count: number }[] }> {
    const [sources, statuses] = await Promise.all([
      this.dataSource.query(
        `SELECT source_label AS value, count(DISTINCT source_identifier_value)::int AS count
         FROM product_candidate_description_drafts WHERE deleted_at IS NULL AND source_identifier_value IS NOT NULL
         GROUP BY source_label ORDER BY count DESC`,
      ) as Promise<{ value: string; count: number }[]>,
      this.dataSource.query(
        `SELECT review_status AS value, count(DISTINCT source_identifier_value)::int AS count
         FROM product_candidate_description_drafts WHERE deleted_at IS NULL AND source_identifier_value IS NOT NULL
         GROUP BY review_status ORDER BY count DESC`,
      ) as Promise<{ value: string; count: number }[]>,
    ]);
    return { sources, statuses };
  }

  async detail(draftId: string): Promise<ReviewQueueDetail | null> {
    const rows: any[] = await this.dataSource.query(
      `SELECT id, source_identifier_value AS group_key, source_label, review_status, review_flags,
         ai_provider, ai_model, reviewed_by::text AS reviewed_by, generated_at, updated_at,
         seed_json->>'ingredient' AS ingredient,
         seed_json->>'strengthToken' AS strength_token,
         seed_json->>'doseForm' AS dose_form,
         content_json->>'bodyMarkdown' AS body_markdown,
         content_json->>'efficacy' AS efficacy,
         content_json->>'ingredientSelection' AS ingredient_selection,
         content_json->>'usage' AS usage,
         content_json->>'caution' AS caution,
         content_json->>'usageLabel' AS usage_label,
         content_json->>'contentSource' AS content_source
       FROM product_candidate_description_drafts
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [draftId],
    );
    const d = rows[0];
    if (!d) return null;

    let appliedMasters: ReviewQueueAppliedMaster[] = [];
    let appliedMasterTotal = 0;
    if (d.ingredient && d.strength_token && d.dose_form) {
      const countRows: { count: string }[] = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM product_masters pm
         WHERE substring(pm.name from '\\(([^()]+)\\)\\s*$') = $1
           AND split_part(pm.specification, ' / ', 1) = $2
           AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
                     WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
                     WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END) = $3
           AND pm.regulatory_type='DRUG' AND pm.drug_category='otc'`,
        [d.ingredient, d.strength_token, d.dose_form],
      );
      appliedMasterTotal = Number(countRows[0]?.count ?? 0);

      const masterRows: any[] = await this.dataSource.query(
        `SELECT pm.id, pm.name, pm.manufacturer_name, pm.barcode,
           EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='canonical') AS has_canonical,
           EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='needs_review') AS has_needs_review
         FROM product_masters pm
         WHERE substring(pm.name from '\\(([^()]+)\\)\\s*$') = $1
           AND split_part(pm.specification, ' / ', 1) = $2
           AND (CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
                     WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
                     WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END) = $3
           AND pm.regulatory_type='DRUG' AND pm.drug_category='otc'
         ORDER BY (EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.deleted_at IS NULL AND s.status='canonical')) DESC, pm.name ASC
         LIMIT ${APPLIED_MASTER_LIMIT}`,
        [d.ingredient, d.strength_token, d.dose_form],
      );
      appliedMasters = masterRows.map((m) => ({
        masterId: m.id,
        name: m.name,
        manufacturerName: m.manufacturer_name,
        barcode: m.barcode,
        hasCanonical: m.has_canonical,
        hasNeedsReview: m.has_needs_review,
      }));
    }

    return {
      groupKey: d.group_key,
      draftId: d.id,
      ingredient: d.ingredient,
      strengthToken: d.strength_token,
      doseForm: d.dose_form,
      sourceLabel: d.source_label,
      reviewStatus: d.review_status,
      reviewFlags: Array.isArray(d.review_flags) ? d.review_flags : [],
      author: d.ai_provider,
      aiModel: d.ai_model,
      reviewer: d.reviewed_by,
      generatedAt: d.generated_at,
      updatedAt: d.updated_at,
      blocks: {
        bodyMarkdown: d.body_markdown,
        primaryClinicalUse: d.efficacy,
        selectionPoint: d.ingredient_selection,
        counselingPoint: d.usage,
        safetyBlock: d.caution,
        usageLabel: d.usage_label,
        contentSource: d.content_source,
      },
      appliedMasters,
      appliedMasterTotal,
      appliedMasterSampleLimited: appliedMasterTotal > appliedMasters.length,
    };
  }
}
