/**
 * Cosmetics Service
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Business logic layer for cosmetics domain
 */

import { DataSource } from 'typeorm';
import { CosmeticsRepository } from '../repositories/cosmetics.repository.js';
import {
  CosmeticsProduct,
  CosmeticsProductStatus,
  CosmeticsLogAction,
} from '../entities/index.js';
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
  UpdateStatusRequestDto,
  UpdatePricePolicyRequestDto,
  ListProductsQueryDto,
  SearchProductsQueryDto,
  ListBrandsQueryDto,
  ListLinesQueryDto,
  ListLogsQueryDto,
  ProductSummaryDto,
  ProductDetailDto,
  BrandDetailDto,
  BrandSummaryDto,
  LineSummaryDto,
  PaginationMetaDto,
  PricePolicyResponseDto,
  AuditLogEntryDto,
} from '../dto/index.js';

/**
 * Status transition validation map
 */
const VALID_STATUS_TRANSITIONS: Record<CosmeticsProductStatus, CosmeticsProductStatus[]> = {
  [CosmeticsProductStatus.DRAFT]: [CosmeticsProductStatus.VISIBLE, CosmeticsProductStatus.HIDDEN],
  [CosmeticsProductStatus.VISIBLE]: [CosmeticsProductStatus.HIDDEN, CosmeticsProductStatus.SOLD_OUT],
  [CosmeticsProductStatus.HIDDEN]: [CosmeticsProductStatus.VISIBLE, CosmeticsProductStatus.SOLD_OUT],
  [CosmeticsProductStatus.SOLD_OUT]: [CosmeticsProductStatus.VISIBLE, CosmeticsProductStatus.HIDDEN],
};

export class CosmeticsService {
  private repository: CosmeticsRepository;

  constructor(dataSource: DataSource) {
    this.repository = new CosmeticsRepository(dataSource);
  }

  // ============================================================================
  // Brand Service Methods
  // ============================================================================

  async listBrands(query: ListBrandsQueryDto): Promise<{ data: BrandDetailDto[] }> {
    const brands = await this.repository.findAllBrands(query);

    const data: BrandDetailDto[] = await Promise.all(
      brands.map(async (brand) => {
        const productCount = await this.repository.countProductsByBrandId(brand.id);
        return {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo_url: brand.logoUrl,
          is_active: brand.isActive,
          lines: brand.lines?.map((line) => ({
            id: line.id,
            name: line.name,
          })),
          product_count: productCount,
        };
      })
    );

    return { data };
  }

