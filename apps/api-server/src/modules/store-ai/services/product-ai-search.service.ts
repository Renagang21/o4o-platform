import type { DataSource } from 'typeorm';

/**
 * ProductAiSearchService — WO-O4O-AI-TAG-SEARCH-V1
 *
 * AI 태그 + 상품명 기반 통합 검색.
 * product_ai_tags.tag (VARCHAR index) + product_masters name (ILIKE) 결합.
 * confidence 기반 스코어 정렬.
 */

export interface ProductSearchResult {
  id: string;
  regulatoryName: string;
  marketingName: string;
  tags: string[];
  specification: string | null;
  categoryName: string | null;
  brandName: string | null;
  score: number;
}

export class ProductAiSearchService {
  constructor(private dataSource: DataSource) {}

  /**
   * Search products by AI tag (partial match) + name fallback.
   * Uses product_ai_tags.tag index for partial matching and confidence scoring.
   */
  async searchByTag(query: string): Promise<ProductSearchResult[]> {
    const pattern = `%${query}%`;

    const rows = await this.dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.name AS "marketingName",
         pm.tags,
         pm.specification,
         pc.name AS "categoryName",
         b.name AS "brandName",
         COALESCE(MAX(pat.confidence), 0)::float AS score
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       LEFT JOIN product_ai_tags pat
         ON pat.product_id = pm.id AND pat.tag ILIKE $1
       WHERE
         pat.product_id IS NOT NULL
         OR pm.name ILIKE $1
         OR pm.regulatory_name ILIKE $1
       GROUP BY pm.id, pm.regulatory_name, pm.name, pm.tags,
                pm.specification, pc.name, b.name
       ORDER BY score DESC, pm.name ASC
       LIMIT 20`,
      [pattern],
    );

    return rows.map((r: any) => ({
      id: r.id,
      regulatoryName: r.regulatoryName,
      marketingName: r.marketingName,
      tags: r.tags || [],
      specification: r.specification || null,
      categoryName: r.categoryName || null,
      brandName: r.brandName || null,
      score: Number(r.score),
    }));
  }
}
