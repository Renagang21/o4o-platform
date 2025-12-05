import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SellerProduct, SyncPolicy } from '../entities/SellerProduct.js';
import { Product, ProductStatus } from '../../commerce/entities/Product.js';
import { User, UserRole } from '../../../entities/User.js';
import { Seller, SellerStatus, SellerTier } from '../entities/Seller.js';
import { SellerApplicationDto, UpdateSellerDto } from '../dto/seller-application.dto.js';
import logger from '../../../utils/logger.js';

/**
 * SellerService
 * Phase PD-3: Dropshipping Seller Workflow
 *
 * Handles seller-specific operations:
 * - Catalog browsing (supplier products)
 * - Product import
 * - Seller product management
 */

export interface CatalogFilters {
  search?: string;
  category?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
  onlyAvailable?: boolean;
}

export interface ImportProductRequest {
  productId: string;
  salePrice?: number;
  marginRate?: number;
  syncPolicy?: SyncPolicy;
}

// Note: Renamed to avoid conflict with SellerProductService exports
export interface SellerServiceUpdateProductRequest {
  salePrice?: number;
  marginRate?: number;
  syncPolicy?: SyncPolicy;
  isActive?: boolean;
}

// Note: Renamed to avoid conflict with SellerProductService exports
export interface SellerServiceProductFilters {
  search?: string;
  syncPolicy?: SyncPolicy;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'salePrice' | 'marginRate';
  sortOrder?: 'ASC' | 'DESC';
}

// Default margin rate if not specified (20%)
const DEFAULT_MARGIN_RATE = 0.20;

export class SellerService {
  private static instance: SellerService;
  private sellerRepository: Repository<Seller>;
  private sellerProductRepository: Repository<SellerProduct>;
  private productRepository: Repository<Product>;
  private userRepository: Repository<User>;

  constructor() {
    this.sellerRepository = AppDataSource.getRepository(Seller);
    this.sellerProductRepository = AppDataSource.getRepository(SellerProduct);
    this.productRepository = AppDataSource.getRepository(Product);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SellerService {
    if (!SellerService.instance) {
      SellerService.instance = new SellerService();
    }
    return SellerService.instance;
  }

  /**
   * Get Seller by User ID
   * Used to find seller profile for authenticated user
   */
  async getByUserId(userId: string): Promise<Seller | null> {
    const seller = await this.sellerRepository.findOne({
      where: { userId },
      relations: ['user']
    });

    return seller;
  }

  /**
   * Get Seller by ID
   */
  async findById(id: string): Promise<Seller | null> {
    const seller = await this.sellerRepository.findOne({
      where: { id },
      relations: ['user']
    });

    return seller;
  }

  /**
   * Create new Seller from application
   * Status starts as PENDING, requires admin approval
   */
  async createSeller(userId: string, dto: SellerApplicationDto): Promise<Seller> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if seller already exists for this user
    const existing = await this.sellerRepository.findOne({
      where: { userId }
    });

    if (existing) {
      throw new Error('Seller already exists for this user');
    }

    // Validate storeSlug uniqueness
    const slugExists = await this.sellerRepository.findOne({
      where: { storeSlug: dto.storeSlug }
    });

    if (slugExists) {
      throw new Error('Store slug already taken');
    }

    // Create Seller entity
    const seller = this.sellerRepository.create({
      userId,
      status: SellerStatus.PENDING,
      tier: SellerTier.BRONZE,
      storeSlug: dto.storeSlug,
      branding: dto.branding,
      policies: dto.policies || {},
      platformCommissionRate: 0.10, // Default 10%
      metrics: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        customerSatisfaction: 0,
        returnRate: 0,
        responseTime: 0
      }
    });

    const saved = await this.sellerRepository.save(seller);

    logger.info(`[SellerService] Seller application created`, {
      userId,
      sellerId: saved.id,
      storeSlug: dto.storeSlug,
      status: SellerStatus.PENDING
    });

