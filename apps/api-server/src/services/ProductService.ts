import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Product, ProductStatus } from '../entities/Product.js';
import { Supplier } from '../entities/Supplier.js';
import { Category } from '../entities/Category.js';
import logger from '../utils/logger.js';
import { cacheService } from './cache.service.js';
import { prometheusMetrics } from './prometheus-metrics.service.js';

export interface CreateProductRequest {
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  slug?: string;
  supplierId: string;
  categoryId?: string;
  supplierPrice: number;
  recommendedPrice: number;
  comparePrice?: number;
  currency?: string;
  partnerCommissionRate?: number;
  partnerCommissionAmount?: number;
  tierPricing?: {
    bronze?: number;
    silver?: number;
    gold?: number;
    platinum?: number;
  };
  inventory: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  images?: {
    main: string;
    gallery?: string[];
    thumbnails?: string[];
  };
  tags?: string[];
  variants?: any[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: 'cm' | 'in' | 'kg' | 'lb';
  };
  specifications?: string;
  features?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: ProductStatus;
}

export interface ProductFilters {
  supplierId?: string;
  categoryId?: string;
  status?: ProductStatus;
  isActive?: boolean;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'name' | 'price' | 'createdAt' | 'inventory' | 'salesCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class ProductService {
  private productRepository: Repository<Product>;
  private supplierRepository: Repository<Supplier>;
  private categoryRepository: Repository<Category>;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    this.categoryRepository = AppDataSource.getRepository(Category);
  }

  // 제품 생성 (공급자용)
  async createProduct(data: CreateProductRequest): Promise<Product> {
    try {
      // 공급자 검증
      const supplier = await this.supplierRepository.findOne({
        where: { id: data.supplierId, isActive: true }
      });

      if (!supplier) {
        throw new Error('Supplier not found or inactive');
      }

      // SKU 중복 검사
      const existingProduct = await this.productRepository.findOne({
        where: { sku: data.sku }
      });

      if (existingProduct) {
        throw new Error('SKU already exists');
      }

      // Slug 생성 (없으면)
      const slug = data.slug || this.generateSlug(data.name);
      
      // Slug 중복 검사
      const existingSlug = await this.productRepository.findOne({
        where: { slug }
      });

      if (existingSlug) {
        throw new Error('Slug already exists');
      }

      // 카테고리 검증 (있다면)
      if (data.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: data.categoryId }
        });

        if (!category) {
          throw new Error('Category not found');
        }
      }

      // 제품 생성
      const product = this.productRepository.create({
        ...data,
        slug,
        status: ProductStatus.DRAFT,
        currency: data.currency || 'KRW',
        partnerCommissionRate: data.partnerCommissionRate || 5,
        trackInventory: data.trackInventory !== false,
        allowBackorder: data.allowBackorder || false,
        lowStockThreshold: data.lowStockThreshold || 10
      });

      const savedProduct = await this.productRepository.save(product);

      // 캐시 무효화 (목록 캐시만)
      await cacheService.invalidateProductCache();

      logger.info(`Product created: ${savedProduct.id} by supplier ${data.supplierId}`);

      return savedProduct;

    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  // 제품 조회 (단일) - 캐시 적용
  async getProduct(id: string): Promise<Product | null> {
    try {
      // 캐시에서 조회
      const cached = await cacheService.getProductDetails(id);
      if (cached) {
        logger.debug(`Product cache hit: ${id}`);
        prometheusMetrics.recordCacheHit('l2', 'product');
        return cached;
      }

      logger.debug(`Product cache miss: ${id}`);
      prometheusMetrics.recordCacheMiss('product');

      // DB에서 조회
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['supplier', 'category']
      });

      // 캐시에 저장 (600초 = 10분)
      if (product) {
        await cacheService.setProductDetails(id, product, 600);
      }

      return product;

    } catch (error) {
      logger.error('Error fetching product:', error);
      throw error;
    }
  }

  // 제품 목록 조회 (필터링) - 캐시 적용
  async getProducts(filters: ProductFilters = {}) {
    try {
      const {
        supplierId,
        categoryId,
        status,
        isActive,
        inStock,
        priceMin,
        priceMax,
        search,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      // 캐시에서 조회
      const cached = await cacheService.getProductList(filters);
      if (cached) {
        logger.debug('Product list cache hit', { filters });
        prometheusMetrics.recordCacheHit('l2', 'product');
        return cached;
      }

      logger.debug('Product list cache miss', { filters });
      prometheusMetrics.recordCacheMiss('product');

      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('product.category', 'category');

      // 필터 적용
      if (supplierId) {
        queryBuilder.andWhere('product.supplierId = :supplierId', { supplierId });
      }

      if (categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
      }

      if (status) {
        queryBuilder.andWhere('product.status = :status', { status });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('product.isActive = :isActive', { isActive });
      }

      if (inStock) {
        queryBuilder.andWhere('product.inventory > 0');
      }

      if (priceMin !== undefined) {
        queryBuilder.andWhere('product.supplierPrice >= :priceMin', { priceMin });
      }

      if (priceMax !== undefined) {
        queryBuilder.andWhere('product.supplierPrice <= :priceMax', { priceMax });
      }

      if (search) {
        queryBuilder.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (tags && tags.length > 0) {
        queryBuilder.andWhere('product.tags && :tags', { tags });
      }

      // 정렬
      const sortField = sortBy === 'price' ? 'supplierPrice' : sortBy;
      queryBuilder.orderBy(`product.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [products, total] = await queryBuilder.getManyAndCount();

      const result = {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      // 캐시에 저장 (300초 = 5분)
      await cacheService.setProductList(filters, result, 300);

      return result;

    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  // 제품 수정
  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // SKU 중복 검사 (변경된 경우)
      if (data.sku && data.sku !== product.sku) {
        const existingProduct = await this.productRepository.findOne({
          where: { sku: data.sku }
        });

        if (existingProduct) {
          throw new Error('SKU already exists');
        }
      }

      // Slug 중복 검사 (변경된 경우)
      if (data.slug && data.slug !== product.slug) {
        const existingSlug = await this.productRepository.findOne({
          where: { slug: data.slug }
        });

        if (existingSlug) {
          throw new Error('Slug already exists');
        }
      }

      // 카테고리 검증 (변경된 경우)
      if (data.categoryId && data.categoryId !== product.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: data.categoryId }
        });

        if (!category) {
          throw new Error('Category not found');
        }
      }

      // 제품 업데이트
      const updatedProduct = await this.productRepository.save({
        ...product,
        ...data,
        updatedAt: new Date()
      });

      // 캐시 무효화 (상세 + 목록)
      await cacheService.invalidateProductCache(id);

      logger.info(`Product updated: ${id}`);

      return updatedProduct;

    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  // 제품 삭제 (소프트 삭제)
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const result = await this.productRepository.update(id, {
        isActive: false,
        status: ProductStatus.DISCONTINUED
      });

      if (result.affected === 0) {
        throw new Error('Product not found');
      }

      // 캐시 무효화 (상세 + 목록)
      await cacheService.invalidateProductCache(id);

      logger.info(`Product deleted: ${id}`);

      return true;

    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  // 제품 활성화/비활성화
  async toggleProductStatus(id: string, isActive: boolean): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      product.isActive = isActive;
      product.status = isActive ? ProductStatus.ACTIVE : ProductStatus.INACTIVE;

      const updatedProduct = await this.productRepository.save(product);

      // 캐시 무효화 (상세 + 목록)
      await cacheService.invalidateProductCache(id);

      logger.info(`Product status changed: ${id} -> ${isActive ? 'active' : 'inactive'}`);

      return updatedProduct;

    } catch (error) {
      logger.error('Error toggling product status:', error);
      throw error;
    }
  }

  // 재고 업데이트
  async updateInventory(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set'): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      let newInventory = product.inventory;

      switch (operation) {
        case 'add':
          newInventory += quantity;
          break;
        case 'subtract':
          newInventory = Math.max(0, newInventory - quantity);
          break;
        case 'set':
          newInventory = Math.max(0, quantity);
          break;
      }

      product.inventory = newInventory;

      // 재고 부족 상태 업데이트
      if (product.trackInventory && newInventory <= (product.lowStockThreshold || 0)) {
        if (newInventory === 0) {
          product.status = ProductStatus.OUT_OF_STOCK;
        }
      }

      const updatedProduct = await this.productRepository.save(product);

      // 캐시 무효화 (상세 + 목록)
      await cacheService.invalidateProductCache(id);

      logger.info(`Product inventory updated: ${id} -> ${newInventory}`);

      return updatedProduct;

    } catch (error) {
      logger.error('Error updating inventory:', error);
      throw error;
    }
  }

  // 판매자가 선택 가능한 제품 목록 (활성화된 제품만)
  async getAvailableProductsForSellers(filters: Omit<ProductFilters, 'status'> = {}) {
    return this.getProducts({
      ...filters,
      status: ProductStatus.ACTIVE,
      isActive: true,
      inStock: true
    });
  }

  // 공급자별 제품 통계
  async getSupplierProductStats(supplierId: string) {
    try {
      const stats = await this.productRepository
        .createQueryBuilder('product')
        .select([
          'COUNT(*) as total',
          'COUNT(CASE WHEN product.status = :active THEN 1 END) as active',
          'COUNT(CASE WHEN product.status = :inactive THEN 1 END) as inactive',
          'COUNT(CASE WHEN product.status = :outOfStock THEN 1 END) as outOfStock',
          'COUNT(CASE WHEN product.inventory <= product.lowStockThreshold THEN 1 END) as lowStock',
          'AVG(product.supplierPrice) as averagePrice',
          'SUM(product.inventory) as totalInventory',
          'SUM(product.salesCount) as totalSales'
        ])
        .where('product.supplierId = :supplierId', { supplierId })
        .setParameters({
          active: ProductStatus.ACTIVE,
          inactive: ProductStatus.INACTIVE,
          outOfStock: ProductStatus.OUT_OF_STOCK
        })
        .getRawOne();

      return {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        inactive: parseInt(stats.inactive) || 0,
        outOfStock: parseInt(stats.outOfStock) || 0,
        lowStock: parseInt(stats.lowStock) || 0,
        averagePrice: parseFloat(stats.averagePrice) || 0,
        totalInventory: parseInt(stats.totalInventory) || 0,
        totalSales: parseInt(stats.totalSales) || 0
      };

    } catch (error) {
      logger.error('Error fetching supplier product stats:', error);
      throw error;
    }
  }

  // CSV 일괄 가져오기
  async bulkImportProducts(products: CreateProductRequest[]): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; sku?: string; error: string }>;
  }> {
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; sku?: string; error: string }>
    };

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        await this.createProduct(product);
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          sku: product.sku,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        logger.warn(`Failed to import product at row ${i + 1}: ${product.sku}`, error);
      }
    }

    logger.info(`Bulk import completed: ${results.imported} imported, ${results.failed} failed`);

    return results;
  }

  // 유틸리티: Slug 생성
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // 특수문자 제거
      .replace(/\s+/g, '-') // 공백을 하이픈으로
      .replace(/-+/g, '-') // 연속 하이픈 제거
      .trim();
  }
}

export default ProductService;