/**
 * Cosmetics Repository
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Data access layer for cosmetics domain
 */

import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import {
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  CosmeticsProductStatus,
  CosmeticsPricePolicy,
  CosmeticsProductLog,
  CosmeticsPriceLog,
  CosmeticsLogAction,
} from '../entities/index.js';
import {
  ListProductsQueryDto,
  SearchProductsQueryDto,
  ListBrandsQueryDto,
  ListLinesQueryDto,
  ListLogsQueryDto,
} from '../dto/index.js';

export class CosmeticsRepository {
  private brandRepo: Repository<CosmeticsBrand>;
  private lineRepo: Repository<CosmeticsLine>;
  private productRepo: Repository<CosmeticsProduct>;
  private pricePolicyRepo: Repository<CosmeticsPricePolicy>;
  private productLogRepo: Repository<CosmeticsProductLog>;
  private priceLogRepo: Repository<CosmeticsPriceLog>;

  constructor(private dataSource: DataSource) {
    this.brandRepo = dataSource.getRepository(CosmeticsBrand);
    this.lineRepo = dataSource.getRepository(CosmeticsLine);
    this.productRepo = dataSource.getRepository(CosmeticsProduct);
    this.pricePolicyRepo = dataSource.getRepository(CosmeticsPricePolicy);
    this.productLogRepo = dataSource.getRepository(CosmeticsProductLog);
    this.priceLogRepo = dataSource.getRepository(CosmeticsPriceLog);
  }

  // ============================================================================
  // Brand Repository Methods
  // ============================================================================

  async findAllBrands(query: ListBrandsQueryDto): Promise<CosmeticsBrand[]> {
    const qb = this.brandRepo.createQueryBuilder('brand');

    if (query.is_active !== undefined) {
      qb.where('brand.is_active = :isActive', { isActive: query.is_active });
    }

    qb.leftJoinAndSelect('brand.lines', 'lines', 'lines.is_active = true');
    qb.orderBy('brand.sortOrder', 'ASC').addOrderBy('brand.name', 'ASC');

    return qb.getMany();
  }

  async findBrandById(id: string): Promise<CosmeticsBrand | null> {
    return this.brandRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
  }

  async countProductsByBrandId(brandId: string): Promise<number> {
    return this.productRepo.count({
      where: { brandId, status: CosmeticsProductStatus.VISIBLE },
    });
  }

  // ============================================================================
  // Line Repository Methods
  // ============================================================================

  async findAllLines(query: ListLinesQueryDto): Promise<CosmeticsLine[]> {
    const qb = this.lineRepo.createQueryBuilder('line');

    if (query.brand_id) {
      qb.where('line.brand_id = :brandId', { brandId: query.brand_id });
    }

    qb.andWhere('line.is_active = true');
    qb.orderBy('line.sortOrder', 'ASC').addOrderBy('line.name', 'ASC');

    return qb.getMany();
  }

  async findLineById(id: string): Promise<CosmeticsLine | null> {
    return this.lineRepo.findOne({ where: { id } });
  }

  async countProductsByLineId(lineId: string): Promise<number> {
    return this.productRepo.count({
      where: { lineId, status: CosmeticsProductStatus.VISIBLE },
    });
  }

  async countAllProducts(): Promise<number> {
    return this.productRepo.count();
  }

  async countProductsByStatus(status: CosmeticsProductStatus): Promise<number> {
    return this.productRepo.count({ where: { status } });
  }

  // ============================================================================
  // Product Repository Methods
  // ============================================================================

