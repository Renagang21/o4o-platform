/**
 * Dashboard Service
 *
 * 파트너 대시보드 데이터 조회 서비스
 */

import type { DataSource } from 'typeorm';

export interface DashboardSummary {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

export class DashboardService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 대시보드 요약 정보 조회
   */
  async getSummary(tenantId: string, partnerId: string): Promise<DashboardSummary> {
    if (!this.dataSource) {
      return this.getEmptySummary();
    }

    try {
      // 클릭 수 조회
      const clicksResult = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM partnerops_clicks
         WHERE partner_id = $1 AND tenant_id = $2`,
        [partnerId, tenantId]
      );
      const totalClicks = parseInt(clicksResult[0]?.count || '0');

      // 전환 수 조회
      const conversionsResult = await this.dataSource.query(
        `SELECT COUNT(*) as count,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_earnings,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings
         FROM partnerops_conversions
         WHERE partner_id = $1 AND tenant_id = $2`,
        [partnerId, tenantId]
      );
      const totalConversions = parseInt(conversionsResult[0]?.count || '0');
      const totalEarnings = parseFloat(conversionsResult[0]?.total_earnings || '0');
      const pendingEarnings = parseFloat(conversionsResult[0]?.pending_earnings || '0');

      // 전환율 계산
      const conversionRate = totalClicks > 0
        ? (totalConversions / totalClicks) * 100
        : 0;

      // 최근 활동 조회
      const recentActivity = await this.getRecentActivity(tenantId, partnerId);

      return {
        totalClicks,
        totalConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalEarnings,
        pendingEarnings,
        recentActivity,
      };
    } catch (error) {
      console.error('Dashboard getSummary error:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * 기간별 통계 조회
   */
  async getStatsByPeriod(
    tenantId: string,
    partnerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    clicks: number[];
    conversions: number[];
    earnings: number[];
    labels: string[];
  }> {
    // TODO: 기간별 집계 쿼리 구현
    return {
      clicks: [],
      conversions: [],
      earnings: [],
      labels: [],
    };
  }

  /**
   * 최근 활동 조회
   */
  private async getRecentActivity(
    tenantId: string,
    partnerId: string
  ): Promise<Array<{ type: string; description: string; timestamp: Date }>> {
    if (!this.dataSource) return [];

    try {
      const result = await this.dataSource.query(
        `SELECT type, description, created_at as timestamp
         FROM partnerops_activities
         WHERE partner_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [partnerId, tenantId]
      );
      return result || [];
    } catch {
      return [];
    }
  }

  private getEmptySummary(): DashboardSummary {
    return {
      totalClicks: 0,
      totalConversions: 0,
      conversionRate: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      recentActivity: [],
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