  async getBrand(id: string): Promise<BrandDetailDto | null> {
    const brand = await this.repository.findBrandById(id);
    if (!brand) return null;

    const productCount = await this.repository.countProductsByBrandId(brand.id);

    // Get product counts for each line
    const linesWithCounts = await Promise.all(
      (brand.lines || []).map(async (line) => {
        const count = await this.repository.countProductsByLineId(line.id);
        return {
          id: line.id,
          name: line.name,
          product_count: count,
        };
      })
    );

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logo_url: brand.logoUrl,
      is_active: brand.isActive,
      lines: linesWithCounts,
      product_count: productCount,
    };
  }

  // ============================================================================
  // Line Service Methods
  // ============================================================================

  async listLines(query: ListLinesQueryDto): Promise<{ data: LineSummaryDto[] }> {
    const lines = await this.repository.findAllLines(query);

    const data: LineSummaryDto[] = await Promise.all(
      lines.map(async (line) => {
        const productCount = await this.repository.countProductsByLineId(line.id);
        return {
          id: line.id,
          name: line.name,
          product_count: productCount,
        };
      })
    );

    return { data };
  }

  // ============================================================================
  // Product Service Methods
  // ============================================================================

  async listProducts(
    query: ListProductsQueryDto
  ): Promise<{ data: ProductSummaryDto[]; meta: PaginationMetaDto }> {
    const { products, total } = await this.repository.findAllProducts(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const data: ProductSummaryDto[] = products.map((p) => this.toProductSummary(p));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async searchProducts(
    query: SearchProductsQueryDto
  ): Promise<{ data: ProductSummaryDto[]; meta: PaginationMetaDto }> {
    const { products, total } = await this.repository.searchProducts(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const data: ProductSummaryDto[] = products.map((p) => this.toProductSummary(p));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async getProduct(id: string): Promise<ProductDetailDto | null> {
    const product = await this.repository.findProductById(id);
    if (!product) return null;
    return this.toProductDetail(product);
  }

  async createProduct(
    dto: CreateProductRequestDto,
    userId?: string,
    userName?: string
  ): Promise<ProductDetailDto> {
    // Verify brand exists
    const brand = await this.repository.findBrandById(dto.brand_id);
    if (!brand) {
      throw new Error('BRAND_NOT_FOUND');
    }

    // Verify line exists if provided
    if (dto.line_id) {
      const line = await this.repository.findLineById(dto.line_id);
      if (!line || line.brandId !== dto.brand_id) {
        throw new Error('LINE_NOT_FOUND');
      }
    }

    const product = await this.repository.createProduct({
      name: dto.name,
      brandId: dto.brand_id,
      lineId: dto.line_id,
      description: dto.description,
      ingredients: dto.ingredients,
      basePrice: dto.price.base,
      salePrice: dto.price.sale,
      status: dto.status || CosmeticsProductStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create price policy
    await this.repository.createPricePolicy({
      productId: product.id,
      basePrice: dto.price.base,
      salePrice: dto.price.sale,
      updatedBy: userId,
    });

    // Create audit log
    await this.repository.createProductLog({
      productId: product.id,
      action: CosmeticsLogAction.CREATE,
      userId,
      userName,
    });

    const created = await this.repository.findProductById(product.id);
    return this.toProductDetail(created!);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductRequestDto,
    userId?: string,
    userName?: string
  ): Promise<ProductDetailDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    // Build changes object for audit log
    const changes: Record<string, { old: any; new: any }> = {};

    const updateData: Partial<CosmeticsProduct> = {
      updatedBy: userId,
    };

    if (dto.name !== undefined && dto.name !== existing.name) {
      changes['name'] = { old: existing.name, new: dto.name };
      updateData.name = dto.name;
    }

    if (dto.brand_id !== undefined && dto.brand_id !== existing.brandId) {
      const brand = await this.repository.findBrandById(dto.brand_id);
      if (!brand) throw new Error('BRAND_NOT_FOUND');
      changes['brand_id'] = { old: existing.brandId, new: dto.brand_id };
      updateData.brandId = dto.brand_id;
    }

    if (dto.line_id !== undefined && dto.line_id !== existing.lineId) {
      if (dto.line_id) {
        const line = await this.repository.findLineById(dto.line_id);
        if (!line) throw new Error('LINE_NOT_FOUND');
      }
      changes['line_id'] = { old: existing.lineId, new: dto.line_id };
      updateData.lineId = dto.line_id;
    }

    if (dto.description !== undefined && dto.description !== existing.description) {
      changes['description'] = { old: existing.description, new: dto.description };
      updateData.description = dto.description;
    }

    if (dto.ingredients !== undefined) {
      changes['ingredients'] = { old: existing.ingredients, new: dto.ingredients };
      updateData.ingredients = dto.ingredients;
    }

    const updated = await this.repository.updateProduct(id, updateData);
    if (!updated) return null;

    // Create audit log if there are changes
    if (Object.keys(changes).length > 0) {
      await this.repository.createProductLog({
        productId: id,
        action: CosmeticsLogAction.UPDATE,
        changes,
        userId,
        userName,
      });
    }

    return this.toProductDetail(updated);
  }

  async updateProductStatus(
    id: string,
    dto: UpdateStatusRequestDto,
    userId?: string,
    userName?: string
  ): Promise<{
    id: string;
    status: CosmeticsProductStatus;
    previous_status: CosmeticsProductStatus;
    changed_at: string;
    changed_by?: string;
  } | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    const previousStatus = existing.status;
    await this.repository.updateProductStatus(id, dto.status, userId);

    // Create audit log
    await this.repository.createProductLog({
      productId: id,
      action: CosmeticsLogAction.STATUS_CHANGE,
      changes: {
        status: { old: previousStatus, new: dto.status },
        reason: { old: null, new: dto.reason || null },
      },
      userId,
      userName,
    });

    return {
      id,
      status: dto.status,
      previous_status: previousStatus,
      changed_at: new Date().toISOString(),
      changed_by: userId,
    };
  }

  // ============================================================================
  // Price Policy Service Methods
  // ============================================================================

  async getPricePolicy(productId: string): Promise<PricePolicyResponseDto['data'] | null> {
    const product = await this.repository.findProductById(productId);
    if (!product) return null;

    let policy = await this.repository.findPricePolicyByProductId(productId);

    // Create default policy if not exists
    if (!policy) {
      policy = await this.repository.createPricePolicy({
        productId,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
      });
    }

    return {
      product_id: productId,
      base_price: policy.basePrice,
      sale_price: policy.salePrice,
      sale_active: policy.saleActive,
      sale_start_at: policy.saleStartAt?.toISOString() || null,
      sale_end_at: policy.saleEndAt?.toISOString() || null,
      updated_at: policy.updatedAt.toISOString(),
    };
  }

  async updatePricePolicy(
    productId: string,
    dto: UpdatePricePolicyRequestDto,
    userId?: string,
    userName?: string
  ): Promise<PricePolicyResponseDto['data'] | null> {
    const product = await this.repository.findProductById(productId);
    if (!product) return null;

    const existingPolicy = await this.repository.findPricePolicyByProductId(productId);
    const changes: Record<string, { old: any; new: any }> = {};

    if (existingPolicy) {
      if (dto.base_price !== existingPolicy.basePrice) {
        changes['base_price'] = { old: existingPolicy.basePrice, new: dto.base_price };
      }
      if (dto.sale_price !== existingPolicy.salePrice) {
        changes['sale_price'] = { old: existingPolicy.salePrice, new: dto.sale_price };
      }
    }

    const policy = await this.repository.upsertPricePolicy(productId, {
      basePrice: dto.base_price,
      salePrice: dto.sale_price,
      saleStartAt: dto.sale_start_at ? new Date(dto.sale_start_at) : null,
      saleEndAt: dto.sale_end_at ? new Date(dto.sale_end_at) : null,
      updatedBy: userId,
    });

    // Also update product's base price
    await this.repository.updateProduct(productId, {
      basePrice: dto.base_price,
      salePrice: dto.sale_price,
      updatedBy: userId,
    });

    // Create price log if there are changes
    if (Object.keys(changes).length > 0) {
      await this.repository.createPriceLog({
        productId,
        action: CosmeticsLogAction.UPDATE,
        changes,
        userId,
        userName,
      });
    }

    return {
      product_id: productId,
      base_price: policy.basePrice,
      sale_price: policy.salePrice,
      sale_active: policy.saleActive,
      sale_start_at: policy.saleStartAt?.toISOString() || null,
      sale_end_at: policy.saleEndAt?.toISOString() || null,
      updated_at: policy.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Audit Log Service Methods
  // ============================================================================

  async getProductLogs(
    query: ListLogsQueryDto
  ): Promise<{ data: AuditLogEntryDto[]; meta: PaginationMetaDto }> {
    const { logs, total } = await this.repository.findProductLogs(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const data: AuditLogEntryDto[] = logs.map((log) => ({
      id: log.id,
      action: log.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE',
      entity_type: 'product',
      entity_id: log.productId,
      changes: log.changes,
      user_id: log.userId,
      user_name: log.userName,
      created_at: log.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  async getPriceLogs(
    query: ListLogsQueryDto
  ): Promise<{ data: AuditLogEntryDto[]; meta: PaginationMetaDto }> {
    const { logs, total } = await this.repository.findPriceLogs(query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const totalPages = Math.ceil(total / limit);

    const data: AuditLogEntryDto[] = logs.map((log) => ({
      id: log.id,
      action: log.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE',
      entity_type: 'price_policy',
      entity_id: log.productId,
      changes: log.changes,
      user_id: log.userId,
      user_name: log.userName,
      created_at: log.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };
  }

  // ============================================================================
  // Dashboard Summary Methods
  // ============================================================================

  async getOperatorDashboardSummary(): Promise<{
    stats: {
      totalStores: number;
      activeOrders: number;
      monthlyRevenue: string;
      newSignups: number;
    };
    recentOrders: Array<{
      id: string;
      store: string;
      amount: string;
      status: string;
      time: string;
    }>;
    recentApplications: Array<{
      name: string;
      type: string;
      date: string;
      status: string;
    }>;
  }> {
    // Query database for statistics
    const totalProducts = await this.repository.countAllProducts();
    const visibleProducts = await this.repository.countProductsByStatus(CosmeticsProductStatus.VISIBLE);
    const brands = await this.repository.findAllBrands({});

    // Return empty state data - actual store/order data would come from O4O Store
    return {
      stats: {
        totalStores: brands.length,
        activeOrders: 0,
        monthlyRevenue: '₩0',
        newSignups: 0,
      },
      recentOrders: [],
      recentApplications: [],
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private toProductSummary(product: CosmeticsProduct): ProductSummaryDto {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          }
        : { id: product.brandId, name: '', slug: '' },
      line: product.line
        ? {
            id: product.line.id,
            name: product.line.name,
          }
        : null,
      description: product.description,
      status: product.status,
      price: {
        base: product.basePrice,
        sale: product.salePrice,
        currency: product.currency,
      },
      images: product.images,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
    };
  }

  private toProductDetail(product: CosmeticsProduct): ProductDetailDto {
    return {
      id: product.id,
      name: product.name,
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
            description: product.brand.description,
            logo_url: product.brand.logoUrl,
            is_active: product.brand.isActive,
          }
        : {
            id: product.brandId,
            name: '',
            slug: '',
            is_active: true,
          },
      line: product.line
        ? {
            id: product.line.id,
            name: product.line.name,
          }
        : null,
      description: product.description,
      ingredients: product.ingredients,
      status: product.status,
      price: {
        base: product.basePrice,
        sale: product.salePrice,
        currency: product.currency,
      },
      variants: product.variants,
      images: product.images,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
    };
  }
}
