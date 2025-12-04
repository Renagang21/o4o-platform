import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SellerProduct, SellerProductStatus } from '../entities/SellerProduct.js';
import { Seller, SellerTier } from '../entities/Seller.js';
import { Product, ProductStatus } from '../../commerce/entities/Product.js';
import { User } from '../../../entities/User.js';
import logger from '../../../utils/logger.js';

export interface AddProductToSellerRequest {
  sellerId: string;
  productId: string;
  salePrice: number;
  inventory?: number;
  customTitle?: string;
  customDescription?: string;
  customImages?: string[];
  tags?: string[];
  isActive?: boolean;
}

export interface UpdateSellerProductRequest {
  salePrice?: number;
  inventory?: number;
  customTitle?: string;
  customDescription?: string;
  customImages?: string[];
  tags?: string[];
  isActive?: boolean;
  status?: SellerProductStatus;
}

export interface SellerProductFilters {
  sellerId?: string;
  productId?: string;
  supplierId?: string;
  categoryId?: string;
  status?: SellerProductStatus;
  isActive?: boolean;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'addedAt' | 'salePrice' | 'inventory' | 'salesCount' | 'productName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BulkAddProductsRequest {
  sellerId: string;
  products: {
    productId: string;
    salePrice: number;
    inventory?: number;
  }[];
}

export interface ProfitAnalysis {
  supplierPrice: number;
  salePrice: number;
  margin: number;
  marginPercentage: number;
  recommendedPrice: number;
  belowRecommended: boolean;
}

export class SellerProductService {
  private sellerProductRepository: Repository<SellerProduct>;
  private sellerRepository: Repository<Seller>;
  private productRepository: Repository<Product>;
  private userRepository: Repository<User>;

