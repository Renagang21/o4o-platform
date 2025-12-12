/**
 * Dashboard Service
 *
 * 파트너 대시보드 데이터 조회 서비스 (Partner-Core 기반)
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import {
  Partner,
  PartnerService,
  PartnerClickService,
  PartnerConversionService,
  PartnerCommissionService,
  PartnerSettlementService,
  executeValidatePartnerVisibility,
} from '@o4o/partner-core';
import type { DashboardSummaryDto } from '../dto/index.js';

export class DashboardService {
  private partnerService: PartnerService;
  private clickService: PartnerClickService;
  private conversionService: PartnerConversionService;
  private commissionService: PartnerCommissionService;
  private settlementService: PartnerSettlementService;

  constructor(
    partnerRepository: Repository<Partner>,
    private readonly repositories: {
      link: Repository<any>;
      click: Repository<any>;
      conversion: Repository<any>;
      commission: Repository<any>;
      settlement: Repository<any>;
    }
  ) {
    this.partnerService = new PartnerService(partnerRepository);
    this.clickService = new PartnerClickService(
      repositories.click,
      repositories.link,
      partnerRepository
    );
    this.conversionService = new PartnerConversionService(
      repositories.conversion,
      repositories.click,
      repositories.link,
      partnerRepository
    );
    this.commissionService = new PartnerCommissionService(
      repositories.commission,
      repositories.conversion,
      partnerRepository,
      repositories.settlement
    );
    this.settlementService = new PartnerSettlementService(
      repositories.settlement,
      repositories.commission,
      partnerRepository
    );
  }

  /**
   * 대시보드 요약 정보 조회 (Partner-Core 기반)
   */
  async getSummary(partnerId: string): Promise<DashboardSummaryDto> {
    // Partner 조회
    const partner = await this.partnerService.findById(partnerId);
    if (!partner) {
      return this.getEmptySummary(partnerId);
    }

    // Partner-Core 서비스에서 통계 조회
    const [clickStats, conversionStats, commissionStats, settlementStats] =
      await Promise.all([
        this.clickService.getStatsByPartnerId(partnerId),
        this.conversionService.getStatsByPartnerId(partnerId),
        this.commissionService.getStatsByPartnerId(partnerId),
        this.settlementService.getStatsByPartnerId(partnerId),
      ]);

    // 오늘 통계
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClickStats = await this.clickService.getStatsByPartnerId(
      partnerId,
      today
    );

    return {
      partnerId,
      partnerLevel: partner.level,
      partnerStatus: partner.status,

      // Partner-Core 통계
      totalClicks: partner.clickCount,
      totalConversions: partner.conversionCount,
      conversionRate: clickStats.conversionRate,
      totalEarnings: Number(partner.totalCommission),
      pendingEarnings: commissionStats.pendingAmount,
      settledEarnings: commissionStats.settledAmount,

      // 오늘 통계
      todayClicks: todayClickStats.totalClicks,
      todayConversions: todayClickStats.convertedClicks,
      todayEarnings: 0, // 오늘 커미션은 별도 조회 필요

      // 최근 활동 (간단히 빈 배열 반환, 추후 이벤트 로그 구현)
      recentActivity: [],
    };
  }

  /**
   * 기간별 통계 조회
   */
  async getStatsByPeriod(
    partnerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    clicks: number[];
    conversions: number[];
    earnings: number[];
    labels: string[];
  }> {
    const dailyStats = await this.clickService.getDailyStats(
      partnerId,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      clicks: dailyStats.map((d) => d.clicks),
      conversions: dailyStats.map((d) => d.conversions),
      earnings: [], // 일별 earnings는 별도 구현 필요
      labels: dailyStats.map((d) => d.date),
    };
  }

  /**
   * productType 필터링 적용 여부 확인
   */
  async isProductTypeAllowed(
    partnerId: string,
    productType?: string
  ): Promise<boolean> {
    const result = await executeValidatePartnerVisibility({
      partnerId,
      productType,
    });
    return result.visible;
  }

  private getEmptySummary(partnerId: string): DashboardSummaryDto {
    return {
      partnerId,
      partnerLevel: 'newbie',
      partnerStatus: 'pending',
      totalClicks: 0,
      totalConversions: 0,
      conversionRate: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      settledEarnings: 0,
      todayClicks: 0,
      todayConversions: 0,
      todayEarnings: 0,
      recentActivity: [],
    };
  }
}

// Factory function for creating service instance
export function createDashboardService(
  partnerRepository: Repository<Partner>,
  repositories: {
    link: Repository<any>;
    click: Repository<any>;
    conversion: Repository<any>;
    commission: Repository<any>;
    settlement: Repository<any>;
  }
): DashboardService {
  return new DashboardService(partnerRepository, repositories);
}
