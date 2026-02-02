/**
 * PlatformServiceCatalogService
 *
 * 플랫폼 서비스 카탈로그 및 사용자 등록 관리.
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 */

import { Repository, DataSource } from 'typeorm';
import { PlatformService } from '../entities/PlatformService.js';
import { UserServiceEnrollment } from '../entities/UserServiceEnrollment.js';
import type { PlatformServiceStatus } from '../entities/PlatformService.js';
import type { EnrollmentStatus } from '../entities/UserServiceEnrollment.js';
import logger from '../utils/logger.js';

export class PlatformServiceCatalogService {
  private serviceRepo: Repository<PlatformService>;
  private enrollmentRepo: Repository<UserServiceEnrollment>;

  constructor(dataSource: DataSource) {
    this.serviceRepo = dataSource.getRepository(PlatformService);
    this.enrollmentRepo = dataSource.getRepository(UserServiceEnrollment);
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

  async listVisibleServicesForUser(userId?: string): Promise<Array<PlatformService & { enrollmentStatus?: EnrollmentStatus }>> {
    const services = await this.serviceRepo.find({
      where: { status: 'active' as PlatformServiceStatus },
      order: { featuredOrder: 'ASC', name: 'ASC' },
    });

    if (!userId) {
      return services.map((s) => ({ ...s, enrollmentStatus: undefined }));
    }

    const enrollments = await this.enrollmentRepo.find({
      where: { userId },
    });

    const enrollmentMap = new Map<string, EnrollmentStatus>();
    enrollments.forEach((e) => enrollmentMap.set(e.serviceCode, e.status));

    return services.map((s) => ({
      ...s,
      enrollmentStatus: enrollmentMap.get(s.code) || undefined,
    }));
  }

  async getUserEnrollments(userId: string): Promise<Array<UserServiceEnrollment & { service?: PlatformService }>> {
    return this.enrollmentRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.service', 'service')
      .where('e.userId = :userId', { userId })
      .andWhere('e.status IN (:...statuses)', { statuses: ['applied', 'approved'] })
      .orderBy('e.createdAt', 'DESC')
      .getMany() as Promise<Array<UserServiceEnrollment & { service?: PlatformService }>>;
  }

  async applyForService(userId: string, serviceCode: string): Promise<UserServiceEnrollment> {
    const service = await this.serviceRepo.findOne({ where: { code: serviceCode, status: 'active' as PlatformServiceStatus } });
    if (!service) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    // Check existing enrollment
    const existing = await this.enrollmentRepo.findOne({
      where: { userId, serviceCode },
    });

    if (existing) {
      if (existing.status === 'approved') {
        throw new Error('ALREADY_APPROVED');
      }
      if (existing.status === 'applied') {
        throw new Error('ALREADY_APPLIED');
      }
      // If rejected or not_applied, allow re-apply
      existing.status = 'applied';
      existing.appliedAt = new Date();
      existing.decidedAt = null as unknown as Date;
      existing.decidedBy = null as unknown as string;
      existing.note = null as unknown as string;
      return this.enrollmentRepo.save(existing);
    }

    // Auto-approve if service doesn't require approval
    const status: EnrollmentStatus = service.approvalRequired ? 'applied' : 'approved';

    const enrollment = this.enrollmentRepo.create({
      userId,
      serviceCode,
      status,
      appliedAt: new Date(),
      ...(status === 'approved' ? { decidedAt: new Date() } : {}),
    });

    return this.enrollmentRepo.save(enrollment);
  }

  // ===== Admin =====

  async listEnrollmentsByService(
    serviceCode: string,
    filters?: { status?: EnrollmentStatus },
  ): Promise<UserServiceEnrollment[]> {
    const qb = this.enrollmentRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.serviceCode = :serviceCode', { serviceCode });

    if (filters?.status) {
      qb.andWhere('e.status = :status', { status: filters.status });
    }

    qb.orderBy('e.appliedAt', 'DESC');

    return qb.getMany();
  }

  async reviewEnrollment(
    enrollmentId: string,
    status: 'approved' | 'rejected',
    decidedBy: string,
    note?: string,
  ): Promise<UserServiceEnrollment | null> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) return null;

    if (enrollment.status !== 'applied') {
      throw new Error('INVALID_STATUS');
    }

    enrollment.status = status;
    enrollment.decidedAt = new Date();
    enrollment.decidedBy = decidedBy;
    if (note) enrollment.note = note;

    logger.info(`[PlatformServiceCatalog] Enrollment ${enrollmentId} ${status} by ${decidedBy}`);

    return this.enrollmentRepo.save(enrollment);
  }
}
