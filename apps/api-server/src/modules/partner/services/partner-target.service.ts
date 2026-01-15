/**
 * PartnerTargetService
 * 파트너 홍보 대상 조회 (Read Only)
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * ❌ POST / PATCH / DELETE 구현하지 않음
 */

import { AppDataSource } from '../../../database/connection.js';
import { PartnerTarget } from '../entities/PartnerTarget.js';
import type { PartnerTargetDto } from '../dto/partner.dto.js';

export class PartnerTargetService {
  /**
   * Get promotion targets for partner (Read Only)
   * These are assigned by the system/operator, not created by partner
   */
  static async getTargets(
    partnerId: string,
    serviceId: string
  ): Promise<PartnerTargetDto[]> {
    const targetRepo = AppDataSource.getRepository(PartnerTarget);

    const targets = await targetRepo.find({
      where: {
        partnerId,
        serviceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return targets.map((target) => ({
      id: target.id,
      name: target.name,
      type: target.type,
      serviceArea: target.serviceArea,
      address: target.address,
      description: target.description,
    }));
  }
}
