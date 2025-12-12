/**
 * Supplier Approval Service
 *
 * Seller/Partner 승인 관리
 */

import { Repository, DataSource } from 'typeorm';
import { SupplierApproval, ApprovalType, ApprovalStatus } from '../entities/supplier-approval.entity';

export interface RequestApprovalDto {
  supplierId: string;
  type: ApprovalType;
  sellerId?: string;
  partnerId?: string;
  applicantName?: string;
  storeName?: string;
  businessNumber?: string;
  requestMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ApproveDto {
  approvedBy: string;
  commissionRate?: number;
  specialTerms?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  approvedProducts?: string[];
  approvedCategories?: string[];
}

export interface RejectDto {
  rejectedBy: string;
  rejectionReason: string;
}

export interface ApprovalFilter {
  supplierId: string;
  type?: ApprovalType;
  status?: ApprovalStatus;
  sellerId?: string;
  partnerId?: string;
}

export class SupplierApprovalService {
  private repository: Repository<SupplierApproval>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SupplierApproval);
  }

  /**
   * Request approval
   */
  async requestApproval(dto: RequestApprovalDto): Promise<SupplierApproval> {
    // Check if already exists
    const existing = await this.repository.findOne({
      where: {
        supplierId: dto.supplierId,
        type: dto.type,
        ...(dto.sellerId && { sellerId: dto.sellerId }),
        ...(dto.partnerId && { partnerId: dto.partnerId }),
      },
    });

    if (existing && existing.status !== 'rejected' && existing.status !== 'revoked') {
      throw new Error('Approval request already exists');
    }

    const approval = this.repository.create({
      ...dto,
      status: 'pending',
      requestedAt: new Date(),
    });

    return this.repository.save(approval);
  }

  /**
   * Get approval by ID
   */
  async findById(id: string): Promise<SupplierApproval | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * List approvals with filter
   */
  async findAll(filter: ApprovalFilter): Promise<SupplierApproval[]> {
    const qb = this.repository.createQueryBuilder('approval');

    qb.where('approval.supplierId = :supplierId', { supplierId: filter.supplierId });

    if (filter.type) {
      qb.andWhere('approval.type = :type', { type: filter.type });
    }

    if (filter.status) {
      qb.andWhere('approval.status = :status', { status: filter.status });
    }

    if (filter.sellerId) {
      qb.andWhere('approval.sellerId = :sellerId', { sellerId: filter.sellerId });
    }

    if (filter.partnerId) {
      qb.andWhere('approval.partnerId = :partnerId', { partnerId: filter.partnerId });
    }

    qb.orderBy('approval.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(supplierId: string): Promise<SupplierApproval[]> {
    return this.findAll({ supplierId, status: 'pending' });
  }

  /**
   * Approve seller
   */
  async approveSeller(
    supplierId: string,
    sellerId: string,
    dto: ApproveDto
  ): Promise<SupplierApproval | null> {
    const approval = await this.repository.findOne({
      where: { supplierId, sellerId, type: 'seller', status: 'pending' },
    });

    if (!approval) {
      return null;
    }

    approval.status = 'approved';
    approval.approvedAt = new Date();
    approval.approvedBy = dto.approvedBy;
    approval.commissionRate = dto.commissionRate;
    approval.specialTerms = dto.specialTerms;
    approval.contractStartDate = dto.contractStartDate;
    approval.contractEndDate = dto.contractEndDate;
    approval.approvedProducts = dto.approvedProducts;
    approval.approvedCategories = dto.approvedCategories;

    return this.repository.save(approval);
  }

  /**
   * Approve partner
   */
  async approvePartner(
    supplierId: string,
    partnerId: string,
    dto: ApproveDto
  ): Promise<SupplierApproval | null> {
    const approval = await this.repository.findOne({
      where: { supplierId, partnerId, type: 'partner', status: 'pending' },
    });

    if (!approval) {
      return null;
    }

    approval.status = 'approved';
    approval.approvedAt = new Date();
    approval.approvedBy = dto.approvedBy;
    approval.commissionRate = dto.commissionRate;
    approval.specialTerms = dto.specialTerms;
    approval.contractStartDate = dto.contractStartDate;
    approval.contractEndDate = dto.contractEndDate;
    approval.approvedProducts = dto.approvedProducts;
    approval.approvedCategories = dto.approvedCategories;

    return this.repository.save(approval);
  }

  /**
   * Reject seller
   */
  async rejectSeller(
    supplierId: string,
    sellerId: string,
    dto: RejectDto
  ): Promise<SupplierApproval | null> {
    const approval = await this.repository.findOne({
      where: { supplierId, sellerId, type: 'seller', status: 'pending' },
    });

    if (!approval) {
      return null;
    }

    approval.status = 'rejected';
    approval.rejectedAt = new Date();
    approval.rejectedBy = dto.rejectedBy;
    approval.rejectionReason = dto.rejectionReason;

    return this.repository.save(approval);
  }

  /**
   * Reject partner
   */
  async rejectPartner(
    supplierId: string,
    partnerId: string,
    dto: RejectDto
  ): Promise<SupplierApproval | null> {
    const approval = await this.repository.findOne({
      where: { supplierId, partnerId, type: 'partner', status: 'pending' },
    });

    if (!approval) {
      return null;
    }

    approval.status = 'rejected';
    approval.rejectedAt = new Date();
    approval.rejectedBy = dto.rejectedBy;
    approval.rejectionReason = dto.rejectionReason;

    return this.repository.save(approval);
  }

  /**
   * Suspend approval
   */
  async suspend(id: string, reason: string): Promise<SupplierApproval | null> {
    const approval = await this.findById(id);
    if (!approval || approval.status !== 'approved') {
      return null;
    }

    approval.status = 'suspended';
    approval.rejectionReason = reason;

    return this.repository.save(approval);
  }

  /**
   * Revoke approval
   */
  async revoke(id: string, reason: string): Promise<SupplierApproval | null> {
    const approval = await this.findById(id);
    if (!approval) {
      return null;
    }

    approval.status = 'revoked';
    approval.rejectionReason = reason;

    return this.repository.save(approval);
  }

  /**
   * Check if seller is approved by supplier
   */
  async isSellerApproved(supplierId: string, sellerId: string): Promise<boolean> {
    const approval = await this.repository.findOne({
      where: { supplierId, sellerId, type: 'seller', status: 'approved' },
    });
    return !!approval;
  }

  /**
   * Check if partner is approved by supplier
   */
  async isPartnerApproved(supplierId: string, partnerId: string): Promise<boolean> {
    const approval = await this.repository.findOne({
      where: { supplierId, partnerId, type: 'partner', status: 'approved' },
    });
    return !!approval;
  }

  /**
   * Get approval stats
   */
  async getStats(supplierId: string): Promise<{
    totalSellers: number;
    approvedSellers: number;
    pendingSellers: number;
    totalPartners: number;
    approvedPartners: number;
    pendingPartners: number;
  }> {
    const approvals = await this.repository.find({
      where: { supplierId },
      select: ['type', 'status'],
    });

    const sellers = approvals.filter((a) => a.type === 'seller');
    const partners = approvals.filter((a) => a.type === 'partner');

    return {
      totalSellers: sellers.length,
      approvedSellers: sellers.filter((s) => s.status === 'approved').length,
      pendingSellers: sellers.filter((s) => s.status === 'pending').length,
      totalPartners: partners.length,
      approvedPartners: partners.filter((p) => p.status === 'approved').length,
      pendingPartners: partners.filter((p) => p.status === 'pending').length,
    };
  }

  /**
   * Delete approval record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
