/**
 * PlatformServiceCatalogService
 *
 * 플랫폼 서비스 카탈로그 관리.
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: enrollment 제거 → service_memberships 기반
 */

import { Repository, DataSource } from 'typeorm';
import { PlatformService } from '../entities/PlatformService.js';
import type { PlatformServiceStatus } from '../entities/PlatformService.js';

export type MembershipStatus = 'active' | 'pending' | 'suspended' | undefined;

export class PlatformServiceCatalogService {
  private serviceRepo: Repository<PlatformService>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.serviceRepo = dataSource.getRepository(PlatformService);
    this.dataSource = dataSource;
  }

  // ===== Service Catalog =====

  async listServices(filters?: { status?: PlatformServiceStatus }): Promise<PlatformService[]> {
    const qb = this.serviceRepo.createQueryBuilder('s');

    if (filters?.status) {
      qb.where('s.status = :status', { status: filters.status });
    }

    qb.orderBy('s.featuredOrder', 'ASC').addOrderBy('s.name', 'ASC');

    return qb.getMany();
  }

  async getServiceByCode(code: string): Promise<PlatformService | null> {
    return this.serviceRepo.findOne({ where: { code } });
  }

  async updateService(
    code: string,
    data: Partial<Pick<PlatformService, 'name' | 'shortDescription' | 'entryUrl' | 'serviceType' | 'approvalRequired' | 'visibilityPolicy' | 'isFeatured' | 'featuredOrder' | 'status' | 'iconEmoji'>>,
  ): Promise<PlatformService | null> {
    const service = await this.serviceRepo.findOne({ where: { code } });
    if (!service) return null;

    Object.assign(service, data);
    return this.serviceRepo.save(service);
  }

  // ===== User-Facing =====

  /**
   * 가시 서비스 목록 (로그인 시 service_memberships 기반 멤버십 상태 포함)
   *
   * WO-O4O-USER-DOMAIN-CLEANUP-V1: user_service_enrollments → service_memberships
   * 매핑: active → 'approved', pending → 'applied', suspended → 'rejected'
   */
  async listVisibleServicesForUser(userId?: string): Promise<Array<PlatformService & { enrollmentStatus?: string }>> {
    const services = await this.serviceRepo.find({
      where: { status: 'active' as PlatformServiceStatus },
      order: { featuredOrder: 'ASC', name: 'ASC' },
    });

    if (!userId) {
      return services.map((s) => ({ ...s, enrollmentStatus: undefined }));
    }

    // WO-O4O-USER-DOMAIN-CLEANUP-V1: service_memberships SSOT 기반
    const memberships: Array<{ service_key: string; status: string }> = await this.dataSource.query(
      `SELECT service_key, status FROM service_memberships WHERE user_id = $1`,
      [userId],
    );

    const membershipMap = new Map<string, string>();
    memberships.forEach((m) => {
      // Map service_memberships status to frontend-compatible enrollment status
      const mapped = m.status === 'active' ? 'approved'
        : m.status === 'pending' ? 'applied'
        : m.status === 'suspended' ? 'rejected'
        : undefined;
      if (mapped) membershipMap.set(m.service_key, mapped);
    });

    return services.map((s) => ({
      ...s,
      enrollmentStatus: membershipMap.get(s.code) || undefined,
    }));
  }
}
