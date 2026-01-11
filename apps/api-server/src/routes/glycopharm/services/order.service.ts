/**
 * Glycopharm Order Service
 *
 * H8-2: 주문/결제 API v1 Implementation
 * Business logic for order creation and management
 */

import { DataSource, Repository } from 'typeorm';
import { GlycopharmOrder, GlycopharmOrderStatus } from '../entities/glycopharm-order.entity.js';
import { GlycopharmOrderItem } from '../entities/glycopharm-order-item.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';

// ============================================================================
// Types
// ============================================================================

export interface CreateOrderItemDto {
  product_id: string;
  quantity: number;
}

export interface CreateOrderDto {
  pharmacy_id: string;
  items: CreateOrderItemDto[];
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: string;
  note?: string;
}

export interface OrderItemResponseDto {
  id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderResponseDto {
  id: string;
  pharmacy_id: string;
  pharmacy_name?: string;
  user_id: string;
  status: GlycopharmOrderStatus;
  total_amount: number;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: string;
  note?: string;
  paid_at?: string;
  payment_method?: string;
  items: OrderItemResponseDto[];
  created_at: string;
  updated_at: string;
}

export interface OrderListItemDto {
  id: string;
  pharmacy_id: string;
  pharmacy_name?: string;
  status: GlycopharmOrderStatus;
  total_amount: number;
  item_count: number;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PayOrderDto {
  payment_method: string;
  payment_id?: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * ⚠️ PHASE 5-A: READ-ONLY MODE
 *
 * This service is now in READ-ONLY mode per CLAUDE.md §7.
 * All write operations (create, update, delete) are disabled.
 *
 * New orders must be created via E-commerce Core:
 * - POST /api/v1/ecommerce/orders with orderType: 'GLYCOPHARM'
 *
 * Reference: WO-O4O-STRUCTURE-REFORM-PHASE5-V01
 * Effective: 2026-01-11
 */
const GLYCOPHARM_ORDER_READONLY = true;

export class GlycopharmOrderService {
  private orderRepo: Repository<GlycopharmOrder>;
  private orderItemRepo: Repository<GlycopharmOrderItem>;
  private productRepo: Repository<GlycopharmProduct>;
  private pharmacyRepo: Repository<GlycopharmPharmacy>;

  constructor(dataSource: DataSource) {
    this.orderRepo = dataSource.getRepository(GlycopharmOrder);
    this.orderItemRepo = dataSource.getRepository(GlycopharmOrderItem);
    this.productRepo = dataSource.getRepository(GlycopharmProduct);
    this.pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  /**
   * @deprecated DISABLED - Use E-commerce Core instead
   * @throws Error Always throws - direct order creation is no longer supported
   */
  async createOrder(_dto: CreateOrderDto, _userId: string): Promise<OrderResponseDto> {
    if (GLYCOPHARM_ORDER_READONLY) {
      throw new Error(
        'GLYCOPHARM_ORDER_READONLY: Direct order creation is disabled. ' +
        'Use E-commerce Core API: POST /api/v1/ecommerce/orders with orderType: GLYCOPHARM. ' +
        'See CLAUDE.md §7 for details.'
      );
    }
    // Legacy code below - unreachable when GLYCOPHARM_ORDER_READONLY is true
    const dto = _dto;
    const userId = _userId;
    // 1. Validate pharmacy
    const pharmacy = await this.pharmacyRepo.findOneBy({ id: dto.pharmacy_id });
    if (!pharmacy) {
      throw new Error('Pharmacy not found');
    }
    if (pharmacy.status !== 'active') {
      throw new Error('Pharmacy is not active');
    }

    // 2. Validate products and calculate totals
    const orderItems: Partial<GlycopharmOrderItem>[] = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      const product = await this.productRepo.findOneBy({ id: item.product_id });
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }
      if (product.status !== 'active') {
        throw new Error(`Product is not available: ${product.name}`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for: ${product.name}`);
      }

      const unitPrice = product.sale_price ? Number(product.sale_price) : Number(product.price);
      const subtotal = unitPrice * item.quantity;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      });

      totalAmount += subtotal;
    }

    // 3. Create order
    const order = this.orderRepo.create({
      pharmacy_id: dto.pharmacy_id,
      user_id: userId,
      status: 'CREATED',
      total_amount: totalAmount,
      customer_name: dto.customer_name,
      customer_phone: dto.customer_phone,
      shipping_address: dto.shipping_address,
      note: dto.note,
    });

    const savedOrder = await this.orderRepo.save(order);

    // 4. Create order items
    const savedItems: GlycopharmOrderItem[] = [];
    for (const item of orderItems) {
      const orderItem = this.orderItemRepo.create({
        ...item,
        order_id: savedOrder.id,
      });
      const savedItem = await this.orderItemRepo.save(orderItem);
      savedItems.push(savedItem);
    }

    // 5. Update stock (reserve)
    for (const item of dto.items) {
      await this.productRepo.decrement(
        { id: item.product_id },
        'stock_quantity',
        item.quantity
      );
    }

    return this.toOrderResponse(savedOrder, savedItems, pharmacy.name);
  }

  async getOrderById(orderId: string, userId?: string): Promise<OrderResponseDto | null> {
    const queryBuilder = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.pharmacy', 'pharmacy')
      .where('order.id = :orderId', { orderId });

    if (userId) {
      queryBuilder.andWhere('order.user_id = :userId', { userId });
    }

    const order = await queryBuilder.getOne();
    if (!order) return null;

    return this.toOrderResponse(order, order.items || [], order.pharmacy?.name);
  }

  async listMyOrders(
    userId: string,
    query: { page?: number; limit?: number; status?: GlycopharmOrderStatus }
  ): Promise<{ data: OrderListItemDto[]; meta: PaginationMeta }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.pharmacy', 'pharmacy')
      .leftJoin('order.items', 'items')
      .addSelect('COUNT(items.id)', 'item_count')
      .where('order.user_id = :userId', { userId })
      .groupBy('order.id')
      .addGroupBy('pharmacy.id')
      .orderBy('order.created_at', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('order.status = :status', { status: query.status });
    }

    const total = await this.orderRepo.count({
      where: { user_id: userId, ...(query.status ? { status: query.status } : {}) },
    });

    const orders = await queryBuilder.skip(skip).take(limit).getRawAndEntities();

    const data: OrderListItemDto[] = orders.entities.map((order, index) => ({
      id: order.id,
      pharmacy_id: order.pharmacy_id,
      pharmacy_name: order.pharmacy?.name,
      status: order.status,
      total_amount: Number(order.total_amount),
      item_count: parseInt(orders.raw[index]?.item_count || '0', 10),
      created_at: order.created_at.toISOString(),
    }));

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

  // ============================================================================
  // Payment Methods (v1 Stub)
  // ============================================================================

  /**
   * @deprecated DISABLED - Use E-commerce Core instead
   * @throws Error Always throws - direct payment is no longer supported
   */
  async payOrder(_orderId: string, _userId: string, _dto: PayOrderDto): Promise<OrderResponseDto> {
    if (GLYCOPHARM_ORDER_READONLY) {
      throw new Error(
        'GLYCOPHARM_ORDER_READONLY: Direct payment processing is disabled. ' +
        'Use E-commerce Core API for payment processing. ' +
        'See CLAUDE.md §7 for details.'
      );
    }
    // Legacy code below - unreachable when GLYCOPHARM_ORDER_READONLY is true
    const orderId = _orderId;
    const userId = _userId;
    const dto = _dto;
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items', 'pharmacy'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'CREATED') {
      throw new Error(`Cannot pay order in status: ${order.status}`);
    }

    // v1 Stub: 결제는 항상 성공으로 처리
    order.status = 'PAID';
    order.paid_at = new Date();
    order.payment_method = dto.payment_method;
    order.payment_id = dto.payment_id || `STUB_${Date.now()}`;

    const savedOrder = await this.orderRepo.save(order);

    return this.toOrderResponse(savedOrder, order.items || [], order.pharmacy?.name);
  }

  /**
   * @deprecated DISABLED - Use E-commerce Core instead
   * @throws Error Always throws - direct order status change is no longer supported
   */
  async failOrder(_orderId: string, _reason: string): Promise<OrderResponseDto> {
    if (GLYCOPHARM_ORDER_READONLY) {
      throw new Error(
        'GLYCOPHARM_ORDER_READONLY: Direct order status change is disabled. ' +
        'Use E-commerce Core API for order management. ' +
        'See CLAUDE.md §7 for details.'
      );
    }
    // Legacy code below - unreachable when GLYCOPHARM_ORDER_READONLY is true
    const orderId = _orderId;
    const reason = _reason;
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'pharmacy'],
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'CREATED') {
      throw new Error(`Cannot fail order in status: ${order.status}`);
    }

    // Restore stock
    for (const item of order.items || []) {
      await this.productRepo.increment(
        { id: item.product_id },
        'stock_quantity',
        item.quantity
      );
    }

    order.status = 'FAILED';
    order.failure_reason = reason;

    const savedOrder = await this.orderRepo.save(order);

    return this.toOrderResponse(savedOrder, order.items || [], order.pharmacy?.name);
  }

  // ============================================================================
  // Response Mappers
  // ============================================================================

  private toOrderResponse(
    order: GlycopharmOrder,
    items: GlycopharmOrderItem[],
    pharmacyName?: string
  ): OrderResponseDto {
    return {
      id: order.id,
      pharmacy_id: order.pharmacy_id,
      pharmacy_name: pharmacyName,
      user_id: order.user_id,
      status: order.status,
      total_amount: Number(order.total_amount),
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      note: order.note,
      paid_at: order.paid_at?.toISOString(),
      payment_method: order.payment_method,
      items: items.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      })),
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString(),
    };
  }
}
