/**
 * Signage Content Mapper Service
 *
 * MVP Phase 1: Sample/Display 데이터 기반 Signage 콘텐츠 생성
 *
 * 매핑 규칙:
 * 1. 우선순위: OPERATION_ALERT > SAMPLE_PROMO > DISPLAY_HIGHLIGHT
 * 2. 샘플 사용량 상위 제품 → SAMPLE_PROMO
 * 3. 활성 진열 존재 → DISPLAY_HIGHLIGHT
 * 4. 재고 부족 or 미인증 진열 → OPERATION_ALERT
 */

import { DataSource } from 'typeorm';
import {
  SignageContent,
  SamplePromoContent,
  DisplayHighlightContent,
  OperationAlertContent,
  StoreSignageResponse,
  ContentGenerationOptions,
} from '../types/signage-content.types.js';

// Priority constants
const PRIORITY = {
  OPERATION_ALERT_CRITICAL: 100,
  OPERATION_ALERT_WARNING: 90,
  OPERATION_ALERT_INFO: 80,
  SAMPLE_PROMO: 50,
  DISPLAY_HIGHLIGHT: 30,
};

export class SignageContentMapperService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate signage contents for a store
   */
  async generateStoreContents(
    options: ContentGenerationOptions
  ): Promise<StoreSignageResponse> {
    const {
      storeId,
      maxItems = 10,
      includeAlerts = true,
      includeSamplePromo = true,
      includeDisplayHighlight = true,
    } = options;

    const contents: SignageContent[] = [];

    try {
      // 1. Get operation alerts (highest priority)
      if (includeAlerts) {
        const alerts = await this.getOperationAlerts(storeId);
        contents.push(...alerts);
      }

      // 2. Get sample promo contents
      if (includeSamplePromo) {
        const samplePromos = await this.getSamplePromoContents(storeId);
        contents.push(...samplePromos);
      }

      // 3. Get display highlight contents
      if (includeDisplayHighlight) {
        const displayHighlights = await this.getDisplayHighlightContents(storeId);
        contents.push(...displayHighlights);
      }

      // Sort by priority (descending) and limit
      const sortedContents = contents
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxItems);

      return {
        success: true,
        storeId,
        contents: sortedContents,
        displaySettings: {
          autoRotate: true,
          rotateInterval: 6000, // 6 seconds
          alertPriority: true,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[SignageContentMapper] Error generating contents:', error);
      return {
        success: false,
        storeId,
        contents: [],
        displaySettings: {
          autoRotate: true,
          rotateInterval: 6000,
          alertPriority: true,
        },
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get operation alerts for store
   */
  private async getOperationAlerts(storeId: string): Promise<OperationAlertContent[]> {
    const alerts: OperationAlertContent[] = [];

    try {
      // 1. Check low stock samples from cosmetics-seller-extension
      const lowStockSamples = await this.getLowStockSamples(storeId);
      for (const sample of lowStockSamples) {
        const isOutOfStock = sample.currentStock <= 0;
        alerts.push({
          type: 'OPERATION_ALERT',
          alertType: isOutOfStock ? 'out_of_stock' : 'low_stock',
          severity: isOutOfStock ? 'critical' : 'warning',
          title: isOutOfStock ? '샘플 소진' : '샘플 보충 필요',
          message: isOutOfStock
            ? `${sample.productName} 샘플이 모두 소진되었습니다`
            : `${sample.productName} 샘플이 부족합니다 (잔여: ${sample.currentStock}개)`,
          targetId: sample.productId,
          targetName: sample.productName,
          priority: isOutOfStock
            ? PRIORITY.OPERATION_ALERT_CRITICAL
            : PRIORITY.OPERATION_ALERT_WARNING,
        });
      }

      // 2. Check low stock inventory
      const lowStockInventory = await this.getLowStockInventory(storeId);
      for (const item of lowStockInventory) {
        alerts.push({
          type: 'OPERATION_ALERT',
          alertType: 'refill_needed',
          severity: 'warning',
          title: '재고 보충 필요',
          message: `${item.productName} 재고가 부족합니다 (잔여: ${item.currentStock}개)`,
          targetId: item.productId,
          targetName: item.productName,
          priority: PRIORITY.OPERATION_ALERT_WARNING,
        });
      }
    } catch (error) {
      console.error('[SignageContentMapper] Error fetching alerts:', error);
    }

    return alerts;
  }

  /**
   * Get sample promo contents based on usage data
   */
  private async getSamplePromoContents(storeId: string): Promise<SamplePromoContent[]> {
    const promos: SamplePromoContent[] = [];

    try {
      // Get popular samples from usage logs
      const popularSamples = await this.getPopularSamples(storeId);

      for (const sample of popularSamples.slice(0, 3)) {
        promos.push({
          type: 'SAMPLE_PROMO',
          title: '지금 체험 가능',
          message: `${sample.productName} - 고객님들이 가장 많이 체험하고 있어요!`,
          productId: sample.productId,
          productName: sample.productName,
          usageCount: sample.usageCount,
          conversionRate: sample.conversionRate,
          priority: PRIORITY.SAMPLE_PROMO,
        });
      }
    } catch (error) {
      console.error('[SignageContentMapper] Error fetching sample promos:', error);
    }

    return promos;
  }

  /**
   * Get display highlight contents
   */
  private async getDisplayHighlightContents(storeId: string): Promise<DisplayHighlightContent[]> {
    const highlights: DisplayHighlightContent[] = [];

    try {
      // Get active displays
      const activeDisplays = await this.getActiveDisplays(storeId);

      for (const display of activeDisplays.slice(0, 2)) {
        highlights.push({
          type: 'DISPLAY_HIGHLIGHT',
          title: '추천 진열대',
          message: display.displayName
            ? `${display.displayName}에서 특별 상품을 만나보세요`
            : '지금 주목받는 상품을 확인하세요',
          displayId: display.displayId,
          displayName: display.displayName,
          category: display.category,
          featured: display.isFeatured,
          priority: PRIORITY.DISPLAY_HIGHLIGHT,
        });
      }
    } catch (error) {
      console.error('[SignageContentMapper] Error fetching display highlights:', error);
    }

    return highlights;
  }

  // ============================================
  // Data Access Methods
  // ============================================

  /**
   * Get low stock samples from seller extension
   */
  private async getLowStockSamples(
    storeId: string
  ): Promise<Array<{ productId: string; productName: string; currentStock: number }>> {
    try {
      // Query cosmetics_seller_sample table
      const query = `
        SELECT
          "productId" as "productId",
          "productName" as "productName",
          "currentStock" as "currentStock"
        FROM cosmetics_seller_sample
        WHERE "sellerId" = $1
          AND "currentStock" <= "lowStockThreshold"
          AND "isActive" = true
        ORDER BY "currentStock" ASC
        LIMIT 5
      `;

      const results = await this.dataSource.query(query, [storeId]);
      return results;
    } catch (error) {
      // Table may not exist yet
      console.warn('[SignageContentMapper] Low stock samples query failed:', error);
      return [];
    }
  }

  /**
   * Get low stock inventory items
   */
  private async getLowStockInventory(
    storeId: string
  ): Promise<Array<{ productId: string; productName: string; currentStock: number }>> {
    try {
      const query = `
        SELECT
          "productId" as "productId",
          "productName" as "productName",
          "currentStock" as "currentStock"
        FROM cosmetics_seller_inventory
        WHERE "sellerId" = $1
          AND "currentStock" <= "lowStockThreshold"
          AND "isActive" = true
        ORDER BY "currentStock" ASC
        LIMIT 5
      `;

      const results = await this.dataSource.query(query, [storeId]);
      return results;
    } catch (error) {
      console.warn('[SignageContentMapper] Low stock inventory query failed:', error);
      return [];
    }
  }

  /**
   * Get popular samples based on usage
   */
  private async getPopularSamples(
    storeId: string
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      usageCount: number;
      conversionRate: number;
    }>
  > {
    try {
      // Query sample_usage_log from cosmetics-sample-display-extension
      const query = `
        SELECT
          "productId" as "productId",
          "productName" as "productName",
          SUM("quantityUsed")::int as "usageCount",
          CASE
            WHEN SUM("quantityUsed") > 0
            THEN ROUND((SUM(CASE WHEN "resultedInPurchase" = true THEN 1 ELSE 0 END)::numeric / SUM("quantityUsed") * 100), 1)
            ELSE 0
          END as "conversionRate"
        FROM sample_usage_log
        WHERE "storeId" = $1
          AND "usedAt" >= NOW() - INTERVAL '7 days'
        GROUP BY "productId", "productName"
        ORDER BY SUM("quantityUsed") DESC
        LIMIT 5
      `;

      const results = await this.dataSource.query(query, [storeId]);
      return results.map((r: any) => ({
        productId: r.productId,
        productName: r.productName,
        usageCount: Number(r.usageCount) || 0,
        conversionRate: Number(r.conversionRate) || 0,
      }));
    } catch (error) {
      console.warn('[SignageContentMapper] Popular samples query failed:', error);
      return [];
    }
  }

  /**
   * Get active displays for store
   */
  private async getActiveDisplays(
    storeId: string
  ): Promise<
    Array<{
      displayId: string;
      displayName: string;
      category: string;
      isFeatured: boolean;
    }>
  > {
    try {
      // Query cosmetics_seller_display from seller extension
      const query = `
        SELECT
          id as "displayId",
          name as "displayName",
          category as category,
          "isFeatured" as "isFeatured"
        FROM cosmetics_seller_display
        WHERE "sellerId" = $1
          AND "status" = 'active'
        ORDER BY "isFeatured" DESC, "updatedAt" DESC
        LIMIT 5
      `;

      const results = await this.dataSource.query(query, [storeId]);
      return results;
    } catch (error) {
      console.warn('[SignageContentMapper] Active displays query failed:', error);
      return [];
    }
  }
}

export default SignageContentMapperService;
