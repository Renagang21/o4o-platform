/**
 * ProductDescriptionDashboardService — 설명서 운영 Dashboard 집계 (read-only)
 *
 * WO-O4O-ADMIN-DESCRIPTION-DASHBOARD-V1
 *
 * admin.neture.co.kr "상품관리 › 설명서 운영" 첫 화면. 운영자가 수정 전에
 * "얼마나 작성/검토/canonical 되었는가, 어떤 그룹이 미완성인가"를 한눈에 파악한다.
 *
 * 원칙: **read-only** — INSERT/UPDATE/DELETE·migration·설명 생성 로직 변경 없음.
 * 전부 parameterized/static SELECT 집계.
 *
 * 데이터 출처(2 store):
 *  - shared_product_descriptions (SPD, canonical store): status canonical/needs_review/…, source_type, master 기준
 *  - product_candidate_description_drafts (OTC 초안): review_status draft/needs_review/approved/rejected,
 *    source_label, source_identifier_value(=groupKey), seed_json.groupScope{masterTotal,otc,spdMasters}
 *
 * displaySummary 는 기존 ProductDescriptionStatusService.summary()(master 축 final_status)를 재사용한다.
 *
 * OTC 외(의료기기·의약외품·건강기능식품) 카테고리는 아직 데이터가 없으므로 active=false("준비중")로 표기한다.
 */

import type { DataSource } from 'typeorm';
import { ProductDescriptionStatusService } from './product-description-status.service.js';

export interface DescriptionDashboardCategory {
  key: string;
  label: string;
  active: boolean;
  spd: number;
  drafts: number;
  canonical: number;
  needsReview: number;
}

export interface DescriptionDashboardGroupRow {
  groupKey: string;
  ingredient: string | null;
  representativeTitle: string | null;
  representativeExists: boolean;
  masterTotal: number | null;
  otc: number | null;
  spdMasters: number | null;
  canonical: boolean;
  reviewStatuses: string[];
  draftCount: number;
  updatedAt: string | null;
}

export interface DescriptionDashboardCountEntry {
  key: string;
  count: number;
}

export interface DescriptionDashboardReviewer {
  reviewerId: string | null;
  reviewerLabel: string;
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export interface DescriptionDashboardRecent {
  kind: 'spd' | 'draft';
  id: string;
  title: string | null;
  state: string;
  source: string | null;
  updatedAt: string | null;
}

export interface DescriptionDashboard {
  summary: {
    canonical: number;
    needsReview: number;
    draft: number;
    approved: number;
    rejected: number;
    other: number;
    spdTotal: number;
    draftTotal: number;
    lastUpdatedAt: string | null;
  };
  categorySummary: DescriptionDashboardCategory[];
  workflow: { draft: number; review: number; approved: number; canonical: number };
  groupSummary: DescriptionDashboardGroupRow[];
  reviewerSummary: DescriptionDashboardReviewer[];
  sourceSummary: {
    spdBySourceType: DescriptionDashboardCountEntry[];
    draftBySourceLabel: DescriptionDashboardCountEntry[];
  };
  displaySummary: Record<string, number>;
  recentActivities: DescriptionDashboardRecent[];
  generatedAt: string;
}

export class ProductDescriptionDashboardService {
  private statusService: ProductDescriptionStatusService;

  constructor(private dataSource: DataSource) {
    this.statusService = new ProductDescriptionStatusService(dataSource);
  }

