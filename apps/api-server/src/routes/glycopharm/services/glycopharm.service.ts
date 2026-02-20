/**
 * Glycopharm Service
 *
 * Phase B-1: Glycopharm API Implementation
 * Business logic layer for pharmacies and products
 *
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C:
 * Converted from GlycopharmPharmacy → OrganizationStore + Extension
 */

import { DataSource } from 'typeorm';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { GlycopharmRepository } from '../repositories/glycopharm.repository.js';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { GlycopharmPharmacyExtension } from '../entities/glycopharm-pharmacy-extension.entity.js';
import type { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmProductStatus } from '../entities/glycopharm-product.entity.js';
import {
  ListPharmaciesQueryDto,
  ListProductsQueryDto,
  CreatePharmacyRequestDto,
  UpdatePharmacyRequestDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
  PharmacyResponseDto,
  ProductResponseDto,
  ProductListItemDto,
  PaginationMeta,
  GlycopharmPharmacyStatus,
} from '../dto/index.js';

export class GlycopharmService {
  private repository: GlycopharmRepository;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.repository = new GlycopharmRepository(dataSource);
  }

  // ============================================================================
  // Pharmacy Methods
  // ============================================================================

  async listPharmacies(query: ListPharmaciesQueryDto): Promise<{
    data: PharmacyResponseDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.repository.findAllPharmacies(query);

    const data = await Promise.all(
      result.data.map(async (org) => {
        const [productCount, extension] = await Promise.all([
          this.repository.countProductsByPharmacy(org.id),
          this.repository.findExtension(org.id),
        ]);
        return this.toPharmacyResponse(org, extension, productCount);
      })
    );

    return { data, meta: result.meta };
  }

  async getPharmacyById(id: string): Promise<PharmacyResponseDto | null> {
    const org = await this.repository.findPharmacyById(id);
    if (!org) return null;

    const [productCount, extension] = await Promise.all([
      this.repository.countProductsByPharmacy(org.id),
      this.repository.findExtension(org.id),
    ]);
    return this.toPharmacyResponse(org, extension, productCount);
  }

  async getActivePharmacyBySlug(slug: string): Promise<PharmacyResponseDto | null> {
    const org = await this.repository.findActivePharmacyBySlug(slug);
    if (!org) return null;

    const [productCount, extension] = await Promise.all([
      this.repository.countProductsByPharmacy(org.id),
      this.repository.findExtension(org.id),
    ]);
    return this.toPharmacyResponse(org, extension, productCount, slug);
  }

  async getPharmacyEntityBySlug(slug: string): Promise<OrganizationStore | null> {
    return this.repository.findActivePharmacyBySlug(slug);
  }

  async createPharmacy(
    dto: CreatePharmacyRequestDto,
    userId?: string,
    _userName?: string
  ): Promise<PharmacyResponseDto> {
    // Check for duplicate code
    const existing = await this.repository.findPharmacyByCode(dto.code);
    if (existing) {
      throw new Error('Pharmacy code already exists');
    }

    // WO-CORE-STORE-SLUG-TRANSACTION-HARDENING-V1: Atomic pharmacy + slug creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use StoreSlugService with EntityManager for transaction support
      const slugService = new StoreSlugService(queryRunner.manager);
      const slug = await slugService.generateUniqueSlug(dto.name);

      const org = await this.repository.createPharmacyWithManager(
        queryRunner.manager,
        {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          phone: dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone,
          business_number: dto.business_number
            ? normalizeBusinessNumber(dto.business_number)
            : dto.business_number,
          type: 'pharmacy',
          isActive: true,
          level: 0,
          path: dto.code,
          created_by_user_id: userId,
        }
      );

      // Create glycopharm extension
      const extRepo = queryRunner.manager.getRepository(GlycopharmPharmacyExtension);
      const ext = extRepo.create({
        organization_id: org.id,
        owner_name: dto.owner_name,
        sort_order: dto.sort_order || 0,
      });
      await extRepo.save(ext);

      // Create service enrollment
      await queryRunner.manager.query(
        `INSERT INTO organization_service_enrollments (organization_id, service_code, status, enrolled_at)
         VALUES ($1, 'glycopharm', 'active', NOW())`,
        [org.id],
      );

      // Register slug in platform-wide registry (same transaction)
      await slugService.reserveSlug({
        storeId: org.id,
        serviceKey: 'glycopharm',
        slug,
      });

      await queryRunner.commitTransaction();

      return this.toPharmacyResponse(org, ext, 0, slug);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePharmacy(
    id: string,
    dto: UpdatePharmacyRequestDto
  ): Promise<PharmacyResponseDto | null> {
    const existing = await this.repository.findPharmacyById(id);
    if (!existing) return null;

    // Check for duplicate code if code is being changed
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.repository.findPharmacyByCode(dto.code);
      if (duplicate) {
        throw new Error('Pharmacy code already exists');
      }
    }

    // Split org fields vs extension fields
    const orgUpdate: Partial<OrganizationStore> = {};
    if (dto.name !== undefined) orgUpdate.name = dto.name;
    if (dto.code !== undefined) orgUpdate.code = dto.code;
    if (dto.address !== undefined) orgUpdate.address = dto.address;
    if (dto.phone !== undefined) orgUpdate.phone = dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone;
    if (dto.business_number !== undefined) orgUpdate.business_number = dto.business_number;

    if (Object.keys(orgUpdate).length > 0) {
      await this.repository.updatePharmacy(id, orgUpdate);
    }

    // Extension fields
    if (dto.owner_name !== undefined || dto.sort_order !== undefined) {
      const extRepo = this.dataSource.getRepository(GlycopharmPharmacyExtension);
      let ext = await this.repository.findExtension(id);
      if (ext) {
        if (dto.owner_name !== undefined) ext.owner_name = dto.owner_name;
        if (dto.sort_order !== undefined) ext.sort_order = dto.sort_order;
        await extRepo.save(ext);
      } else {
        ext = extRepo.create({
          organization_id: id,
          owner_name: dto.owner_name,
          sort_order: dto.sort_order || 0,
        });
        await extRepo.save(ext);
      }
    }

    const org = await this.repository.findPharmacyById(id);
    if (!org) return null;

    const [productCount, extension] = await Promise.all([
      this.repository.countProductsByPharmacy(org.id),
      this.repository.findExtension(org.id),
    ]);
    return this.toPharmacyResponse(org, extension, productCount);
  }

  // Allowed pharmacy status transitions (WO-STOREFRONT-STABILIZATION Phase 3)
  private static readonly PHARMACY_STATUS_TRANSITIONS: Record<GlycopharmPharmacyStatus, GlycopharmPharmacyStatus[]> = {
    active: ['inactive', 'suspended'],
    inactive: ['active'],
    suspended: ['active'],
  };

  async updatePharmacyStatus(
    id: string,
    status: GlycopharmPharmacyStatus
  ): Promise<PharmacyResponseDto | null> {
    const existing = await this.repository.findPharmacyById(id);
    if (!existing) return null;

    // Map current isActive to status string for transition validation
    const currentStatus: GlycopharmPharmacyStatus = existing.isActive ? 'active' : 'inactive';

    // Validate status transition
    const allowed = GlycopharmService.PHARMACY_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition from '${currentStatus}' to '${status}'. ` +
        `Allowed: ${allowed?.join(', ') || 'none'}`
      );
    }

    const isActive = status === 'active';
    const org = await this.repository.updatePharmacy(id, { isActive });
    if (!org) return null;

    const [productCount, extension] = await Promise.all([
      this.repository.countProductsByPharmacy(org.id),
      this.repository.findExtension(org.id),
    ]);
    return this.toPharmacyResponse(org, extension, productCount);
  }

  // ============================================================================
  // Product Methods
  // ============================================================================

  async listProducts(query: ListProductsQueryDto): Promise<{
    data: ProductListItemDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.repository.findAllProducts(query);
    return {
      data: result.data.map((p) => this.toProductListItem(p)),
      meta: result.meta,
    };
  }

  async listPublicProducts(query: ListProductsQueryDto): Promise<{
    data: ProductListItemDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.repository.findPublicProducts(query);
    return {
      data: result.data.map((p) => this.toProductListItem(p)),
      meta: result.meta,
    };
  }

  async getProductById(id: string): Promise<ProductResponseDto | null> {
    const product = await this.repository.findProductById(id);
    if (!product) return null;
    return this.toProductResponse(product);
  }

  async createProduct(
    dto: CreateProductRequestDto,
    userId?: string,
    userName?: string
  ): Promise<ProductResponseDto> {
    // Check for duplicate SKU
    const existing = await this.repository.findProductBySku(dto.sku);
    if (existing) {
      throw new Error('Product SKU already exists');
    }

    // Validate pharmacy if provided
    if (dto.pharmacy_id) {
      const pharmacy = await this.repository.findPharmacyById(dto.pharmacy_id);
      if (!pharmacy) {
        throw new Error('Pharmacy not found');
      }
    }

    const product = await this.repository.createProduct({
      ...dto,
      status: dto.status || 'draft',
      category: dto.category || 'other',
      created_by_user_id: userId,
      created_by_user_name: userName,
    });

    // Create log
    await this.repository.createProductLog({
      product_id: product.id,
      action: 'create',
      after_data: { ...dto },
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.toProductResponse(product);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductRequestDto,
    userId?: string,
    userName?: string
  ): Promise<ProductResponseDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    // Check for duplicate SKU if SKU is being changed
    if (dto.sku && dto.sku !== existing.sku) {
      const duplicate = await this.repository.findProductBySku(dto.sku);
      if (duplicate) {
        throw new Error('Product SKU already exists');
      }
    }

    // Validate pharmacy if being changed
    if (dto.pharmacy_id && dto.pharmacy_id !== existing.pharmacy_id) {
      const pharmacy = await this.repository.findPharmacyById(dto.pharmacy_id);
      if (!pharmacy) {
        throw new Error('Pharmacy not found');
      }
    }

    const beforeData = {
      name: existing.name,
      sku: existing.sku,
      category: existing.category,
      price: existing.price,
      status: existing.status,
    };

    const product = await this.repository.updateProduct(id, {
      ...dto,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    });

    if (!product) return null;

    // Create log
    await this.repository.createProductLog({
      product_id: product.id,
      action: 'update',
      before_data: beforeData,
      after_data: dto,
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.toProductResponse(product);
  }

  async updateProductStatus(
    id: string,
    status: GlycopharmProductStatus,
    reason?: string,
    userId?: string,
    userName?: string
  ): Promise<ProductResponseDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const beforeStatus = existing.status;

    const product = await this.repository.updateProduct(id, {
      status,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    });

    if (!product) return null;

    // Create log
    await this.repository.createProductLog({
      product_id: product.id,
      action: 'status_change',
      before_data: { status: beforeStatus },
      after_data: { status },
      reason,
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.toProductResponse(product);
  }

  /**
   * Toggle partner recruiting flag
   * WO-PARTNER-RECRUIT-PHASE1-V1
   */
  async togglePartnerRecruiting(
    id: string,
    value: boolean,
    userId?: string,
    userName?: string
  ): Promise<ProductResponseDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const product = await this.repository.updateProduct(id, {
      is_partner_recruiting: value,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    });

    if (!product) return null;

    await this.repository.createProductLog({
      product_id: product.id,
      action: 'partner_recruiting_toggle',
      before_data: { is_partner_recruiting: existing.is_partner_recruiting },
      after_data: { is_partner_recruiting: value },
      changed_by_user_id: userId,
      changed_by_user_name: userName,
    });

    return this.toProductResponse(product);
  }

  /**
   * Get products marked for partner recruiting (active only)
   * WO-PARTNER-RECRUIT-PHASE1-V1
   */
  async getPartnerRecruitingProducts(): Promise<ProductListItemDto[]> {
    const products = await this.repository.findPartnerRecruitingProducts();
    return products.map((p) => this.toProductListItem(p));
  }

  // ============================================================================
  // Response Mappers
  // ============================================================================

  private toPharmacyResponse(
    org: OrganizationStore,
    extension: GlycopharmPharmacyExtension | null,
    productCount: number,
    slug?: string,
  ): PharmacyResponseDto {
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      slug,
      address: org.address,
      phone: org.phone,
      email: undefined, // GAP: email not yet migrated to extension
      owner_name: extension?.owner_name || undefined,
      business_number: org.business_number,
      description: org.description,
      logo: extension?.logo || undefined,
      hero_image: extension?.hero_image || undefined,
      status: org.isActive ? 'active' : 'inactive',
      sort_order: extension?.sort_order || 0,
      product_count: productCount,
      storefront_config: org.storefront_config,
      created_at: org.createdAt.toISOString(),
      updated_at: org.updatedAt.toISOString(),
    };
  }

  private toProductResponse(product: GlycopharmProduct): ProductResponseDto {
    return {
      id: product.id,
      pharmacy_id: product.pharmacy_id,
      pharmacy: product.pharmacy ? {
        id: product.pharmacy.id,
        name: product.pharmacy.name,
        code: product.pharmacy.code,
        address: product.pharmacy.address,
        phone: product.pharmacy.phone,
        email: undefined, // GAP: email not on OrganizationStore or Extension
        owner_name: undefined, // Extension field — loaded separately when needed
        business_number: product.pharmacy.business_number,
        status: product.pharmacy.isActive ? 'active' : 'inactive',
        sort_order: 0, // Extension field — loaded separately when needed
        created_at: product.pharmacy.createdAt.toISOString(),
        updated_at: product.pharmacy.updatedAt.toISOString(),
      } : undefined,
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      price: Number(product.price),
      sale_price: product.sale_price ? Number(product.sale_price) : undefined,
      stock_quantity: product.stock_quantity,
      manufacturer: product.manufacturer,
      status: product.status,
      is_featured: product.is_featured,
      is_partner_recruiting: product.is_partner_recruiting,
      sort_order: product.sort_order,
      created_by_user_id: product.created_by_user_id,
      created_by_user_name: product.created_by_user_name,
      created_at: product.created_at.toISOString(),
      updated_at: product.updated_at.toISOString(),
    };
  }

  private toProductListItem(product: GlycopharmProduct): ProductListItemDto {
    return {
      id: product.id,
      pharmacy_id: product.pharmacy_id,
      pharmacy_name: product.pharmacy?.name,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: Number(product.price),
      sale_price: product.sale_price ? Number(product.sale_price) : undefined,
      stock_quantity: product.stock_quantity,
      status: product.status,
      is_featured: product.is_featured,
      is_partner_recruiting: product.is_partner_recruiting,
      created_by_user_name: product.created_by_user_name,
      created_at: product.created_at.toISOString(),
    };
  }
}