  constructor() {
    this.sellerProductRepository = AppDataSource.getRepository(SellerProduct);
    this.sellerRepository = AppDataSource.getRepository(Seller);
    this.productRepository = AppDataSource.getRepository(Product);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // 판매자가 제품을 자신의 상점에 추가
  async addProductToSeller(data: AddProductToSellerRequest): Promise<SellerProduct> {
    try {
      // 판매자 검증
      const seller = await this.sellerRepository.findOne({
        where: { id: data.sellerId, isActive: true }
      });

      if (!seller) {
        throw new Error('Seller not found or inactive');
      }

      // 제품 검증 (활성 상태이고 재고가 있는 제품만)
      const product = await this.productRepository.findOne({
        where: { 
          id: data.productId, 
          status: ProductStatus.ACTIVE,
          isActive: true
        },
        relations: ['supplier']
      });

      if (!product) {
        throw new Error('Product not found or not available for sale');
      }

      if (product.trackInventory && product.inventory <= 0) {
        throw new Error('Product is out of stock');
      }

      // 이미 추가된 제품인지 확인
      const existingSellerProduct = await this.sellerProductRepository.findOne({
        where: { sellerId: data.sellerId, productId: data.productId }
      });

      if (existingSellerProduct) {
        throw new Error('Product already added to seller store');
      }

      // 판매자 등급에 따른 공급가 계산
      const supplierPrice = product.getCurrentPrice(seller.tier);

      // 판매 가격 검증 (공급가보다 높아야 함)
      if (data.salePrice <= supplierPrice) {
        throw new Error(`Seller price must be higher than supplier price (${supplierPrice})`);
      }

      // 권장 판매가 대비 너무 낮은 가격 경고
      if (data.salePrice < product.recommendedPrice * 0.8) {
        logger.warn(`Seller price significantly below recommended: ${data.salePrice} vs ${product.recommendedPrice}`);
      }

      const sellerProduct = this.sellerProductRepository.create({
        ...data,
        status: SellerProductStatus.ACTIVE,
        sellerInventory: data.inventory || product.inventory,
        costPrice: supplierPrice,
        profit: data.salePrice - supplierPrice,
        profitMargin: ((data.salePrice - supplierPrice) / data.salePrice) * 100,
        isActive: data.isActive !== false
      });

      const savedSellerProduct = await this.sellerProductRepository.save(sellerProduct);

      logger.info(`Product added to seller: ${data.productId} -> ${data.sellerId}`);
      
      return savedSellerProduct;

    } catch (error) {
      logger.error('Error adding product to seller:', error);
      throw error;
    }
  }

  // 판매자 제품 정보 수정
  async updateSellerProduct(sellerProductId: string, data: UpdateSellerProductRequest): Promise<SellerProduct> {
    try {
      const sellerProduct = await this.sellerProductRepository.findOne({
        where: { id: sellerProductId },
        relations: ['product']
      });

      if (!sellerProduct) {
        throw new Error('Seller product not found');
      }

      // 가격 변경 시 검증
      if (data.salePrice !== undefined) {
        const seller = await this.sellerRepository.findOne({
          where: { id: sellerProduct.sellerId }
        });

        if (!seller) {
          throw new Error('Seller not found');
        }

        const supplierPrice = sellerProduct.product.getCurrentPrice(seller.tier);

        if (data.salePrice <= supplierPrice) {
          throw new Error(`Seller price must be higher than supplier price (${supplierPrice})`);
        }
      }

      const updatedSellerProduct = await this.sellerProductRepository.save({
        ...sellerProduct,
        ...data,
        updatedAt: new Date()
      });

      logger.info(`Seller product updated: ${sellerProductId}`);
      
      return updatedSellerProduct;

    } catch (error) {
      logger.error('Error updating seller product:', error);
      throw error;
    }
  }

  // 판매자 제품 제거 (소프트 삭제)
  async removeProductFromSeller(sellerProductId: string): Promise<boolean> {
    try {
      const result = await this.sellerProductRepository.update(sellerProductId, {
        isActive: false,
        status: SellerProductStatus.DISCONTINUED
      });

      if (result.affected === 0) {
        throw new Error('Seller product not found');
      }

      logger.info(`Product removed from seller: ${sellerProductId}`);
      
      return true;

    } catch (error) {
      logger.error('Error removing product from seller:', error);
      throw error;
    }
  }

  // 판매자 제품 목록 조회
  async getSellerProducts(filters: SellerProductFilters = {}) {
    try {
      const {
        sellerId,
        productId,
        supplierId,
        categoryId,
        status,
        isActive,
        inStock,
        priceMin,
        priceMax,
        search,
        tags,
        sortBy = 'addedAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const queryBuilder = this.sellerProductRepository
        .createQueryBuilder('sp')
        .leftJoinAndSelect('sp.product', 'product')
        .leftJoinAndSelect('sp.seller', 'seller')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('product.category', 'category');

      if (sellerId) {
        queryBuilder.andWhere('sp.sellerId = :sellerId', { sellerId });
      }

      if (productId) {
        queryBuilder.andWhere('sp.productId = :productId', { productId });
      }

      if (supplierId) {
        queryBuilder.andWhere('product.supplierId = :supplierId', { supplierId });
      }

      if (categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
      }

      if (status) {
        queryBuilder.andWhere('sp.status = :status', { status });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('sp.isActive = :isActive', { isActive });
      }

      if (inStock) {
        queryBuilder.andWhere('sp.inventory > 0');
      }

      if (priceMin !== undefined) {
        queryBuilder.andWhere('sp.salePrice >= :priceMin', { priceMin });
      }

      if (priceMax !== undefined) {
        queryBuilder.andWhere('sp.salePrice <= :priceMax', { priceMax });
      }

      if (search) {
        queryBuilder.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search OR sp.customTitle ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      if (tags && tags.length > 0) {
        queryBuilder.andWhere('(product.tags && :tags OR sp.tags && :tags)', { tags });
      }

      // 정렬
      let sortField: string;
      switch (sortBy) {
        case 'productName':
          sortField = 'product.name';
          break;
        case 'addedAt':
          sortField = 'sp.addedAt';
          break;
        default:
          sortField = `sp.${sortBy}`;
      }

      queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [sellerProducts, total] = await queryBuilder.getManyAndCount();

      return {
        sellerProducts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching seller products:', error);
      throw error;
    }
  }

  // 판매자가 추가 가능한 제품 목록 조회
  async getAvailableProducts(sellerId: string, filters: Partial<SellerProductFilters> = {}) {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId }
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      // 이미 추가된 제품 ID 목록
      const addedProducts = await this.sellerProductRepository.find({
        where: { sellerId },
        select: ['productId']
      });

      const addedProductIds = addedProducts.map(sp => sp.productId);

      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.supplier', 'supplier')
        .leftJoinAndSelect('product.category', 'category')
        .where('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('product.isActive = :isActive', { isActive: true });

      // 이미 추가된 제품 제외
      if (addedProductIds.length > 0) {
        queryBuilder.andWhere('product.id NOT IN (:...addedProductIds)', { addedProductIds });
      }

      // 추가 필터 적용
      if (filters.supplierId) {
        queryBuilder.andWhere('product.supplierId = :supplierId', { supplierId: filters.supplierId });
      }

      if (filters.categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: filters.categoryId });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      queryBuilder
        .orderBy('product.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

      const [products, total] = await queryBuilder.getManyAndCount();

      // 각 제품의 판매자 등급별 공급가 포함
      const productsWithPricing = products.map(product => ({
        ...product,
        supplierPrice: product.getCurrentPrice(seller.tier),
        tierPricing: product.tierPricing,
        recommendedPrice: product.recommendedPrice
      }));

      return {
        products: productsWithPricing,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching available products:', error);
      throw error;
    }
  }

  // 대량 제품 추가
  async bulkAddProducts(data: BulkAddProductsRequest): Promise<SellerProduct[]> {
    try {
      const seller = await this.sellerRepository.findOne({
        where: { id: data.sellerId, isActive: true }
      });

      if (!seller) {
        throw new Error('Seller not found or inactive');
      }

      const productIds = data.products.map(p => p.productId);
      
      // 모든 제품 검증
      const products = await this.productRepository.find({
        where: { 
          id: In(productIds),
          status: ProductStatus.ACTIVE,
          isActive: true
        }
      });

      if (products.length !== productIds.length) {
        throw new Error('Some products are not available for sale');
      }

      // 이미 추가된 제품 확인
      const existingSellerProducts = await this.sellerProductRepository.find({
        where: { sellerId: data.sellerId, productId: In(productIds) }
      });

      if (existingSellerProducts.length > 0) {
        throw new Error('Some products are already added to seller store');
      }

      const sellerProducts: SellerProduct[] = [];

      for (const productData of data.products) {
        const product = products.find(p => p.id === productData.productId);
        if (!product) continue;

        const supplierPrice = product.getCurrentPrice(seller.tier);

        if (productData.salePrice <= supplierPrice) {
          throw new Error(`Invalid seller price for product ${product.name}: must be higher than ${supplierPrice}`);
        }
        
        const sellerProduct = this.sellerProductRepository.create({
          sellerId: data.sellerId,
          productId: productData.productId,
          salePrice: productData.salePrice,
          sellerInventory: productData.inventory || product.inventory,
          costPrice: supplierPrice,
          profit: productData.salePrice - supplierPrice,
          profitMargin: ((productData.salePrice - supplierPrice) / productData.salePrice) * 100,
          status: SellerProductStatus.ACTIVE,
          isActive: true
        });

        sellerProducts.push(sellerProduct);
      }

      const savedSellerProducts = await this.sellerProductRepository.save(sellerProducts);

      logger.info(`Bulk products added to seller: ${savedSellerProducts.length} products -> ${data.sellerId}`);
      
      return savedSellerProducts;

    } catch (error) {
      logger.error('Error bulk adding products:', error);
      throw error;
    }
  }

  // 판매자 제품 수익성 분석
  async analyzeProfitability(sellerProductId: string): Promise<ProfitAnalysis> {
    try {
      const sellerProduct = await this.sellerProductRepository.findOne({
        where: { id: sellerProductId },
        relations: ['product']
      });

      if (!sellerProduct) {
        throw new Error('Seller product not found');
      }

      const seller = await this.sellerRepository.findOne({
        where: { id: sellerProduct.sellerId }
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      const supplierPrice = sellerProduct.product.getCurrentPrice(seller.tier);
      const salePrice = sellerProduct.salePrice;
      const recommendedPrice = sellerProduct.product.recommendedPrice;

      const margin = salePrice - supplierPrice;
      const marginPercentage = (margin / salePrice) * 100;
      const belowRecommended = salePrice < recommendedPrice;

      return {
        supplierPrice,
        salePrice,
        margin: Math.round(margin * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 100) / 100,
        recommendedPrice,
        belowRecommended
      };

    } catch (error) {
      logger.error('Error analyzing profitability:', error);
      throw error;
    }
  }

  // 판매자 제품 재고 동기화 (공급자 재고와 동기화)
  async syncInventory(sellerId: string): Promise<{ updated: number; outOfStock: number }> {
    try {
      const sellerProducts = await this.sellerProductRepository.find({
        where: { sellerId, isActive: true },
        relations: ['product']
      });

      let updated = 0;
      let outOfStock = 0;

      for (const sellerProduct of sellerProducts) {
        const product = sellerProduct.product;
        
        if (!product.trackInventory) continue;

        const availableInventory = Math.min(sellerProduct.sellerInventory || 0, product.inventory);
        
        if ((sellerProduct.sellerInventory || 0) !== availableInventory) {
          sellerProduct.sellerInventory = availableInventory;
          
          if (availableInventory === 0) {
            sellerProduct.status = SellerProductStatus.OUT_OF_STOCK;
            outOfStock++;
          } else if (sellerProduct.status === SellerProductStatus.OUT_OF_STOCK) {
            sellerProduct.status = SellerProductStatus.ACTIVE;
          }

          await this.sellerProductRepository.save(sellerProduct);
          updated++;
        }
      }

      logger.info(`Inventory sync completed for seller ${sellerId}: ${updated} updated, ${outOfStock} out of stock`);

      return { updated, outOfStock };

    } catch (error) {
      logger.error('Error syncing inventory:', error);
      throw error;
    }
  }

  // 판매자 제품 통계
  async getSellerProductStats(sellerId: string) {
    try {
      const stats = await this.sellerProductRepository
        .createQueryBuilder('sp')
        .select([
          'COUNT(*) as total',
          'COUNT(CASE WHEN sp.status = :active THEN 1 END) as active',
          'COUNT(CASE WHEN sp.status = :inactive THEN 1 END) as inactive',
          'COUNT(CASE WHEN sp.status = :outOfStock THEN 1 END) as outOfStock',
          'COUNT(CASE WHEN sp.sellerInventory <= 10 THEN 1 END) as lowStock',
          'AVG(sp.salePrice) as averagePrice',
          'SUM(sp.sellerInventory) as totalInventory',
          'SUM(sp.totalSold) as totalSales'
        ])
        .where('sp.sellerId = :sellerId', { sellerId })
        .setParameters({
          active: SellerProductStatus.ACTIVE,
          inactive: SellerProductStatus.INACTIVE,
          outOfStock: SellerProductStatus.OUT_OF_STOCK
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
      logger.error('Error fetching seller product stats:', error);
      throw error;
    }
  }

  // 판매자 제품 성과 분석 (베스트셀러, 수익성 등)
  async getSellerProductPerformance(sellerId: string, limit: number = 10) {
    try {
      // 판매자 정보 조회
      const seller = await this.sellerRepository.findOne({
        where: { id: sellerId }
      });

      if (!seller) {
        throw new Error('Seller not found');
      }

      // 베스트셀러 제품
      const bestSellers = await this.sellerProductRepository
        .createQueryBuilder('sp')
        .leftJoinAndSelect('sp.product', 'product')
        .where('sp.sellerId = :sellerId', { sellerId })
        .andWhere('sp.isActive = :isActive', { isActive: true })
        .orderBy('sp.salesCount', 'DESC')
        .take(limit)
        .getMany();

      // 가장 수익성 높은 제품 (마진율 기준)
      const sellerProducts = await this.sellerProductRepository.find({
        where: { sellerId, isActive: true },
        relations: ['product']
      });

      const profitableProducts = sellerProducts
        .map(sp => {
          const supplierPrice = sp.product.getCurrentPrice(seller.tier);
          const margin = sp.salePrice - supplierPrice;
          const marginPercentage = (margin / sp.salePrice) * 100;
          
          return {
            ...sp,
            margin,
            marginPercentage
          };
        })
        .sort((a, b) => b.marginPercentage - a.marginPercentage)
        .slice(0, limit);

      // 재고 부족 제품
      const lowStockProducts = await this.sellerProductRepository
        .createQueryBuilder('sp')
        .leftJoinAndSelect('sp.product', 'product')
        .where('sp.sellerId = :sellerId', { sellerId })
        .andWhere('sp.isActive = :isActive', { isActive: true })
        .andWhere('sp.sellerInventory <= 10')
        .orderBy('sp.sellerInventory', 'ASC')
        .take(limit)
        .getMany();

      return {
        bestSellers,
        profitableProducts,
        lowStockProducts
      };

    } catch (error) {
      logger.error('Error fetching seller product performance:', error);
      throw error;
    }
  }
}

export default SellerProductService;