  async dashboard(): Promise<DescriptionDashboard> {
    const [
      spdStatusRows,
      draftStatusRows,
      spdSourceRows,
      draftSourceRows,
      groupRows,
      spdReviewerRows,
      draftReviewerRows,
      recentRows,
      lastUpdatedRow,
      displaySummary,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT status, count(*)::int AS count FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY status`,
      ) as Promise<{ status: string; count: number }[]>,
      this.dataSource.query(
        `SELECT review_status, count(*)::int AS count FROM product_candidate_description_drafts WHERE deleted_at IS NULL GROUP BY review_status`,
      ) as Promise<{ review_status: string; count: number }[]>,
      this.dataSource.query(
        `SELECT source_type, count(*)::int AS count FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY source_type ORDER BY count DESC`,
      ) as Promise<{ source_type: string; count: number }[]>,
      this.dataSource.query(
        `SELECT source_label, count(*)::int AS count FROM product_candidate_description_drafts WHERE deleted_at IS NULL GROUP BY source_label ORDER BY count DESC`,
      ) as Promise<{ source_label: string; count: number }[]>,
      this.dataSource.query(
        `SELECT source_identifier_value AS group_key,
           (array_agg(seed_json->>'ingredient'))[1] AS ingredient,
           (array_agg(title ORDER BY updated_at DESC))[1] AS representative_title,
           max((seed_json->'groupScope'->>'masterTotal')::int) AS master_total,
           max((seed_json->'groupScope'->>'otc')::int) AS otc,
           max((seed_json->'groupScope'->>'spdMasters')::int) AS spd_masters,
           array_agg(DISTINCT review_status) AS review_statuses,
           count(*)::int AS draft_count,
           max(updated_at) AS updated_at
         FROM product_candidate_description_drafts
         WHERE deleted_at IS NULL AND source_identifier_value IS NOT NULL
         GROUP BY source_identifier_value
         ORDER BY max(updated_at) DESC
         LIMIT 200`,
      ) as Promise<{
        group_key: string; ingredient: string | null; representative_title: string | null;
        master_total: number | null; otc: number | null; spd_masters: number | null;
        review_statuses: string[]; draft_count: number; updated_at: string | null;
      }[]>,
      this.dataSource.query(
        `SELECT curated_by,
           count(*) FILTER (WHERE status='canonical')::int AS approved,
           count(*) FILTER (WHERE status='needs_review')::int AS pending,
           count(*)::int AS total
         FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY curated_by ORDER BY total DESC`,
      ) as Promise<{ curated_by: string | null; approved: number; pending: number; total: number }[]>,
      this.dataSource.query(
        `SELECT reviewed_by,
           count(*) FILTER (WHERE review_status='approved')::int AS approved,
           count(*) FILTER (WHERE review_status='needs_review')::int AS pending,
           count(*) FILTER (WHERE review_status='rejected')::int AS rejected,
           count(*)::int AS total
         FROM product_candidate_description_drafts WHERE deleted_at IS NULL GROUP BY reviewed_by ORDER BY total DESC`,
      ) as Promise<{ reviewed_by: string | null; approved: number; pending: number; rejected: number; total: number }[]>,
      this.dataSource.query(
        `(SELECT 'spd' AS kind, spd.id::text AS id, pm.name AS title, spd.status AS state,
            spd.source_type AS source, spd.updated_at AS updated_at
          FROM shared_product_descriptions spd
          LEFT JOIN product_masters pm ON pm.id = spd.master_id
          WHERE spd.deleted_at IS NULL
          ORDER BY spd.updated_at DESC LIMIT 20)
         UNION ALL
         (SELECT 'draft' AS kind, d.id::text AS id,
            COALESCE(d.title, d.source_identifier_value) AS title, d.review_status AS state,
            d.source_label AS source, d.updated_at AS updated_at
          FROM product_candidate_description_drafts d
          WHERE d.deleted_at IS NULL
          ORDER BY d.updated_at DESC LIMIT 20)
         ORDER BY updated_at DESC LIMIT 20`,
      ) as Promise<{ kind: 'spd' | 'draft'; id: string; title: string | null; state: string; source: string | null; updated_at: string | null }[]>,
      this.dataSource.query(
        `SELECT GREATEST(
            COALESCE((SELECT max(updated_at) FROM shared_product_descriptions WHERE deleted_at IS NULL), 'epoch'),
            COALESCE((SELECT max(updated_at) FROM product_candidate_description_drafts WHERE deleted_at IS NULL), 'epoch')
          ) AS last_updated`,
      ) as Promise<{ last_updated: string | null }[]>,
      this.statusService.summary(),
    ]);

    const spdStatus = this.toMap(spdStatusRows.map((r) => ({ key: r.status, count: r.count })));
    const draftStatus = this.toMap(draftStatusRows.map((r) => ({ key: r.review_status, count: r.count })));

    const spdTotal = spdStatusRows.reduce((a, r) => a + r.count, 0);
    const draftTotal = draftStatusRows.reduce((a, r) => a + r.count, 0);

    const canonical = spdStatus.canonical ?? 0;
    const spdNeedsReview = spdStatus.needs_review ?? 0;
    const draftNeedsReview = draftStatus.needs_review ?? 0;
    const draftOnly = draftStatus.draft ?? 0;
    const approved = draftStatus.approved ?? 0;
    const rejected = draftStatus.rejected ?? 0;
    const spdOther = spdTotal - canonical - spdNeedsReview; // hidden/deprecated/candidate 등

    const summary = {
      canonical,
      needsReview: spdNeedsReview + draftNeedsReview,
      draft: draftOnly,
      approved,
      rejected,
      other: Math.max(spdOther, 0),
      spdTotal,
      draftTotal,
      lastUpdatedAt: lastUpdatedRow[0]?.last_updated ?? null,
    };

    const workflow = {
      draft: draftOnly,
      review: spdNeedsReview + draftNeedsReview,
      approved,
      canonical,
    };

    // 카테고리: 현재 OTC(의약품 OTC)만 데이터 존재 → active. 나머지는 준비중.
    const categorySummary: DescriptionDashboardCategory[] = [
      {
        key: 'otc', label: 'OTC 의약품', active: true,
        spd: spdTotal, drafts: draftTotal, canonical, needsReview: spdNeedsReview + draftNeedsReview,
      },
      { key: 'drug_etc', label: '의약품(기타)', active: false, spd: 0, drafts: 0, canonical: 0, needsReview: 0 },
      { key: 'medical_device', label: '의료기기', active: false, spd: 0, drafts: 0, canonical: 0, needsReview: 0 },
      { key: 'quasi_drug', label: '의약외품', active: false, spd: 0, drafts: 0, canonical: 0, needsReview: 0 },
      { key: 'health_functional_food', label: '건강기능식품', active: false, spd: 0, drafts: 0, canonical: 0, needsReview: 0 },
    ];

    const groupSummary: DescriptionDashboardGroupRow[] = groupRows.map((g) => {
      const spdMasters = g.spd_masters == null ? null : Number(g.spd_masters);
      return {
        groupKey: g.group_key,
        ingredient: g.ingredient,
        representativeTitle: g.representative_title,
        representativeExists: g.draft_count > 0,
        masterTotal: g.master_total == null ? null : Number(g.master_total),
        otc: g.otc == null ? null : Number(g.otc),
        spdMasters,
        canonical: (spdMasters ?? 0) > 0,
        reviewStatuses: (g.review_statuses ?? []).filter(Boolean),
        draftCount: g.draft_count,
        updatedAt: g.updated_at,
      };
    });

    const reviewerSummary = this.buildReviewerSummary(spdReviewerRows, draftReviewerRows);

    const sourceSummary = {
      spdBySourceType: spdSourceRows.map((r) => ({ key: r.source_type, count: r.count })),
      draftBySourceLabel: draftSourceRows.map((r) => ({ key: r.source_label, count: r.count })),
    };

    const recentActivities: DescriptionDashboardRecent[] = recentRows.map((r) => ({
      kind: r.kind,
      id: r.id,
      title: r.title,
      state: r.state,
      source: r.source,
      updatedAt: r.updated_at,
    }));

    return {
      summary,
      categorySummary,
      workflow,
      groupSummary,
      reviewerSummary,
      sourceSummary,
      displaySummary,
      recentActivities,
      generatedAt: new Date().toISOString(),
    };
  }

  private toMap(entries: { key: string; count: number }[]): Record<string, number> {
    return Object.fromEntries(entries.map((e) => [e.key, e.count]));
  }

  /** SPD(curated_by) + draft(reviewed_by) 검토자 집계. NULL = 미기록(배치 시드) 버킷으로 합산. */
  private buildReviewerSummary(
    spdRows: { curated_by: string | null; approved: number; pending: number; total: number }[],
    draftRows: { reviewed_by: string | null; approved: number; pending: number; rejected: number; total: number }[],
  ): DescriptionDashboardReviewer[] {
    const map = new Map<string, DescriptionDashboardReviewer>();
    const keyOf = (id: string | null) => id ?? '__unattributed__';
    const ensure = (id: string | null): DescriptionDashboardReviewer => {
      const k = keyOf(id);
      let r = map.get(k);
      if (!r) {
        r = {
          reviewerId: id,
          reviewerLabel: id ? id : '미기록 (배치 시드 · 검토자 없음)',
          approved: 0, pending: 0, rejected: 0, total: 0,
        };
        map.set(k, r);
      }
      return r;
    };
    for (const s of spdRows) {
      const r = ensure(s.curated_by);
      r.approved += s.approved; r.pending += s.pending; r.total += s.total;
    }
    for (const d of draftRows) {
      const r = ensure(d.reviewed_by);
      r.approved += d.approved; r.pending += d.pending; r.rejected += d.rejected; r.total += d.total;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }
}
