/**
 * Glycopharm Repository
 *
 * Phase B-1: Glycopharm API Implementation
 * Data access layer for pharmacies and products
 *
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C:
 * Converted from GlycopharmPharmacy → OrganizationStore + enrollment scoping
 */

import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { GlycopharmPharmacyExtension } from '../entities/glycopharm-pharmacy-extension.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmProductLog } from '../entities/glycopharm-product-log.entity.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import {
  ListPharmaciesQueryDto,
  ListProductsQueryDto,
  PaginationMeta,
} from '../dto/index.js';

export class GlycopharmRepository {
  private orgRepo: Repository<OrganizationStore>;
  private extRepo: Repository<GlycopharmPharmacyExtension>;
  private productRepo: Repository<GlycopharmProduct>;
  private productLogRepo: Repository<GlycopharmProductLog>;
  private slugService: StoreSlugService;

  constructor(private dataSource: DataSource) {
    this.orgRepo = dataSource.getRepository(OrganizationStore);
    this.extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);
    this.productRepo = dataSource.getRepository(GlycopharmProduct);
    this.productLogRepo = dataSource.getRepository(GlycopharmProductLog);
    this.slugService = new StoreSlugService(dataSource);
  }

  // ============================================================================
  // Pharmacy Methods (OrganizationStore + glycopharm enrollment)
  // ============================================================================

  async findAllPharmacies(query: ListPharmaciesQueryDto): Promise<{
    data: OrganizationStore[];
    meta: PaginationMeta;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.orgRepo
      .createQueryBuilder('org')
      .innerJoin(
        'organization_service_enrollments', 'ose',
        'ose.organization_id = org.id AND ose.service_code = :sc',
        { sc: 'glycopharm' },
      );

    if (query.status === 'active') {
      qb.andWhere('org."isActive" = true');
    } else if (query.status) {
      qb.andWhere('org."isActive" = false');
    }

    qb.orderBy('org.name', 'ASC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPharmacyById(id: string): Promise<OrganizationStore | null> {
    return this.orgRepo.findOne({ where: { id } });
  }

  async findPharmacyByCode(code: string): Promise<OrganizationStore | null> {
    return this.orgRepo.findOne({ where: { code } });
  }

  async findPharmacyBySlug(slug: string): Promise<OrganizationStore | null> {
    const record = await this.slugService.findBySlug(slug);
    if (!record) return null;
    return this.orgRepo.findOne({ where: { id: record.storeId } });
  }

  async findActivePharmacyBySlug(slug: string): Promise<OrganizationStore | null> {
    const record = await this.slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    return this.orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  async findExtension(organizationId: string): Promise<GlycopharmPharmacyExtension | null> {
    return this.extRepo.findOne({ where: { organization_id: organizationId } });
  }

  async createPharmacy(data: Partial<OrganizationStore>): Promise<OrganizationStore> {
    const org = this.orgRepo.create(data);
    return this.orgRepo.save(org);
  }

  /**
   * Create pharmacy using a specific EntityManager (for transaction support)
   * WO-CORE-STORE-SLUG-TRANSACTION-HARDENING-V1
   */
  async createPharmacyWithManager(
    manager: EntityManager,
    data: Partial<OrganizationStore>
  ): Promise<OrganizationStore> {
    const repo = manager.getRepository(OrganizationStore);
    const org = repo.create(data);
    return repo.save(org);
  }

  async updatePharmacy(id: string, data: Partial<OrganizationStore>): Promise<OrganizationStore | null> {
    await this.orgRepo.update(id, data);
    return this.findPharmacyById(id);
  }

  async countProductsByPharmacy(pharmacyId: string): Promise<number> {
    return this.productRepo.count({ where: { pharmacy_id: pharmacyId } });
  }

  // ============================================================================
  // Product Methods
  // ============================================================================

  async findAllProducts(query: ListProductsQueryDto): Promise<{
    data: GlycopharmProduct[];
    meta: PaginationMeta;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.pharmacy', 'pharmacy');

    if (query.pharmacy_id) {
      qb.andWhere('product.pharmacy_id = :pharmacyId', { pharmacyId: query.pharmacy_id });
    }

    if (query.category) {
      qb.andWhere('product.category = :category', { category: query.category });
    }

    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    }

    if (query.is_featured !== undefined) {
      qb.andWhere('product.is_featured = :isFeatured', { isFeatured: query.is_featured });
    }

    if (query.is_partner_recruiting !== undefined) {
      qb.andWhere('product.is_partner_recruiting = :isPartnerRecruiting', { isPartnerRecruiting: query.is_partner_recruiting });
    }

    if (query.q && query.q.length >= 2) {
      qb.andWhere('(product.name ILIKE :q OR product.sku ILIKE :q OR product.description ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    // Sorting
    const sortField = query.sort || 'created_at';
    const sortOrder = query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`product.${sortField}`, sortOrder);

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublicProducts(query: ListProductsQueryDto): Promise<{
    data: GlycopharmProduct[];
    meta: PaginationMeta;
  }> {
    // Public API only shows active products
    return this.findAllProducts({
      ...query,
      status: 'active',
    });
  }

  async findProductById(id: string): Promise<GlycopharmProduct | null> {
    return this.productRepo.findOne({
      where: { id },
      relations: ['pharmacy'],
    });
  }

  async findProductBySku(sku: string): Promise<GlycopharmProduct | null> {
    return this.productRepo.findOne({ where: { sku } });
  }

  async createProduct(data: Partial<GlycopharmProduct>): Promise<GlycopharmProduct> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async updateProduct(id: string, data: Partial<GlycopharmProduct>): Promise<GlycopharmProduct | null> {
    await this.productRepo.update(id, data);
    return this.findProductById(id);
  }

  /**
   * Find products marked for partner recruiting (active only)
   * WO-PARTNER-RECRUIT-PHASE1-V1
   */
  async findPartnerRecruitingProducts(): Promise<GlycopharmProduct[]> {
    return this.productRepo.find({
      where: {
        is_partner_recruiting: true,
        status: 'active' as any,
      },
      relations: ['pharmacy'],
      order: { updated_at: 'DESC' },
      take: 50,
    });
  }

  // ============================================================================
  // Product Log Methods
  // ============================================================================

  async createProductLog(data: Partial<GlycopharmProductLog>): Promise<GlycopharmProductLog> {
    const log = this.productLogRepo.create(data);
    return this.productLogRepo.save(log);
  }

  async findProductLogs(productId: string, page = 1, limit = 20): Promise<{
    data: GlycopharmProductLog[];
    meta: PaginationMeta;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.productLogRepo.findAndCount({
      where: { product_id: productId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
