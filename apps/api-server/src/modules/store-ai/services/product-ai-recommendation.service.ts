import type { DataSource } from 'typeorm';

/**
 * ProductAiRecommendationService — WO-O4O-AI-PRODUCT-RECOMMENDATION-V1
 *
 * AI 태그 유사도 + 판매 인기도 기반 상품 추천.
 *
 * 두 가지 추천 모드:
 * 1. recommendByTags — 태그 배열로 유사 상품 추천
 * 2. recommendForStore — 매장 기존 상품 태그 기반으로 미보유 상품 추천
 */

export interface RecommendedProduct {
  id: string;
  regulatoryName: string;
  marketingName: string;
  tags: string[];
  specification: string | null;
  categoryName: string | null;
  brandName: string | null;
  matchingTags: number;
  score: number;
  reason: string;
}

const DEFAULT_LIMIT = 10;

export class ProductAiRecommendationService {
  constructor(private dataSource: DataSource) {}

  /**
   * Tag-based recommendation: 주어진 태그와 일치하는 상품 추천.
   * Score = matching_tags * 0.6 + avg_confidence * 0.3 + normalized_popularity * 0.1
   */
  async recommendByTags(tags: string[], limit = DEFAULT_LIMIT): Promise<RecommendedProduct[]> {
    if (tags.length === 0) return [];

    const rows = await this.dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.marketing_name AS "marketingName",
         pm.tags,
         pm.specification,
         pc.name AS "categoryName",
         b.name AS "brandName",
         COUNT(DISTINCT pat.tag)::int AS "matchingTags",
         COALESCE(AVG(pat.confidence), 0)::float AS avg_confidence,
         COALESCE(snap.total_orders, 0)::int AS popularity
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       INNER JOIN product_ai_tags pat
         ON pat.product_id = pm.id AND pat.tag = ANY($1)
       LEFT JOIN (
         SELECT product_id, SUM(orders)::int AS total_orders
         FROM store_ai_product_snapshots
         WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY product_id
       ) snap ON snap.product_id = pm.id
       GROUP BY pm.id, pm.regulatory_name, pm.marketing_name, pm.tags,
                pm.specification, pc.name, b.name, snap.total_orders
       ORDER BY "matchingTags" DESC, avg_confidence DESC, popularity DESC
       LIMIT $2`,
      [tags, limit],
    );

    return this.mapResults(rows, tags);
  }

  /**
   * Store context recommendation: 매장 기존 상품 태그 기반으로 미보유 상품 추천.
   */
  async recommendForStore(organizationId: string, limit = DEFAULT_LIMIT): Promise<RecommendedProduct[]> {
    const rows = await this.dataSource.query(
      `WITH store_tags AS (
         SELECT DISTINCT tag
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         JOIN product_masters pm ON pm.id = spo.product_master_id
         CROSS JOIN LATERAL jsonb_array_elements_text(pm.tags) AS tag
         WHERE opl.organization_id = $1 AND opl.is_active = true
       ),
       store_products AS (
         SELECT spo.product_master_id
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         WHERE opl.organization_id = $1
       )
       SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.marketing_name AS "marketingName",
         pm.tags,
         pm.specification,
         pc.name AS "categoryName",
         b.name AS "brandName",
         COUNT(DISTINCT pat.tag)::int AS "matchingTags",
         COALESCE(AVG(pat.confidence), 0)::float AS avg_confidence,
         array_agg(DISTINCT pat.tag) AS matched_tag_list
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       INNER JOIN product_ai_tags pat
         ON pat.product_id = pm.id AND pat.tag IN (SELECT tag FROM store_tags)
       WHERE pm.id NOT IN (SELECT product_master_id FROM store_products WHERE product_master_id IS NOT NULL)
       GROUP BY pm.id, pm.regulatory_name, pm.marketing_name, pm.tags,
                pm.specification, pc.name, b.name
       ORDER BY "matchingTags" DESC, avg_confidence DESC
       LIMIT $2`,
      [organizationId, limit],
    );

    return rows.map((r: any) => {
      const matchedTags: string[] = r.matched_tag_list || [];
      const matchingTags = r.matchingTags || 0;
      const avgConf = Number(r.avg_confidence) || 0;
      const score = Math.round((matchingTags * 0.6 + avgConf * 0.4) * 100) / 100;

      return {
        id: r.id,
        regulatoryName: r.regulatoryName,
        marketingName: r.marketingName,
        tags: r.tags || [],
        specification: r.specification || null,
        categoryName: r.categoryName || null,
        brandName: r.brandName || null,
        matchingTags,
        score,
        reason: matchedTags.length > 0
          ? `${matchedTags.slice(0, 3).join(', ')} 태그 기반 추천`
          : '태그 유사도 기반 추천',
      };
    });
  }

  private mapResults(rows: any[], inputTags: string[]): RecommendedProduct[] {
    // Find max popularity for normalization
    const maxPop = Math.max(1, ...rows.map((r: any) => Number(r.popularity) || 0));

    return rows.map((r: any) => {
      const matchingTags = r.matchingTags || 0;
      const avgConf = Number(r.avg_confidence) || 0;
      const popularity = Number(r.popularity) || 0;
      const normPop = popularity / maxPop;

      const score = Math.round((matchingTags / Math.max(inputTags.length, 1) * 0.6 + avgConf * 0.3 + normPop * 0.1) * 100) / 100;

      // Build reason from matching tags
      const productTags: string[] = r.tags || [];
      const matchedList = productTags.filter((t: string) => inputTags.includes(t));
      const reason = matchedList.length > 0
        ? `${matchedList.slice(0, 3).join(', ')} 태그 기반 추천`
        : `${inputTags.slice(0, 2).join(', ')} 관련 추천`;

      return {
        id: r.id,
        regulatoryName: r.regulatoryName,
        marketingName: r.marketingName,
        tags: productTags,
        specification: r.specification || null,
        categoryName: r.categoryName || null,
        brandName: r.brandName || null,
        matchingTags,
        score,
        reason,
      };
    });
  }
}