  async findAllProducts(
    query: ListProductsQueryDto
  ): Promise<{ products: CosmeticsProduct[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.productRepo.createQueryBuilder('product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.leftJoinAndSelect('product.line', 'line');

    // Apply filters
    if (query.brand_id) {
      qb.andWhere('product.brand_id = :brandId', { brandId: query.brand_id });
    }
    if (query.line_id) {
      qb.andWhere('product.line_id = :lineId', { lineId: query.line_id });
    }
    if (query.status) {
      qb.andWhere('product.status = :status', { status: query.status });
    } else {
      // Default: only show visible products for public API
      qb.andWhere('product.status = :status', {
        status: CosmeticsProductStatus.VISIBLE,
      });
    }

    // Sorting
    // WO-O4O-COSMETICS-PRODUCTS-500-RECOVERY-V1:
    //   orderBy 는 DB 컬럼명이 아니라 **entity property** 를 받아야 한다.
    //   skip/take + join 이 함께 쓰이면 TypeORM 은 distinct 페이지네이션 경로
    //   (SelectQueryBuilder.createOrderByCombinedWithSelectExpression)로 들어가는데,
    //   거기서 findColumnWithPropertyPath() 결과를 가드 없이 .databaseName 으로 읽는다.
    //   'product.created_at' 처럼 컬럼명을 주면 undefined 가 되어 TypeError 로 전체 요청이 500.
    //   허용 sort 값만 property 로 매핑하고, 사용자 입력을 orderBy 문자열에 직접 넣지 않는다.
    const sortOrder = (query.order?.toUpperCase() || 'DESC') as 'ASC' | 'DESC';
    const sortPropertyByField: Record<string, string> = {
      created_at: 'product.createdAt',
      price: 'product.basePrice',
      name: 'product.name',
    };
    const sortProperty =
      sortPropertyByField[query.sort ?? ''] ?? sortPropertyByField.created_at;

    qb.orderBy(sortProperty, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    const [products, total] = await qb.getManyAndCount();
    return { products, total };
  }

  async searchProducts(
    query: SearchProductsQueryDto
  ): Promise<{ products: CosmeticsProduct[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const searchTerm = `%${query.q}%`;

    const qb = this.productRepo.createQueryBuilder('product');
    qb.leftJoinAndSelect('product.brand', 'brand');
    qb.leftJoinAndSelect('product.line', 'line');

    qb.where('product.status = :status', {
      status: CosmeticsProductStatus.VISIBLE,
    });
    qb.andWhere(
      '(product.name ILIKE :search OR product.description ILIKE :search OR brand.name ILIKE :search)',
      { search: searchTerm }
    );

    // WO-O4O-COSMETICS-PRODUCTS-500-RECOVERY-V1: entity property 사용 (findAllProducts 주석 참조)
    qb.orderBy('product.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [products, total] = await qb.getManyAndCount();
    return { products, total };
  }

  async findProductById(id: string): Promise<CosmeticsProduct | null> {
    return this.productRepo.findOne({
      where: { id },
      relations: ['brand', 'line', 'pricePolicy'],
    });
  }

  async createProduct(data: Partial<CosmeticsProduct>): Promise<CosmeticsProduct> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async updateProduct(
    id: string,
    data: Partial<CosmeticsProduct>
  ): Promise<CosmeticsProduct | null> {
    await this.productRepo.update(id, data);
    return this.findProductById(id);
  }

  async updateProductStatus(
    id: string,
    status: CosmeticsProductStatus,
    updatedBy?: string
  ): Promise<CosmeticsProduct | null> {
    await this.productRepo.update(id, { status, updatedBy });
    return this.findProductById(id);
  }

  // ============================================================================
  // Price Policy Repository Methods
  // ============================================================================

  async findPricePolicyByProductId(
    productId: string
  ): Promise<CosmeticsPricePolicy | null> {
    return this.pricePolicyRepo.findOne({ where: { productId } });
  }

  async createPricePolicy(
    data: Partial<CosmeticsPricePolicy>
  ): Promise<CosmeticsPricePolicy> {
    const policy = this.pricePolicyRepo.create(data);
    return this.pricePolicyRepo.save(policy);
  }

  async updatePricePolicy(
    productId: string,
    data: Partial<CosmeticsPricePolicy>
  ): Promise<CosmeticsPricePolicy | null> {
    const existing = await this.findPricePolicyByProductId(productId);
    if (!existing) {
      return null;
    }
    await this.pricePolicyRepo.update(existing.id, data);
    return this.findPricePolicyByProductId(productId);
  }

  async upsertPricePolicy(
    productId: string,
    data: Partial<CosmeticsPricePolicy>
  ): Promise<CosmeticsPricePolicy> {
    const existing = await this.findPricePolicyByProductId(productId);
    if (existing) {
      await this.pricePolicyRepo.update(existing.id, data);
      return (await this.findPricePolicyByProductId(productId))!;
    }
    return this.createPricePolicy({ ...data, productId });
  }

  // ============================================================================
  // Audit Log Repository Methods
  // ============================================================================

  async createProductLog(data: Partial<CosmeticsProductLog>): Promise<CosmeticsProductLog> {
    const log = this.productLogRepo.create(data);
    return this.productLogRepo.save(log);
  }

  async createPriceLog(data: Partial<CosmeticsPriceLog>): Promise<CosmeticsPriceLog> {
    const log = this.priceLogRepo.create(data);
    return this.priceLogRepo.save(log);
  }

  async findProductLogs(
    query: ListLogsQueryDto
  ): Promise<{ logs: CosmeticsProductLog[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.productLogRepo.createQueryBuilder('log');

    if (query.product_id) {
      qb.where('log.product_id = :productId', { productId: query.product_id });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  async findPriceLogs(
    query: ListLogsQueryDto
  ): Promise<{ logs: CosmeticsPriceLog[]; total: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.priceLogRepo.createQueryBuilder('log');

    if (query.product_id) {
      qb.where('log.product_id = :productId', { productId: query.product_id });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }
}
