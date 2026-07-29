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

    // property path 표기 (동일 결함 클래스 예방 — join 추가 시 즉시 500 이 되는 landmine 제거)
    qb.orderBy('store.createdAt', 'DESC');
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

    // property path 표기 (동일 결함 클래스 예방)
    qb.orderBy('app.createdAt', 'DESC');
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
    // WO-O4O-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1 (범위 F):
    //   orderBy 는 **entity property path** 여야 한다(DB 컬럼명 아님).
    //   join(leftJoinAndSelect) + skip/take 조합에서 getManyAndCount 는 distinct-id 서브쿼리 경로를
    //   타고 createOrderByCombinedWithSelectExpression → metadata.findColumnWithPropertyPath(path)
    //   를 호출한다. 'sort_order' / 'created_at' 는 propertyPath 가 아니므로 undefined 가 되어
    //   `.databaseName` 접근에서 TypeError → 500. (findAllStores/findAllApplications 는 join 이 없어
    //   같은 표기로도 우연히 동작했다 — 아래에서 함께 정정.)
    qb.orderBy('listing.sortOrder', 'ASC').addOrderBy('listing.createdAt', 'DESC');
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
