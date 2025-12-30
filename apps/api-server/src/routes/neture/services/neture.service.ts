/**
 * Neture Service
 *
 * Phase D-1: Neture API Server 골격 구축
 * Business logic layer for Neture operations
 */

import { DataSource } from 'typeorm';
import { NetureRepository } from '../repositories/neture.repository.js';
import {
  NetureProduct,
  NetureProductStatus,
  NetureProductCategory,
} from '../entities/neture-product.entity.js';
import {
  NeturePartner,
  NeturePartnerType,
  NeturePartnerStatus,
} from '../entities/neture-partner.entity.js';
import { NetureLogAction } from '../entities/neture-product-log.entity.js';
import {
  ProductDto,
  PartnerDto,
  ProductLogDto,
  ListProductsQueryDto,
  SearchProductsQueryDto,
  ListProductsResponseDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
  UpdateProductStatusRequestDto,
  ListPartnersQueryDto,
  ListPartnersResponseDto,
  CreatePartnerRequestDto,
  UpdatePartnerRequestDto,
  UpdatePartnerStatusRequestDto,
  ListLogsQueryDto,
  ListLogsResponseDto,
} from '../dto/index.js';

export class NetureService {
  private repository: NetureRepository;

  constructor(private dataSource: DataSource) {
    this.repository = new NetureRepository(dataSource);
  }

  // ============================================================================
  // Product Operations
  // ============================================================================

  private toProductDto(product: NetureProduct): ProductDto {
    return {
      id: product.id,
      partner_id: product.partnerId || null,
      name: product.name,
      subtitle: product.subtitle || null,
      description: product.description || null,
      category: product.category,
      status: product.status,
      base_price: product.basePrice,
      sale_price: product.salePrice || null,
      currency: product.currency,
      stock: product.stock,
      sku: product.sku || null,
      images: product.images || null,
      tags: product.tags || null,
      is_featured: product.isFeatured,
      view_count: product.viewCount,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
      partner: product.partner ? this.toPartnerDto(product.partner) : undefined,
    };
  }