    return saved;
  }

  /**
   * Update Seller profile
   * Seller can update branding, policies, etc.
   */
  async updateSellerProfile(sellerId: string, dto: UpdateSellerDto): Promise<Seller> {
    const seller = await this.sellerRepository.findOne({
      where: { id: sellerId }
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Update branding if provided
    if (dto.branding) {
      seller.branding = {
        ...seller.branding,
        ...dto.branding
      };
    }

    // Update policies if provided
    if (dto.policies) {
      seller.policies = {
        ...seller.policies,
        ...dto.policies
      };
    }

    // Update storeSlug if provided and unique
    if (dto.storeSlug && dto.storeSlug !== seller.storeSlug) {
      const slugExists = await this.sellerRepository.findOne({
        where: { storeSlug: dto.storeSlug }
      });

      if (slugExists) {
        throw new Error('Store slug already taken');
      }

      seller.storeSlug = dto.storeSlug;
    }

    const updated = await this.sellerRepository.save(seller);

    logger.info(`[SellerService] Seller profile updated`, {
      sellerId,
      updates: Object.keys(dto)
    });

    return updated;
  }

  /**
   * Approve Seller application
   * Admin/Platform action to approve seller application
   * Phase B-4 Step 3: Added for ApprovalController integration
   */
  async approveSeller(
    sellerId: string,
    approvedBy: string
  ): Promise<Seller> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      seller.approve(approvedBy);
      const approved = await this.sellerRepository.save(seller);

      logger.info(`[SellerService] Seller approved`, {
        sellerId,
        approvedBy,
        status: approved.status
      });

      return approved;
    } catch (error: any) {
      logger.error('[SellerService.approveSeller] Error', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Reject Seller application
   * Admin/Platform action to reject seller application
   */
  async rejectSeller(sellerId: string): Promise<Seller> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      seller.reject();
      const rejected = await this.sellerRepository.save(seller);

      logger.info(`[SellerService] Seller rejected`, {
        sellerId,
        status: rejected.status
      });

      return rejected;
    } catch (error: any) {
      logger.error('[SellerService.rejectSeller] Error', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Suspend Seller
   * Admin/Platform action to suspend seller account
   */
  async suspendSeller(sellerId: string): Promise<Seller> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      seller.suspend();
      const suspended = await this.sellerRepository.save(seller);

      logger.info(`[SellerService] Seller suspended`, {
        sellerId,
        status: suspended.status
      });

      return suspended;
    } catch (error: any) {
      logger.error('[SellerService.suspendSeller] Error', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Reactivate Seller
   * Admin/Platform action to reactivate suspended seller
   */
  async reactivateSeller(sellerId: string): Promise<Seller> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId },
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      seller.reactivate();
      const reactivated = await this.sellerRepository.save(seller);

      logger.info(`[SellerService] Seller reactivated`, {
        sellerId,
        status: reactivated.status,
        isActive: reactivated.isActive
      });

      return reactivated;
    } catch (error: any) {
      logger.error('[SellerService.reactivateSeller] Error', {
        error: error.message,
        sellerId,
      });
      throw error;
    }
  }

  /**
   * Get supplier product catalog for sellers
   * Returns products that can be imported
   */
  async getCatalog(sellerId: string, filters: CatalogFilters = {}) {
    const {
      search,
      category,
      supplierId,
      page = 1,
      limit = 20,
      onlyAvailable = true
    } = filters;

    // Build query
    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoin(
        'seller_products',
        'sp',
        'sp.productId = product.id AND sp.sellerId = :sellerId',
        { sellerId }
      )
      .addSelect(['sp.id', 'sp.isActive']);

    // Filter only active/published products
    if (onlyAvailable) {
      query.andWhere('product.status = :status', { status: ProductStatus.ACTIVE });
      query.andWhere('product.isActive = true');
    }

    // Search by product name
    if (search) {
      query.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    // Filter by category
    if (category) {
      query.andWhere('product.categoryId = :category', { category });
    }

    // Filter by supplier
    if (supplierId) {
      query.andWhere('product.supplierId = :supplierId', { supplierId });
    }

    // Pagination
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    // Ordering
    query.orderBy('product.createdAt', 'DESC');

    const [products, total] = await query.getManyAndCount();

    // Transform results
    const items = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.shortDescription || product.description,
      supplierName: product.supplier?.businessInfo?.businessName || 'Unknown',
      supplierId: product.supplierId,
      basePrice: parseFloat(product.supplierPrice?.toString() || '0'),
      recommendedPrice: parseFloat(product.recommendedPrice?.toString() || product.supplierPrice?.toString() || '0'),
      currency: product.currency || 'KRW',
      thumbnailUrl: product.images?.main || null,
      status: product.status,
      inventory: product.inventory,
      isImported: !!product.sp_id,
      sellerProductId: product.sp_id || null,
      isActive: product.sp_isActive || false
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Import a product into seller's catalog
   */
  async importProduct(sellerId: string, request: ImportProductRequest) {
    const { productId, salePrice, marginRate, syncPolicy = 'auto' } = request;

    // Verify seller exists and has seller role
    const seller = await this.userRepository.findOne({
      where: { id: sellerId }
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Check if product exists and is available
    const product = await this.productRepository.findOne({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE || !product.isActive) {
      throw new Error('Product is not available for import');
    }

    // Check if already imported
    const existing = await this.sellerProductRepository.findOne({
      where: { sellerId, productId }
    });

    if (existing) {
      throw new Error('Product already imported');
    }

    // Get base price (supplier price)
    const basePrice = parseFloat(product.supplierPrice?.toString() || '0');

    if (basePrice <= 0) {
      throw new Error('Invalid product base price');
    }

    // Determine sale price
    let finalSalePrice: number;
    let finalMarginRate: number;

    if (salePrice) {
      // Use provided sale price
      finalSalePrice = salePrice;
      finalMarginRate = (finalSalePrice - basePrice) / finalSalePrice;
    } else if (marginRate) {
      // Calculate from margin rate
      finalMarginRate = marginRate;
      finalSalePrice = basePrice / (1 - marginRate);
    } else {
      // Use default margin rate (20%)
      finalMarginRate = DEFAULT_MARGIN_RATE;
      finalSalePrice = basePrice / (1 - DEFAULT_MARGIN_RATE);
    }

    const marginAmount = finalSalePrice - basePrice;

    // Create SellerProduct
    const sellerProduct = this.sellerProductRepository.create({
      sellerId,
      productId,
      salePrice: finalSalePrice,
      basePriceSnapshot: basePrice,
      marginRate: finalMarginRate,
      marginAmount,
      syncPolicy,
      isActive: true
    });

    const saved = await this.sellerProductRepository.save(sellerProduct);

    logger.info(`[PD-3] Product imported by seller`, {
      sellerId,
      productId,
      sellerProductId: saved.id,
      salePrice: finalSalePrice,
      marginRate: finalMarginRate,
      syncPolicy
    });

    return saved;
  }

  /**
   * Get seller's imported products
   */
  async getSellerProducts(sellerId: string, filters: SellerServiceProductFilters = {}) {
    const {
      search,
      syncPolicy,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const query = this.sellerProductRepository.createQueryBuilder('sp')
      .leftJoinAndSelect('sp.product', 'product')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('sp.sellerId = :sellerId', { sellerId });

    // Filters
    if (search) {
      query.andWhere('product.name ILIKE :search', { search: `%${search}%` });
    }

    if (syncPolicy) {
      query.andWhere('sp.syncPolicy = :syncPolicy', { syncPolicy });
    }

    if (isActive !== undefined) {
      query.andWhere('sp.isActive = :isActive', { isActive });
    }

    // Sorting
    const orderMap: Record<string, string> = {
      createdAt: 'sp.createdAt',
      salePrice: 'sp.salePrice',
      marginRate: 'sp.marginRate'
    };

    const orderField = orderMap[sortBy] || 'sp.createdAt';
    query.orderBy(orderField, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    const [sellerProducts, total] = await query.getManyAndCount();

    // Transform results
    const items = sellerProducts.map(sp => ({
      id: sp.id,
      productId: sp.productId,
      name: sp.product.name,
      description: sp.product.shortDescription || sp.product.description,
      supplierName: sp.product.supplier?.businessInfo?.businessName || 'Unknown',
      thumbnailUrl: sp.product.images?.main || null,
      basePrice: parseFloat(sp.basePriceSnapshot?.toString() || '0'),
      salePrice: parseFloat(sp.salePrice?.toString() || '0'),
      marginRate: parseFloat(sp.marginRate?.toString() || '0'),
      marginAmount: parseFloat(sp.marginAmount?.toString() || '0'),
      syncPolicy: sp.syncPolicy,
      isActive: sp.isActive,
      createdAt: sp.createdAt,
      updatedAt: sp.updatedAt
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update seller product
   */
  async updateSellerProduct(
    sellerId: string,
    sellerProductId: string,
    updates: SellerServiceUpdateProductRequest
  ) {
    // Find seller product
    const sellerProduct = await this.sellerProductRepository.findOne({
      where: { id: sellerProductId, sellerId },
      relations: ['product']
    });

    if (!sellerProduct) {
      throw new Error('Seller product not found or access denied');
    }

    // Update fields
    if (updates.salePrice !== undefined) {
      sellerProduct.updatePricing(updates.salePrice, sellerProduct.basePriceSnapshot || undefined);
    } else if (updates.marginRate !== undefined) {
      sellerProduct.applySalePriceFromMargin(updates.marginRate);
    }

    if (updates.syncPolicy !== undefined) {
      sellerProduct.syncPolicy = updates.syncPolicy;
    }

    if (updates.isActive !== undefined) {
      sellerProduct.isActive = updates.isActive;
    }

    const updated = await this.sellerProductRepository.save(sellerProduct);

    logger.info(`[PD-3] Seller product updated`, {
      sellerId,
      sellerProductId,
      updates
    });

    return updated;
  }

  /**
   * Get seller product by ID
   */
  async getSellerProduct(sellerId: string, sellerProductId: string) {
    const sellerProduct = await this.sellerProductRepository.findOne({
      where: { id: sellerProductId, sellerId },
      relations: ['product', 'product.supplier']
    });

    if (!sellerProduct) {
      throw new Error('Seller product not found or access denied');
    }

    return sellerProduct;
  }

  /**
   * Delete (remove) seller product
   */
  async deleteSellerProduct(sellerId: string, sellerProductId: string) {
    const sellerProduct = await this.sellerProductRepository.findOne({
      where: { id: sellerProductId, sellerId }
    });

    if (!sellerProduct) {
      throw new Error('Seller product not found or access denied');
    }

    await this.sellerProductRepository.remove(sellerProduct);

    logger.info(`[PD-3] Seller product deleted`, {
      sellerId,
      sellerProductId
    });

    return { success: true };
  }

  /**
   * Get seller import statistics
   */
  async getSellerStats(sellerId: string) {
    const totalImported = await this.sellerProductRepository.count({
      where: { sellerId }
    });

    const activeProducts = await this.sellerProductRepository.count({
      where: { sellerId, isActive: true }
    });

    // Recent imports (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentImports = await this.sellerProductRepository
      .createQueryBuilder('sp')
      .where('sp.sellerId = :sellerId', { sellerId })
      .andWhere('sp.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    // Average margin rate
    const result = await this.sellerProductRepository
      .createQueryBuilder('sp')
      .select('AVG(sp.marginRate)', 'avgMargin')
      .where('sp.sellerId = :sellerId', { sellerId })
      .andWhere('sp.isActive = true')
      .getRawOne();

    const avgMarginRate = parseFloat(result?.avgMargin || '0');

    return {
      totalImported,
      activeProducts,
      inactiveProducts: totalImported - activeProducts,
      recentImports,
      avgMarginRate
    };
  }
}
