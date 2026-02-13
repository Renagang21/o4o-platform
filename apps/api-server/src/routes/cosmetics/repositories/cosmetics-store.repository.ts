/**
 * Cosmetics Store Repository
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Data access layer for store domain
 */

import { DataSource, Repository } from 'typeorm';
import {
  CosmeticsStore,
  CosmeticsStoreApplication,
  CosmeticsStoreMember,
  CosmeticsStoreListing,
} from '../entities/index.js';

export class CosmeticsStoreRepository {
  private storeRepo: Repository<CosmeticsStore>;
  private applicationRepo: Repository<CosmeticsStoreApplication>;
  private memberRepo: Repository<CosmeticsStoreMember>;
  private listingRepo: Repository<CosmeticsStoreListing>;

  constructor(private dataSource: DataSource) {
    this.storeRepo = dataSource.getRepository(CosmeticsStore);
    this.applicationRepo = dataSource.getRepository(CosmeticsStoreApplication);
    this.memberRepo = dataSource.getRepository(CosmeticsStoreMember);
    this.listingRepo = dataSource.getRepository(CosmeticsStoreListing);
  }

  // ============================================================================
  // Store Methods
  // ============================================================================

  async findAllStores(query: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
  }): Promise<{ stores: CosmeticsStore[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.storeRepo.createQueryBuilder('store');

    if (query.status) {
      qb.andWhere('store.status = :status', { status: query.status });
    }
    if (query.region) {
      qb.andWhere('store.region = :region', { region: query.region });
    }

    qb.orderBy('store.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [stores, total] = await qb.getManyAndCount();
    return { stores, total };
  }

  async findStoreById(id: string): Promise<CosmeticsStore | null> {
    return this.storeRepo.findOne({ where: { id } });
  }

  async findStoreByCode(code: string): Promise<CosmeticsStore | null> {
    return this.storeRepo.findOne({ where: { code } });
  }

  async findStoreByBusinessNumber(businessNumber: string): Promise<CosmeticsStore | null> {
    return this.storeRepo.findOne({ where: { businessNumber } });
  }

  async createStore(data: Partial<CosmeticsStore>): Promise<CosmeticsStore> {
    const store = this.storeRepo.create(data);
    return this.storeRepo.save(store);
  }

  async updateStoreStatus(id: string, status: string): Promise<void> {
    await this.storeRepo.update(id, { status: status as any });
  }

  // ============================================================================
  // Application Methods
  // ============================================================================

  async findAllApplications(query: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ applications: CosmeticsStoreApplication[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.applicationRepo.createQueryBuilder('app');

    if (query.status) {
      qb.andWhere('app.status = :status', { status: query.status });
    }

    qb.orderBy('app.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [applications, total] = await qb.getManyAndCount();
    return { applications, total };
  }

  async findApplicationById(id: string): Promise<CosmeticsStoreApplication | null> {
    return this.applicationRepo.findOne({ where: { id } });
  }

  async findApplicationsByUserId(userId: string): Promise<CosmeticsStoreApplication[]> {
    return this.applicationRepo.find({
      where: { applicantUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingApplicationByUserId(userId: string): Promise<CosmeticsStoreApplication | null> {
    return this.applicationRepo.findOne({
      where: { applicantUserId: userId, status: 'submitted' as any },
    });
  }

  async createApplication(data: Partial<CosmeticsStoreApplication>): Promise<CosmeticsStoreApplication> {
    const app = this.applicationRepo.create(data);
    return this.applicationRepo.save(app);
  }

  async updateApplication(id: string, data: Partial<CosmeticsStoreApplication>): Promise<void> {
    await this.applicationRepo.update(id, data);
  }

  // ============================================================================
  // Member Methods
  // ============================================================================

  async findMembersByStoreId(storeId: string): Promise<CosmeticsStoreMember[]> {
    return this.memberRepo.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findMemberByStoreAndUser(storeId: string, userId: string): Promise<CosmeticsStoreMember | null> {
    return this.memberRepo.findOne({
      where: { storeId, userId, isActive: true },
    });
  }

  /** 비활성 포함 — 재활성화 시 사용 */
  async findMemberByStoreAndUserIncludingInactive(storeId: string, userId: string): Promise<CosmeticsStoreMember | null> {
    return this.memberRepo.findOne({
      where: { storeId, userId },
    });
  }

  async findStoresByUserId(userId: string): Promise<CosmeticsStore[]> {
    const members = await this.memberRepo.find({
      where: { userId, isActive: true },
      relations: ['store'],
    });
    return members
      .filter((m) => m.store != null)
      .map((m) => m.store!);
  }

  async createMember(data: Partial<CosmeticsStoreMember>): Promise<CosmeticsStoreMember> {
    const member = this.memberRepo.create(data);
    return this.memberRepo.save(member);
  }

  async findMemberById(id: string): Promise<CosmeticsStoreMember | null> {
    return this.memberRepo.findOne({ where: { id } });
  }

  async deactivateMember(id: string, deactivatedBy: string): Promise<void> {
    await this.memberRepo.update(id, {
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy,
    });
  }

  async reactivateMember(id: string, role: CosmeticsStoreMember['role']): Promise<void> {
    await this.memberRepo.update(id, {
      isActive: true,
      role,
      deactivatedAt: null,
      deactivatedBy: null,
    });
  }

  async countOwnersByStoreId(storeId: string): Promise<number> {
    return this.memberRepo.count({
      where: { storeId, role: 'owner' as any, isActive: true },
    });
  }

  /** Admin: 전 매장 멤버 조회 (store 관계 포함) */
  async findAllMembers(includeInactive = false): Promise<CosmeticsStoreMember[]> {
    const where: Record<string, any> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.memberRepo.find({
      where,
      relations: ['store'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================================
  // Listing Methods
  // ============================================================================

  async findListingsByStoreId(storeId: string, query: {
    page?: number;
    limit?: number;
  }): Promise<{ listings: CosmeticsStoreListing[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.listingRepo.createQueryBuilder('listing');
    qb.leftJoinAndSelect('listing.product', 'product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.where('listing.store_id = :storeId', { storeId });
    qb.orderBy('listing.sort_order', 'ASC').addOrderBy('listing.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [listings, total] = await qb.getManyAndCount();
    return { listings, total };
  }

  async findListingById(id: string): Promise<CosmeticsStoreListing | null> {
    return this.listingRepo.findOne({
      where: { id },
      relations: ['product'],
    });
  }

  async findListingByStoreAndProduct(storeId: string, productId: string): Promise<CosmeticsStoreListing | null> {
    return this.listingRepo.findOne({
      where: { storeId, productId },
    });
  }

  async createListing(data: Partial<CosmeticsStoreListing>): Promise<CosmeticsStoreListing> {
    const listing = this.listingRepo.create(data);
    return this.listingRepo.save(listing);
  }

  async updateListing(id: string, data: Partial<CosmeticsStoreListing>): Promise<void> {
    await this.listingRepo.update(id, data);
  }

  async findListingByIdAndStore(id: string, storeId: string): Promise<CosmeticsStoreListing | null> {
    return this.listingRepo.findOne({
      where: { id, storeId },
    });
  }

  // ============================================================================
  // DataSource accessor (for transactions)
  // ============================================================================

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