  async listProducts(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { products, total } = await this.repository.findProducts({
      page,
      limit,
      partnerId: query.partner_id,
      category: query.category,
      status: query.status,
      isFeatured: query.is_featured,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: products.map((p) => this.toProductDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchProducts(query: SearchProductsQueryDto): Promise<ListProductsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { products, total } = await this.repository.searchProducts({
      query: query.q,
      page,
      limit,
    });

    return {
      data: products.map((p) => this.toProductDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(id: string, incrementView = false): Promise<ProductDto | null> {
    const product = await this.repository.findProductById(id);
    if (!product) return null;

    if (incrementView) {
      await this.repository.incrementViewCount(id);
      product.viewCount += 1;
    }

    return this.toProductDto(product);
  }

  async createProduct(
    data: CreateProductRequestDto,
    userId?: string
  ): Promise<ProductDto> {
    const product = await this.repository.createProduct({
      partnerId: data.partner_id,
      name: data.name,
      subtitle: data.subtitle,
      description: data.description,
      category: data.category || NetureProductCategory.OTHER,
      basePrice: data.base_price,
      salePrice: data.sale_price,
      currency: data.currency,
      stock: data.stock || 0,
      sku: data.sku,
      images: data.images,
      tags: data.tags,
      isFeatured: data.is_featured || false,
      metadata: data.metadata,
      status: NetureProductStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId,
    });

    // Create log
    await this.repository.createLog({
      productId: product.id,
      action: NetureLogAction.CREATE,
      after: { name: product.name, basePrice: product.basePrice },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  async updateProduct(
    id: string,
    data: UpdateProductRequestDto,
    userId?: string
  ): Promise<ProductDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const updateData: Partial<NetureProduct> = {
      updatedBy: userId,
    };

    if (data.partner_id !== undefined) updateData.partnerId = data.partner_id;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.base_price !== undefined) updateData.basePrice = data.base_price;
    if (data.sale_price !== undefined) updateData.salePrice = data.sale_price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stock !== undefined) updateData.stock = data.stock;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.is_featured !== undefined) updateData.isFeatured = data.is_featured;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const product = await this.repository.updateProduct(id, updateData);
    if (!product) return null;

    // Create log
    await this.repository.createLog({
      productId: id,
      action: NetureLogAction.UPDATE,
      before: { name: existing.name, basePrice: existing.basePrice },
      after: { name: product.name, basePrice: product.basePrice },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  async updateProductStatus(
    id: string,
    data: UpdateProductStatusRequestDto,
    userId?: string
  ): Promise<ProductDto | null> {
    const existing = await this.repository.findProductById(id);
    if (!existing) return null;

    const product = await this.repository.updateProduct(id, {
      status: data.status,
      updatedBy: userId,
    });
    if (!product) return null;

    // Create log
    await this.repository.createLog({
      productId: id,
      action: NetureLogAction.STATUS_CHANGE,
      before: { status: existing.status },
      after: { status: data.status },
      performedBy: userId,
    });

    return this.toProductDto(product);
  }

  // ============================================================================
  // Partner Operations
  // ============================================================================

  private toPartnerDto(partner: NeturePartner): PartnerDto {
    return {
      id: partner.id,
      name: partner.name,
      business_name: partner.businessName || null,
      business_number: partner.businessNumber || null,
      type: partner.type,
      status: partner.status,
      description: partner.description || null,
      logo: partner.logo || null,
      website: partner.website || null,
      contact: partner.contact || null,
      address: partner.address || null,
      created_at: partner.createdAt.toISOString(),
      updated_at: partner.updatedAt.toISOString(),
    };
  }

  async listPartners(query: ListPartnersQueryDto): Promise<ListPartnersResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { partners, total } = await this.repository.findPartners({
      page,
      limit,
      type: query.type,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: partners.map((p) => this.toPartnerDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPartner(id: string): Promise<PartnerDto | null> {
    const partner = await this.repository.findPartnerById(id);
    if (!partner) return null;
    return this.toPartnerDto(partner);
  }

  async createPartner(
    data: CreatePartnerRequestDto,
    userId?: string
  ): Promise<PartnerDto> {
    const partner = await this.repository.createPartner({
      name: data.name,
      businessName: data.business_name,
      businessNumber: data.business_number,
      type: data.type || NeturePartnerType.PARTNER,
      description: data.description,
      logo: data.logo,
      website: data.website,
      contact: data.contact,
      address: data.address,
      userId: data.user_id,
      metadata: data.metadata,
      status: NeturePartnerStatus.PENDING,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toPartnerDto(partner);
  }

  async updatePartner(
    id: string,
    data: UpdatePartnerRequestDto,
    userId?: string
  ): Promise<PartnerDto | null> {
    const updateData: Partial<NeturePartner> = {
      updatedBy: userId,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.business_name !== undefined) updateData.businessName = data.business_name;
    if (data.business_number !== undefined) updateData.businessNumber = data.business_number;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.contact !== undefined) updateData.contact = data.contact;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const partner = await this.repository.updatePartner(id, updateData);
    if (!partner) return null;

    return this.toPartnerDto(partner);
  }

  async updatePartnerStatus(
    id: string,
    data: UpdatePartnerStatusRequestDto,
    userId?: string
  ): Promise<PartnerDto | null> {
    const partner = await this.repository.updatePartner(id, {
      status: data.status,
      updatedBy: userId,
    });
    if (!partner) return null;

    return this.toPartnerDto(partner);
  }

  // ============================================================================
  // Log Operations
  // ============================================================================

  private toLogDto(log: any): ProductLogDto {
    return {
      id: log.id,
      product_id: log.productId,
      action: log.action,
      before: log.before,
      after: log.after,
      note: log.note,
      performed_by: log.performedBy,
      created_at: log.createdAt.toISOString(),
    };
  }

  async listLogs(query: ListLogsQueryDto): Promise<ListLogsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { logs, total } = await this.repository.findLogs({
      page,
      limit,
      productId: query.product_id,
      action: query.action,
    });

    return {
      data: logs.map((l) => this.toLogDto(l)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
