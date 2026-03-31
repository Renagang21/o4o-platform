import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NeturePartnerRecruitment,
  NeturePartnerApplication,
  NeturePartnerDashboardItem,
  NetureSellerPartnerContract,
  ContractStatus,
  ContractTerminatedBy,
  RecruitmentStatus,
  ApplicationStatus,
} from '../entities/index.js';
import { NeturePartner } from '../../../routes/neture/entities/neture-partner.entity.js';
import { ServiceMembership } from '../../auth/entities/ServiceMembership.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';

/**
 * NeturePartnerContractService
 *
 * Partner recruitment, application (approve/reject), contract CRUD.
 * Merged G5 (PartnerApplication) + G6 (Contract) because approvePartnerApplication
 * uses a transaction spanning both application and contract repositories.
 *
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1 Phase 2).
 */
export class NeturePartnerContractService {
  // Lazy repositories
  private _recruitmentRepo?: Repository<NeturePartnerRecruitment>;
  private _applicationRepo?: Repository<NeturePartnerApplication>;
  private _contractRepo?: Repository<NetureSellerPartnerContract>;
  private _partnerEntityRepo?: Repository<NeturePartner>;
  private _membershipRepo?: Repository<ServiceMembership>;

  private get recruitmentRepo(): Repository<NeturePartnerRecruitment> {
    if (!this._recruitmentRepo) {
      this._recruitmentRepo = AppDataSource.getRepository(NeturePartnerRecruitment);
    }
    return this._recruitmentRepo;
  }

  private get applicationRepo(): Repository<NeturePartnerApplication> {
    if (!this._applicationRepo) {
      this._applicationRepo = AppDataSource.getRepository(NeturePartnerApplication);
    }
    return this._applicationRepo;
  }

  private get contractRepo(): Repository<NetureSellerPartnerContract> {
    if (!this._contractRepo) {
      this._contractRepo = AppDataSource.getRepository(NetureSellerPartnerContract);
    }
    return this._contractRepo;
  }

  private get partnerEntityRepo(): Repository<NeturePartner> {
    if (!this._partnerEntityRepo) {
      this._partnerEntityRepo = AppDataSource.getRepository(NeturePartner);
    }
    return this._partnerEntityRepo;
  }

  private get membershipRepo(): Repository<ServiceMembership> {
    if (!this._membershipRepo) {
      this._membershipRepo = AppDataSource.getRepository(ServiceMembership);
    }
    return this._membershipRepo;
  }

  // ==================== User-Partner Linking (WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1) ====================

  /**
   * Get partner by user ID
   */
  async getPartnerByUserId(userId: string): Promise<NeturePartner | null> {
    try {
      return await this.partnerEntityRepo.findOne({
        where: { userId },
      });
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error finding partner by user ID:', error);
      return null;
    }
  }

  // ==================== Partner Recruitment (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

