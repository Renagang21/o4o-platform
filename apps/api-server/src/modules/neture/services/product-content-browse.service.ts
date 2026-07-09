/**
 * ProductContentBrowseService — 제품 콘텐츠 통합 browse (read-only)
 *
 * WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1 (A안: read-only 통합 조회 API)
 *
 * 흩어진 제품 콘텐츠 원본을 하나의 축으로 조회한다. **INSERT/UPDATE/DELETE·migration 없음.**
 * 4 source 를 공통 컬럼으로 정규화하여 UNION ALL 후 필터/페이지네이션(review-queue UNIFIED_CTE 패턴 준용).
 *
 * 통합 source (근거: IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1):
 *   - shared_product_descriptions (master 직접) → source = source_type 파생(standard/supplier/operator/ai/...)
 *   - supplier_product_offers (master 직접) → source = supplier (원 offer, seed 이전 원본)
 *   - store_multilingual_product_content_groups → source = store/operator/supplier (source_type 파생),
 *       master 는 target_kind='listing' 일 때 organization_product_listings.master_id 로 파생(local=미연결)
 *   - operator_multilingual_product_content_groups → source = operator (원본 템플릿, target/master 미연결 → master 없음)
 *
 * 원칙: source 를 임의 확정하지 않는다. 파생 불가 시 'unknown'. status/language 는 source-native(정규화 안 함).
 * 주의: store/operator 다국어 그룹 테이블에는 deleted_at 이 없다(soft delete 미사용) → 참조 금지.
 */

import type { DataSource } from 'typeorm';

export interface ProductContentBrowseParams {
  q?: string;
  productMasterId?: string;
  source?: string;
  status?: string;
  language?: string;
  serviceKey?: string;
  hasProductMaster?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductContentBrowseRow {
  contentKind: string; // spd | supplier_offer | store_multilingual | operator_multilingual
  rowId: string;
  masterId: string | null;
  productName: string | null;
  manufacturerName: string | null;
  source: string; // standard/supplier/operator/store/ai_generated/public_source/imported/manual/unknown
  status: string | null; // source-native (정규화 안 함)
  language: string | null;
  serviceKey: string | null;
  title: string | null;
  summaryPreview: string | null;
  hasProductMaster: boolean;
  hasStoreCopy: boolean; // best-effort(페이지 master 기준 후처리). 미연결/미상 시 false
  updatedAt: string | null;
  extra: Record<string, unknown> | null;
}

/** 공통 14 컬럼으로 정규화한 UNION ALL CTE. 각 SELECT 컬럼 순서/타입 동일해야 함. */
const UNIFIED_CTE = `
  WITH unified AS (
    -- 1. SPD (master 직접)
    SELECT
      'spd'::text AS content_kind,
      s.id::text AS row_id,
      s.master_id AS master_id,
      pm.name AS product_name,
      pm.manufacturer_name AS manufacturer_name,
      (CASE s.source_type
         WHEN 'supplier' THEN 'supplier'
         WHEN 'operator' THEN 'operator'
         WHEN 'ai' THEN 'ai_generated'
         WHEN 'store_contribution' THEN 'store'
         WHEN 'manual' THEN 'manual'
         WHEN 'migration' THEN 'imported'
         WHEN 'mfds_easy_drug' THEN 'public_source'
         WHEN 'mfds_drug_otc_nutrition_combo' THEN 'public_source'
         WHEN 'drug_extension' THEN 'public_source'
         ELSE 'unknown' END)::text AS source,
      s.status::text AS status,
      COALESCE(s.language, 'ko')::text AS language,
      NULL::text AS service_key,
      COALESCE(pm.name, '')::text AS title,
      left(btrim(regexp_replace(COALESCE(s.summary, s.content, ''), '<[^>]*>', '', 'g')), 160)::text AS summary_preview,
      (s.master_id IS NOT NULL) AS has_product_master,
      s.updated_at AS updated_at,
      jsonb_build_object('descriptionType', s.description_type, 'sourceType', s.source_type) AS extra
    FROM shared_product_descriptions s
    LEFT JOIN product_masters pm ON pm.id = s.master_id
    WHERE s.deleted_at IS NULL

    UNION ALL

    -- 2. supplier_product_offers (master 직접, 원 offer)
    SELECT
      'supplier_offer'::text,
      o.id::text,
      o.master_id,
      pm.name,
      pm.manufacturer_name,
      'supplier'::text,
      o.approval_status::text,
      'ko'::text,
      (CASE WHEN array_length(o.service_keys, 1) IS NULL THEN NULL ELSE array_to_string(o.service_keys, ',') END)::text,
      pm.name,
      left(btrim(regexp_replace(COALESCE(o.consumer_short_description, o.consumer_detail_description, ''), '<[^>]*>', '', 'g')), 160)::text,
      (o.master_id IS NOT NULL),
      o.updated_at,
      jsonb_build_object(
        'hasConsumer', (btrim(regexp_replace(COALESCE(o.consumer_detail_description,'') || COALESCE(o.consumer_short_description,''), '<[^>]*>', '', 'g')) <> ''),
        'hasBusiness', (btrim(regexp_replace(COALESCE(o.business_detail_description,'') || COALESCE(o.business_short_description,''), '<[^>]*>', '', 'g')) <> '')
      )
    FROM supplier_product_offers o
    LEFT JOIN product_masters pm ON pm.id = o.master_id
    WHERE o.deleted_at IS NULL

    UNION ALL

    -- 3. store_multilingual (매장 사본; master 는 listing target 파생, deleted_at 없음)
    SELECT
      'store_multilingual'::text,
      g.id::text,
      opl.master_id,
      pm.name,
      pm.manufacturer_name,
      (CASE g.source_type
         WHEN 'operator_hub' THEN 'operator'
         WHEN 'supplier_offline_imported' THEN 'supplier'
         ELSE 'store' END)::text,
      g.status::text,
      g.default_locale::text,
      g.service_key::text,
      g.title::text,
      NULL::text,
      (opl.master_id IS NOT NULL),
      g.updated_at,
      jsonb_build_object('sourceType', g.source_type, 'targetKind', g.target_kind, 'organizationId', g.organization_id, 'hasPublicKey', (g.public_key IS NOT NULL))
    FROM store_multilingual_product_content_groups g
    LEFT JOIN organization_product_listings opl ON g.target_kind = 'listing' AND opl.id = g.target_id
    LEFT JOIN product_masters pm ON pm.id = opl.master_id

    UNION ALL

    -- 4. operator_multilingual (운영자 원본 템플릿; target/master 미연결)
    SELECT
      'operator_multilingual'::text,
      g.id::text,
      NULL::uuid,
      NULL::text,
      NULL::text,
      'operator'::text,
      g.status::text,
      g.default_locale::text,
      g.service_key::text,
      g.title::text,
      NULL::text,
      false,
      g.updated_at,
      jsonb_build_object('authorRole', g.author_role)
    FROM operator_multilingual_product_content_groups g
  )`;

export class ProductContentBrowseService {
  constructor(private dataSource: DataSource) {}

