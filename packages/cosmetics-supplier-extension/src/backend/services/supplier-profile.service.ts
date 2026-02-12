/**
 * Supplier Profile Service
 *
 * 공급사 프로필 관리
 */

import { Repository, DataSource } from 'typeorm';
import { SupplierProfile, SupplierStatus, SupplierTier } from '../entities/supplier-profile.entity';

export interface CreateSupplierProfileDto {
  userId: string;
  brandName: string;
  brandNameEn?: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  businessRegistrationNumber?: string;
  policyContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSupplierProfileDto {
  brandName?: string;
  brandNameEn?: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  policyContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  commissionRate?: number;
  metadata?: Record<string, unknown>;
}

export interface SupplierFilter {
  status?: SupplierStatus;
  tier?: SupplierTier;
  search?: string;
}

export class SupplierProfileService {
  private repository: Repository<SupplierProfile>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(SupplierProfile);
  }

  /**
   * Create supplier profile
   */
  async create(dto: CreateSupplierProfileDto): Promise<SupplierProfile> {
    // Check if user already has a supplier profile
    const existing = await this.repository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new Error('User already has a supplier profile');
    }

    const profile = this.repository.create({
      ...dto,
      contactPhone: dto.contactPhone ? dto.contactPhone.replace(/\D/g, '') : dto.contactPhone,
      status: 'pending',
      tier: 'basic',
      commissionRate: 10,
    });

    return this.repository.save(profile);
  }

  /**
   * Get supplier profile by ID
   */
  async findById(id: string): Promise<SupplierProfile | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get supplier profile by user ID
   */
  async findByUserId(userId: string): Promise<SupplierProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  /**
   * Get my supplier profile
   */
  async getMyProfile(userId: string): Promise<SupplierProfile | null> {
    return this.findByUserId(userId);
  }

  /**
   * Update supplier profile
   */
  async update(id: string, dto: UpdateSupplierProfileDto): Promise<SupplierProfile | null> {
    const profile = await this.findById(id);
    if (!profile) {
      return null;
    }

    const normalizedDto = dto.contactPhone !== undefined
      ? { ...dto, contactPhone: dto.contactPhone ? dto.contactPhone.replace(/\D/g, '') : dto.contactPhone }
      : dto;
    Object.assign(profile, normalizedDto);
    return this.repository.save(profile);
  }

  /**
   * Update supplier status
   */
  async updateStatus(
    id: string,
    status: SupplierStatus,
    approvedBy?: string
  ): Promise<SupplierProfile | null> {
    const profile = await this.findById(id);
    if (!profile) {
      return null;
    }

    profile.status = status;
    if (status === 'approved') {
      profile.approvedAt = new Date();
    }

    return this.repository.save(profile);
  }

  /**
   * Update supplier tier
   */
  async updateTier(id: string, tier: SupplierTier): Promise<SupplierProfile | null> {
    const profile = await this.findById(id);
    if (!profile) {
      return null;
    }

    profile.tier = tier;
    return this.repository.save(profile);
  }

  /**
   * List suppliers with filter
   */
  async findAll(filter?: SupplierFilter): Promise<SupplierProfile[]> {
    const qb = this.repository.createQueryBuilder('supplier');

    if (filter?.status) {
      qb.andWhere('supplier.status = :status', { status: filter.status });
    }

    if (filter?.tier) {
      qb.andWhere('supplier.tier = :tier', { tier: filter.tier });
    }

    if (filter?.search) {
      qb.andWhere('(supplier.brandName ILIKE :search OR supplier.brandNameEn ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    qb.orderBy('supplier.createdAt', 'DESC');

    return qb.getMany();
  }

  /**
   * Update stats
   */
  async updateStats(
    id: string,
    stats: {
      approvedSellerCount?: number;
      approvedPartnerCount?: number;
      totalProducts?: number;
      totalSales?: number;
    }
  ): Promise<void> {
    await this.repository.update(id, stats);
  }

  /**
   * Increment approved seller count
   */
  async incrementApprovedSeller(id: string): Promise<void> {
    await this.repository.increment({ id }, 'approvedSellerCount', 1);
  }

  /**
   * Increment approved partner count
   */
  async incrementApprovedPartner(id: string): Promise<void> {
    await this.repository.increment({ id }, 'approvedPartnerCount', 1);
  }

  /**
   * Get top suppliers by sales
   */
  async getTopSuppliers(limit: number = 10): Promise<SupplierProfile[]> {
    return this.repository.find({
      where: { status: 'approved' },
      order: { totalSales: 'DESC' },
      take: limit,
    });
  }

  /**
   * Delete supplier profile
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