  /**
   * 파트너 모집 목록 조회
   */
  async getPartnerRecruitments(filters?: { status?: RecruitmentStatus }) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.status) {
        where.status = filters.status;
      }

      const recruitments = await this.recruitmentRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

      return recruitments.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        manufacturer: r.manufacturer || '',
        consumerPrice: Number(r.consumerPrice),
        commissionRate: Number(r.commissionRate),
        sellerId: r.sellerId,
        sellerName: r.sellerName,
        shopUrl: r.shopUrl || '',
        serviceName: r.serviceName || '',
        serviceId: r.serviceId || '',
        imageUrl: r.imageUrl || '',
        status: r.status,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error fetching partner recruitments:', error);
      throw error;
    }
  }

  /**
   * 파트너 신청
   */
  async createPartnerApplication(recruitmentId: string, partnerId: string, partnerName: string) {
    try {
      // 모집 공고 확인
      const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.status !== RecruitmentStatus.RECRUITING) {
        throw new Error('RECRUITMENT_CLOSED');
      }

      // 중복 신청 확인
      const existing = await this.applicationRepo.findOne({
        where: { recruitmentId, partnerId },
      });
      if (existing) {
        throw new Error('DUPLICATE_APPLICATION');
      }

      const application = this.applicationRepo.create({
        recruitmentId,
        partnerId,
        partnerName,
        status: ApplicationStatus.PENDING,
        appliedAt: new Date(),
      });

      const saved = await this.applicationRepo.save(application);
      logger.info(`[NeturePartnerContractService] Partner application created: ${saved.id}`);

      return { id: saved.id, status: saved.status, appliedAt: saved.appliedAt };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error creating partner application:', error);
      throw error;
    }
  }

  /**
   * 파트너 신청 승인 + 대시보드 자동 등록
   */
  async approvePartnerApplication(applicationId: string, sellerId: string) {
    try {
      // 사전 검증 (트랜잭션 외부 — read-only 검증)
      const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
      if (!application) {
        throw new Error('APPLICATION_NOT_FOUND');
      }
      if (application.status !== ApplicationStatus.PENDING) {
        throw new Error('INVALID_STATUS');
      }

      const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.sellerId !== sellerId) {
        throw new Error('NOT_RECRUITMENT_OWNER');
      }

      // 트랜잭션: 승인 + 계약 생성 + 대시보드 등록 (WO-NETURE-SELLER-PARTNER-CONTRACT-ATOMICITY-PATCH-V1)
      await AppDataSource.transaction(async (manager) => {
        // 1. Active 계약 중복 체크 (선행)
        const txContractRepo = manager.getRepository(NetureSellerPartnerContract);
        const existingContract = await txContractRepo.findOne({
          where: { sellerId: recruitment.sellerId, partnerId: application.partnerId, contractStatus: ContractStatus.ACTIVE },
        });
        if (existingContract) {
          throw new Error('ACTIVE_CONTRACT_EXISTS');
        }

        // 2. Application 승인
        const txApplicationRepo = manager.getRepository(NeturePartnerApplication);
        application.status = ApplicationStatus.APPROVED;
        application.decidedAt = new Date();
        application.decidedBy = sellerId;
        await txApplicationRepo.save(application);

        // 3. 계약 생성
        const contract = txContractRepo.create({
          sellerId: recruitment.sellerId,
          partnerId: application.partnerId,
          recruitmentId: recruitment.id,
          applicationId: application.id,
          commissionRate: recruitment.commissionRate,
          startedAt: new Date(),
        });
        await txContractRepo.save(contract);
        logger.info(`[NeturePartnerContractService] Contract created: ${contract.id} (seller=${recruitment.sellerId}, partner=${application.partnerId})`);

        // 4. 파트너 대시보드에 자동 등록
        const txDashboardRepo = manager.getRepository(NeturePartnerDashboardItem);
        const existingItem = await txDashboardRepo.findOne({
          where: { partnerUserId: application.partnerId, productId: recruitment.productId },
        });

        if (!existingItem) {
          const item = txDashboardRepo.create({
            partnerUserId: application.partnerId,
            productId: recruitment.productId,
            serviceId: recruitment.serviceId || 'glycopharm',
            status: 'active',
          });
          await txDashboardRepo.save(item);
          logger.info(`[NeturePartnerContractService] Auto-added dashboard item for partner ${application.partnerId}`);
        }
      });

      // WO-NETURE-PARTNER-RBAC-ASSIGNMENT-FIX-V1: Sync membership + RBAC (matches supplier approval pattern)
      if (application.partnerId) {
        // 1. Service membership: ensure active
        const membership = await this.membershipRepo.findOne({
          where: { userId: application.partnerId, serviceKey: 'neture' },
        });
        if (membership && membership.status !== 'active') {
          membership.status = 'active';
          await this.membershipRepo.save(membership);
          logger.info(`[NeturePartnerContractService] Membership activated for partner user ${application.partnerId}`);
        }

        // 2. RBAC: assign partner role (WO-NETURE-ROLE-NORMALIZATION-V1: unprefixed)
        await roleAssignmentService.assignRole({
          userId: application.partnerId,
          role: 'partner',
          assignedBy: sellerId,
        });
        logger.info(`[NeturePartnerContractService] Role partner assigned to user ${application.partnerId}`);
      }

      return { id: application.id, status: application.status };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error approving partner application:', error);
      throw error;
    }
  }

  /**
   * 파트너 신청 거절
   */
  async rejectPartnerApplication(applicationId: string, sellerId: string, reason?: string) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
      if (!application) {
        throw new Error('APPLICATION_NOT_FOUND');
      }
      if (application.status !== ApplicationStatus.PENDING) {
        throw new Error('INVALID_STATUS');
      }

      // 모집 주체 확인
      const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.sellerId !== sellerId) {
        throw new Error('NOT_RECRUITMENT_OWNER');
      }

      application.status = ApplicationStatus.REJECTED;
      application.decidedAt = new Date();
      application.decidedBy = sellerId;
      application.reason = reason || '';
      await this.applicationRepo.save(application);

      return { id: application.id, status: application.status };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error rejecting partner application:', error);
      throw error;
    }
  }

  // ==================== Seller-Partner Contracts (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

  /**
   * 계약 해지 (seller 또는 partner)
   */
  async terminateContract(
    contractId: string,
    actorId: string,
    actorType: 'seller' | 'partner',
  ) {
    const where =
      actorType === 'seller'
        ? { id: contractId, sellerId: actorId }
        : { id: contractId, partnerId: actorId };

    const contract = await this.contractRepo.findOne({ where });
    if (!contract) {
      throw new Error('CONTRACT_NOT_FOUND');
    }
    if (contract.contractStatus !== ContractStatus.ACTIVE) {
      throw new Error('CONTRACT_NOT_ACTIVE');
    }

    contract.contractStatus = ContractStatus.TERMINATED;
    contract.terminatedBy = actorType === 'seller' ? ContractTerminatedBy.SELLER : ContractTerminatedBy.PARTNER;
    contract.endedAt = new Date();
    const saved = await this.contractRepo.save(contract);

    logger.info(`[NeturePartnerContractService] Contract terminated: ${contractId} by ${actorType} ${actorId}`);
    return saved;
  }

  /**
   * Seller 계약 목록 조회
   */
  async getSellerContracts(sellerId: string, status?: string) {
    const where: { sellerId: string; contractStatus?: ContractStatus } = { sellerId };
    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.contractStatus = status as ContractStatus;
    }
    return this.contractRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /**
   * Partner 계약 목록 조회
   */
  async getPartnerContracts(partnerId: string, status?: string) {
    const where: { partnerId: string; contractStatus?: ContractStatus } = { partnerId };
    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.contractStatus = status as ContractStatus;
    }
    return this.contractRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /**
   * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
   */
  async updateCommissionRate(contractId: string, newRate: number, sellerId: string) {
    const existing = await this.contractRepo.findOne({
      where: { id: contractId, sellerId, contractStatus: ContractStatus.ACTIVE },
    });
    if (!existing) {
      throw new Error('ACTIVE_CONTRACT_NOT_FOUND');
    }

    // 기존 계약 종료
    existing.contractStatus = ContractStatus.TERMINATED;
    existing.terminatedBy = ContractTerminatedBy.SELLER;
    existing.endedAt = new Date();
    await this.contractRepo.save(existing);

    // 신규 계약 생성 (새 commission_rate)
    const newContract = this.contractRepo.create({
      sellerId: existing.sellerId,
      partnerId: existing.partnerId,
      recruitmentId: existing.recruitmentId,
      applicationId: existing.applicationId,
      commissionRate: newRate,
      startedAt: new Date(),
    });
    const saved = await this.contractRepo.save(newContract);

    logger.info(`[NeturePartnerContractService] Commission updated: old=${contractId} terminated, new=${saved.id} rate=${newRate}`);
    return { terminated: { id: existing.id }, created: saved };
  }
}