  private buildWhere(params: ProductContentBrowseParams): { sql: string; args: unknown[] } {
    const where: string[] = [];
    const args: unknown[] = [];
    const add = (clause: (i: number) => string, value: unknown) => {
      args.push(value);
      where.push(clause(args.length));
    };
    if (params.productMasterId) add((i) => `master_id = $${i}`, params.productMasterId);
    if (params.source) add((i) => `source = $${i}`, params.source);
    if (params.status) add((i) => `status = $${i}`, params.status);
    if (params.language) add((i) => `language = $${i}`, params.language);
    if (params.serviceKey) add((i) => `service_key = $${i}`, params.serviceKey);
    if (params.hasProductMaster === true) where.push(`has_product_master = true`);
    if (params.hasProductMaster === false) where.push(`has_product_master = false`);
    if (params.q?.trim()) {
      args.push(`%${params.q.trim()}%`);
      const i = args.length;
      where.push(`(product_name ILIKE $${i} OR title ILIKE $${i} OR master_id::text ILIKE $${i})`);
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  async list(params: ProductContentBrowseParams): Promise<{ items: ProductContentBrowseRow[]; total: number }> {
    const { sql: whereSql, args } = this.buildWhere(params);

    const countRows: { count: string }[] = await this.dataSource.query(
      `${UNIFIED_CTE} SELECT COUNT(*) AS count FROM unified ${whereSql}`,
      args,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const offset = Math.max(((params.page ?? 1) - 1) * limit, 0);

    const rows: any[] = await this.dataSource.query(
      `${UNIFIED_CTE}
       SELECT content_kind, row_id, master_id::text AS master_id, product_name, manufacturer_name,
         source, status, language, service_key, title, summary_preview, has_product_master, updated_at, extra
       FROM unified ${whereSql}
       ORDER BY updated_at DESC NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      args,
    );

    // hasStoreCopy: 페이지 결과의 master 기준 후처리(1회 조회). 미연결/미상 시 false.
    const masterIds = Array.from(new Set(rows.map((r) => r.master_id).filter(Boolean)));
    const storeCopyMasters = new Set<string>();
    if (masterIds.length > 0) {
      const scRows: Array<{ master_id: string }> = await this.dataSource.query(
        `SELECT DISTINCT opl.master_id::text AS master_id
           FROM store_multilingual_product_content_groups g
           JOIN organization_product_listings opl ON g.target_kind = 'listing' AND opl.id = g.target_id
          WHERE opl.master_id = ANY($1::uuid[])`,
        [masterIds],
      );
      for (const r of scRows) storeCopyMasters.add(r.master_id);
    }

    return {
      items: rows.map((r) => ({
        contentKind: r.content_kind,
        rowId: r.row_id,
        masterId: r.master_id,
        productName: r.product_name,
        manufacturerName: r.manufacturer_name,
        source: r.source,
        status: r.status,
        language: r.language,
        serviceKey: r.service_key,
        title: r.title,
        summaryPreview: r.summary_preview,
        hasProductMaster: r.has_product_master === true,
        hasStoreCopy: r.master_id ? storeCopyMasters.has(r.master_id) : false,
        updatedAt: r.updated_at,
        extra: r.extra ?? null,
      })),
      total,
    };
  }

  /** source/status/contentKind 분포(Toolbar/요약용). */
  async facets(): Promise<{
    sources: { value: string; count: number }[];
    contentKinds: { value: string; count: number }[];
  }> {
    const [sources, kinds]: [Array<{ value: string; count: number }>, Array<{ value: string; count: number }>] =
      await Promise.all([
        this.dataSource.query(`${UNIFIED_CTE} SELECT source AS value, count(*)::int AS count FROM unified GROUP BY source ORDER BY count DESC`),
        this.dataSource.query(`${UNIFIED_CTE} SELECT content_kind AS value, count(*)::int AS count FROM unified GROUP BY content_kind ORDER BY count DESC`),
      ]);
    return { sources, contentKinds: kinds };
  }
}
