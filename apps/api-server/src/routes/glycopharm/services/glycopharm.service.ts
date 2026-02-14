/**
 * Glycopharm Service
 *
 * Phase B-1: Glycopharm API Implementation
 * Business logic layer for pharmacies and products
 */

import { DataSource } from 'typeorm';
import { normalizeBusinessNumber } from '../../../utils/business-number.js';
import { generateUniqueStoreSlug } from '../../../utils/slug.js';
import { GlycopharmRepository } from '../repositories/glycopharm.repository.js';
import { GlycopharmPharmacy, GlycopharmPharmacyStatus } from '../entities/glycopharm-pharmacy.entity.js';
import { GlycopharmProduct, GlycopharmProductStatus } from '../entities/glycopharm-product.entity.js';
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
} from '../dto/index.js';

export class GlycopharmService {
  private repository: GlycopharmRepository;

  constructor(dataSource: DataSource) {
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
      result.data.map(async (pharmacy) => {
        const productCount = await this.repository.countProductsByPharmacy(pharmacy.id);
        return this.toPharmacyResponse(pharmacy, productCount);
      })
    );

    return { data, meta: result.meta };
  }

  async getPharmacyById(id: string): Promise<PharmacyResponseDto | null> {
    const pharmacy = await this.repository.findPharmacyById(id);
    if (!pharmacy) return null;

    const productCount = await this.repository.countProductsByPharmacy(pharmacy.id);
    return this.toPharmacyResponse(pharmacy, productCount);
  }

  async getActivePharmacyBySlug(slug: string): Promise<PharmacyResponseDto | null> {
    const pharmacy = await this.repository.findActivePharmacyBySlug(slug);
    if (!pharmacy) return null;

    const productCount = await this.repository.countProductsByPharmacy(pharmacy.id);
    return this.toPharmacyResponse(pharmacy, productCount);
  }

  async getPharmacyEntityBySlug(slug: string): Promise<GlycopharmPharmacy | null> {
    return this.repository.findActivePharmacyBySlug(slug);
  }

  async createPharmacy(
    dto: CreatePharmacyRequestDto,
    userId?: string,
    userName?: string
  ): Promise<PharmacyResponseDto> {
    // Check for duplicate code
    const existing = await this.repository.findPharmacyByCode(dto.code);
    if (existing) {
      throw new Error('Pharmacy code already exists');
    }

    // Generate collision-safe slug (WO-STOREFRONT-STABILIZATION Phase 4)
    const slug = await generateUniqueStoreSlug(dto.name, async (candidate) => {
      const found = await this.repository.findPharmacyBySlug(candidate);
      return !!found;
    });

    const pharmacy = await this.repository.createPharmacy({
      ...dto,
      phone: dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone,
      business_number: dto.business_number ? normalizeBusinessNumber(dto.business_number) : dto.business_number,
      slug,
      status: 'active',
      created_by_user_id: userId,
      created_by_user_name: userName,
    });

    return this.toPharmacyResponse(pharmacy, 0);
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

    const normalizedDto = dto.phone !== undefined
      ? { ...dto, phone: dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone }
      : dto;
    const pharmacy = await this.repository.updatePharmacy(id, normalizedDto);
    if (!pharmacy) return null;

    const productCount = await this.repository.countProductsByPharmacy(pharmacy.id);
    return this.toPharmacyResponse(pharmacy, productCount);
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

    // Validate status transition
    const allowed = GlycopharmService.PHARMACY_STATUS_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot transition from '${existing.status}' to '${status}'. ` +
        `Allowed: ${allowed?.join(', ') || 'none'}`
      );
    }

    const pharmacy = await this.repository.updatePharmacy(id, { status });
    if (!pharmacy) return null;

    const productCount = await this.repository.countProductsByPharmacy(pharmacy.id);
    return this.toPharmacyResponse(pharmacy, productCount);
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

  private toPharmacyResponse(pharmacy: GlycopharmPharmacy, productCount: number): PharmacyResponseDto {
    return {
      id: pharmacy.id,
      name: pharmacy.name,
      code: pharmacy.code,
      slug: pharmacy.slug,
      address: pharmacy.address,
      phone: pharmacy.phone,
      email: pharmacy.email,
      owner_name: pharmacy.owner_name,
      business_number: pharmacy.business_number,
      description: pharmacy.description,
      logo: pharmacy.logo,
      hero_image: pharmacy.hero_image,
      status: pharmacy.status,
      sort_order: pharmacy.sort_order,
      product_count: productCount,
      storefront_config: pharmacy.storefront_config,
      created_at: pharmacy.created_at.toISOString(),
      updated_at: pharmacy.updated_at.toISOString(),
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
        email: product.pharmacy.email,
        owner_name: product.pharmacy.owner_name,
        business_number: product.pharmacy.business_number,
        status: product.pharmacy.status,
        sort_order: product.pharmacy.sort_order,
        created_at: product.pharmacy.created_at.toISOString(),
        updated_at: product.pharmacy.updated_at.toISOString(),
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
