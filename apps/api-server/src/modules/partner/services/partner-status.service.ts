/**
 * PartnerStatusService
 * 파트너 콘텐츠/이벤트 상태 조회
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * 👉 집계/분석 없음
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerContent } from '../entities/PartnerContent.js';
import { PartnerEvent } from '../entities/PartnerEvent.js';
import type { PartnerStatusDto } from '../dto/partner.dto.js';

export class PartnerStatusService {
  /**
   * Get status of all contents and events
   */
  static async getStatus(
    partnerId: string,
    serviceId: string
  ): Promise<PartnerStatusDto> {
    const contentRepo = AppDataSource.getRepository(PartnerContent);
    const eventRepo = AppDataSource.getRepository(PartnerEvent);

    // Get all contents
    const contents = await contentRepo.find({
      where: {
        partnerId,
        serviceId,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    // Get all events
    const events = await eventRepo.find({
      where: {
        partnerId,
        serviceId,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    return {
      contents: contents.map((content) => ({
        id: content.id,
        name: content.title,
        status: content.getStatus(),
      })),
      events: events.map((event) => {
        // Map event status to the expected format
        const eventStatus = event.getStatus();
        let mappedStatus: 'active' | 'ongoing' | 'ended';

        if (eventStatus === 'active') {
          mappedStatus = 'ongoing';
        } else if (eventStatus === 'scheduled') {
          mappedStatus = 'active'; // scheduled is considered active but not yet ongoing
        } else {
          mappedStatus = 'ended';
        }

        return {
          id: event.id,
          name: event.name,
          status: mappedStatus,
        };
      }),
    };
  }
}
