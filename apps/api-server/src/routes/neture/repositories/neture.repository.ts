/**
 * Neture Repository
 *
 * Phase D-1: Neture API Server 골격 구축
 * Phase G-3: 주문/결제 플로우 구현
 * Data access layer for Neture entities
 */

import { DataSource, Repository, FindManyOptions, ILike } from 'typeorm';
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
import {
  NetureProductLog,
  NetureLogAction,
} from '../entities/neture-product-log.entity.js';
import { NetureOrder, NetureOrderStatus } from '../entities/neture-order.entity.js';
import { NetureOrderItem } from '../entities/neture-order-item.entity.js';
import { SupplierProductOffer } from '../../../modules/neture/entities/SupplierProductOffer.entity.js';

export class NetureRepository {
  private productRepo: Repository<NetureProduct>;
  private partnerRepo: Repository<NeturePartner>;
  private logRepo: Repository<NetureProductLog>;
  private orderRepo: Repository<NetureOrder>;
  private orderItemRepo: Repository<NetureOrderItem>;
  private supplierOfferRepo: Repository<SupplierProductOffer>;

  constructor(private dataSource: DataSource) {
    this.productRepo = dataSource.getRepository(NetureProduct);
    this.partnerRepo = dataSource.getRepository(NeturePartner);
    this.logRepo = dataSource.getRepository(NetureProductLog);
    this.orderRepo = dataSource.getRepository(NetureOrder);
    this.orderItemRepo = dataSource.getRepository(NetureOrderItem);
    this.supplierOfferRepo = dataSource.getRepository(SupplierProductOffer);
  }

  // ============================================================================
  // Product Operations
  // ============================================================================

  async findProducts(options: {
    page?: number;
    limit?: number;
    partnerId?: string;
    category?: NetureProductCategory;
    status?: NetureProductStatus;
    isFeatured?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<{ products: NetureProduct[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.partnerId) where.partnerId = options.partnerId;
    if (options.category) where.category = options.category;
    if (options.status) where.status = options.status;
    if (options.isFeatured !== undefined) where.isFeatured = options.isFeatured;

    const orderField = options.sort || 'createdAt';
    const orderDir = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const findOptions: FindManyOptions<NetureProduct> = {
      where,
      relations: ['partner'],
      skip,
      take: limit,
      order: { [orderField === 'price' ? 'basePrice' : orderField]: orderDir } as any,
    };

    const [products, total] = await this.productRepo.findAndCount(findOptions);
    return { products, total };
  }

  async searchProducts(options: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: NetureProduct[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepo.findAndCount({
      where: [
        { name: ILike(`%${options.query}%`) },
        { description: ILike(`%${options.query}%`) },
      ],
      relations: ['partner'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { products, total };
  }

  async findProductById(id: string): Promise<NetureProduct | null> {
    return this.productRepo.findOne({
      where: { id },
      relations: ['partner'],
    });
  }

  async createProduct(data: Partial<NetureProduct>): Promise<NetureProduct> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async updateProduct(id: string, data: Partial<NetureProduct>): Promise<NetureProduct | null> {
    await this.productRepo.update(id, data);
    return this.findProductById(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await this.productRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.productRepo.increment({ id }, 'viewCount', 1);
  }

  // ============================================================================
  // Partner Operations
  // ============================================================================

  async findPartners(options: {
    page?: number;
    limit?: number;
    type?: NeturePartnerType;
    status?: NeturePartnerStatus;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<{ partners: NeturePartner[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;

    const orderField = options.sort || 'createdAt';
    const orderDir = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [partners, total] = await this.partnerRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { [orderField]: orderDir } as any,
    });

    return { partners, total };
  }

  async findPartnerById(id: string): Promise<NeturePartner | null> {
    return this.partnerRepo.findOne({ where: { id } });
  }

  async createPartner(data: Partial<NeturePartner>): Promise<NeturePartner> {
    const partner = this.partnerRepo.create(data);
    return this.partnerRepo.save(partner);
  }

  async updatePartner(id: string, data: Partial<NeturePartner>): Promise<NeturePartner | null> {
    await this.partnerRepo.update(id, data);
    return this.findPartnerById(id);
  }

  async deletePartner(id: string): Promise<boolean> {
    const result = await this.partnerRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  // ============================================================================
  // Log Operations
  // ============================================================================

  async createLog(data: Partial<NetureProductLog>): Promise<NetureProductLog> {
    const log = this.logRepo.create(data);
    return this.logRepo.save(log);
  }

  async findLogs(options: {
    page?: number;
    limit?: number;
    productId?: string;
    action?: NetureLogAction;
  }): Promise<{ logs: NetureProductLog[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.productId) where.productId = options.productId;
    if (options.action) where.action = options.action;

    const [logs, total] = await this.logRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { logs, total };
  }

  // ============================================================================
  // Order Operations (Phase G-3)
  // ============================================================================

  async findOrders(options: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: NetureOrderStatus;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<{ orders: NetureOrder[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.userId) where.userId = options.userId;
    if (options.status) where.status = options.status;

    const orderField = options.sort || 'createdAt';
    const orderDir = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['items'],
      skip,
      take: limit,
      order: { [orderField]: orderDir } as any,
    });

    return { orders, total };
  }

  async findOrderById(id: string): Promise<NetureOrder | null> {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async findOrderByNumber(orderNumber: string): Promise<NetureOrder | null> {
    return this.orderRepo.findOne({
      where: { orderNumber },
      relations: ['items'],
    });
  }

  async createOrder(data: Partial<NetureOrder>): Promise<NetureOrder> {
    const order = this.orderRepo.create(data);
    return this.orderRepo.save(order);
  }

  async createOrderItems(items: Partial<NetureOrderItem>[]): Promise<NetureOrderItem[]> {
    const orderItems = this.orderItemRepo.create(items);
    return this.orderItemRepo.save(orderItems);
  }

  async updateOrder(id: string, data: Partial<NetureOrder>): Promise<NetureOrder | null> {
    await this.orderRepo.update(id, data);
    return this.findOrderById(id);
  }

  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `NTR${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }

  async findProductsByIds(ids: string[]): Promise<NetureProduct[]> {
    if (ids.length === 0) return [];
    return this.productRepo.findByIds(ids);
  }

  /**
   * WO-NETURE-B2B-ORDER-SERVER-PRICE-ENFORCEMENT-V1
   * B2B 주문용 공급자 상품 조회 (supplier relation 포함)
   */
  async findSupplierOffersByIds(ids: string[]): Promise<SupplierProductOffer[]> {
    if (ids.length === 0) return [];
    return this.supplierOfferRepo.find({
      where: ids.map(id => ({ id })),
      relations: ['supplier', 'master'],
    });
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    await this.productRepo.decrement({ id: productId }, 'stock', quantity);
  }

  async restoreStock(productId: string, quantity: number): Promise<void> {
    await this.productRepo.increment({ id: productId }, 'stock', quantity);
  }

}
