/**
 * PartnerOverviewService
 * 파트너 대시보드 Overview 데이터 제공
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * ⚠️ 매출/전환/성과 필드 절대 금지
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerContent } from '../entities/PartnerContent.js';
import { PartnerEvent } from '../entities/PartnerEvent.js';
import type { PartnerOverviewDto } from '../dto/partner.dto.js';

export class PartnerOverviewService {
  /**
   * Get overview summary for partner dashboard
   * Returns simple counts - no performance metrics
   */
  static async getOverview(
    partnerId: string,
    serviceId: string
  ): Promise<PartnerOverviewDto> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    // Count active contents
    const activeContentCount = await contentRepo.count({
      where: {
        partnerId,
        serviceId,
        isActive: true,
      },
    });

    // Count active events (ongoing)
    const now = new Date();
    const events = await eventRepo.find({
      where: {
        partnerId,
        serviceId,
        isActive: true,
      },
    });

    // Filter for currently active events (started and not ended)
    const activeEventCount = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return now >= start && now <= end;
    }).length;

    // Overall status based on activity
    const hasActivity = activeContentCount > 0 || activeEventCount > 0;
    const status: 'active' | 'inactive' = hasActivity ? 'active' : 'inactive';

    return {
      activeContentCount,
      activeEventCount,
      status,
    };
  }
}
