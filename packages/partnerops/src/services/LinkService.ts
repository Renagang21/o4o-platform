/**
 * Link Service
 *
 * 파트너 제휴 링크 관리 서비스
 */

import type { DataSource } from 'typeorm';

export interface PartnerLink {
  id: string;
  partnerId: string;
  productId: string;
  routineId?: string;
  shortCode: string;
  originalUrl: string;
  trackingUrl: string;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLinkDto {
  productId: string;
  routineId?: string;
}

export interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  clicksByDate: Array<{ date: string; count: number }>;
}

export class LinkService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 링크 목록 조회
   */
  async list(tenantId: string, partnerId: string, filters?: { productId?: string }): Promise<PartnerLink[]> {
    if (!this.dataSource) {
      return [];
    }

    try {
      let query = `
        SELECT id, partner_id as "partnerId", product_id as "productId",
               routine_id as "routineId", short_code as "shortCode",
               original_url as "originalUrl", tracking_url as "trackingUrl",
               click_count as "clickCount", conversion_count as "conversionCount",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM partnerops_links
        WHERE partner_id = $1 AND tenant_id = $2
      `;
      const params: any[] = [partnerId, tenantId];

      if (filters?.productId) {
        query += ` AND product_id = $3`;
        params.push(filters.productId);
      }

      query += ` ORDER BY created_at DESC`;

      return await this.dataSource.query(query, params);
    } catch (error) {
      console.error('LinkService list error:', error);
      return [];
    }
  }

  /**
   * 링크 생성
   */
  async create(tenantId: string, partnerId: string, dto: CreateLinkDto): Promise<PartnerLink> {
    const shortCode = this.generateShortCode();
    const trackingUrl = `/go/${shortCode}`;

    if (!this.dataSource) {
      return this.createEmptyLink(partnerId, dto, shortCode, trackingUrl);
    }

    try {
      // 상품 정보에서 원본 URL 조회
      let originalUrl = '';
      if (dto.productId) {
        const product = await this.dataSource.query(
          `SELECT url FROM partnerops_products WHERE id = $1`,
          [dto.productId]
        );
        originalUrl = product[0]?.url || '';
      }

      const result = await this.dataSource.query(
        `INSERT INTO partnerops_links
         (tenant_id, partner_id, product_id, routine_id, short_code,
          original_url, tracking_url, click_count, conversion_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW(), NOW())
         RETURNING id, partner_id as "partnerId", product_id as "productId",
                   routine_id as "routineId", short_code as "shortCode",
                   original_url as "originalUrl", tracking_url as "trackingUrl",
                   click_count as "clickCount", conversion_count as "conversionCount",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [tenantId, partnerId, dto.productId, dto.routineId || null, shortCode, originalUrl, trackingUrl]
      );
      return result[0];
    } catch (error) {
      console.error('LinkService create error:', error);
      return this.createEmptyLink(partnerId, dto, shortCode, trackingUrl);
    }
  }

  /**
   * 링크 통계 조회
   */
  async getStats(tenantId: string, linkId: string): Promise<LinkStats> {
    if (!this.dataSource) {
      return this.getEmptyStats();
    }

    try {
      // 기본 통계
      const link = await this.dataSource.query(
        `SELECT click_count, conversion_count FROM partnerops_links
         WHERE id = $1 AND tenant_id = $2`,
        [linkId, tenantId]
      );

      if (!link[0]) return this.getEmptyStats();

      const totalClicks = link[0].click_count || 0;
      const conversions = link[0].conversion_count || 0;

      // 유니크 클릭 수
      const uniqueResult = await this.dataSource.query(
        `SELECT COUNT(DISTINCT visitor_id) as count FROM partnerops_clicks
         WHERE link_id = $1`,
        [linkId]
      );
      const uniqueClicks = parseInt(uniqueResult[0]?.count || '0');

      // 일별 클릭 수
      const clicksByDate = await this.dataSource.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM partnerops_clicks
         WHERE link_id = $1
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [linkId]
      );

      return {
        totalClicks,
        uniqueClicks,
        conversions,
        conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
        clicksByDate: clicksByDate.map((c: any) => ({
          date: c.date.toISOString().split('T')[0],
          count: parseInt(c.count),
        })),
      };
    } catch (error) {
      console.error('LinkService getStats error:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * 링크 삭제
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    if (!this.dataSource) {
      return false;
    }

    try {
      await this.dataSource.query(
        `DELETE FROM partnerops_links WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return true;
    } catch (error) {
      console.error('LinkService delete error:', error);
      return false;
    }
  }

  /**
   * 클릭 기록
   */
  async recordClick(tenantId: string, shortCode: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.dataSource) return;

    try {
      // 링크 조회
      const link = await this.dataSource.query(
        `SELECT id FROM partnerops_links WHERE short_code = $1 AND tenant_id = $2`,
        [shortCode, tenantId]
      );

      if (!link[0]) return;

      // 클릭 기록 생성
      await this.dataSource.query(
        `INSERT INTO partnerops_clicks
         (tenant_id, link_id, visitor_id, ip_address, user_agent, referer, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          tenantId,
          link[0].id,
          metadata?.visitorId || null,
          metadata?.ipAddress || null,
          metadata?.userAgent || null,
          metadata?.referer || null,
        ]
      );

      // 링크 클릭 카운트 증가
      await this.dataSource.query(
        `UPDATE partnerops_links SET click_count = click_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [link[0].id]
      );
    } catch (error) {
      console.error('LinkService recordClick error:', error);
    }
  }

  /**
   * 단축 코드로 링크 조회
   */
  async findByShortCode(tenantId: string, shortCode: string): Promise<PartnerLink | null> {
    if (!this.dataSource) return null;

    try {
      const result = await this.dataSource.query(
        `SELECT id, partner_id as "partnerId", product_id as "productId",
                routine_id as "routineId", short_code as "shortCode",
                original_url as "originalUrl", tracking_url as "trackingUrl",
                click_count as "clickCount", conversion_count as "conversionCount",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM partnerops_links
         WHERE short_code = $1 AND tenant_id = $2`,
        [shortCode, tenantId]
      );
      return result[0] || null;
    } catch (error) {
      console.error('LinkService findByShortCode error:', error);
      return null;
    }
  }

  /**
   * 단축 코드 생성
   */
  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private createEmptyLink(partnerId: string, dto: CreateLinkDto, shortCode: string, trackingUrl: string): PartnerLink {
    return {
      id: '',
      partnerId,
      productId: dto.productId,
      routineId: dto.routineId,
      shortCode,
      originalUrl: '',
      trackingUrl,
      clickCount: 0,
      conversionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getEmptyStats(): LinkStats {
    return {
      totalClicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      conversionRate: 0,
      clicksByDate: [],
    };
  }
}

export const linkService = new LinkService();
export default linkService;
