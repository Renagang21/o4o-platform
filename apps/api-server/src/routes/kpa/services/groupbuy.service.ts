/**
 * KPA Groupbuy Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts (lines 2367-2594)
 * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: E-commerce Core entities for order creation
 * WO-KPA-CAMPAIGN-PARTICIPATE-ENFORCEMENT-V1: Server-enforced pricing + validation gates
 *
 * Responsibilities:
 * - Groupbuy listing queries (public, with optional auth)
 * - Operator stats aggregation
 * - User participation (order creation via E-commerce Core)
 */

import type { DataSource, Repository } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import {
  EcommerceOrder,
  EcommerceOrderItem,
  OrderType,
  OrderStatus,
  PaymentStatus,
  BuyerType,
  SellerType,
} from '@o4o/ecommerce-core/entities';

// WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: ORD-YYYYMMDD-XXXX (GlycoPharm 동일 포맷)
function generateGroupbuyOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
}

export class GroupbuyService {
  private listingRepo: Repository<OrganizationProductListing>;

  constructor(private dataSource: DataSource) {
    this.listingRepo = dataSource.getRepository(OrganizationProductListing);
  }

  /**
   * GET / — Public groupbuy listing (paginated)
   */
  async listGroupbuys(page: number, limit: number): Promise<{ data: OrganizationProductListing[]; total: number }> {
    const safePage = page || 1;
    const safeLimit = Math.min(limit || 12, 50);

    const [data, total] = await this.listingRepo.findAndCount({
      where: { service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
      order: { created_at: 'ASC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  /**
   * GET /stats — Operator stats (orders, quantity, revenue, stores, listings)
   */
  async getGroupbuyStats(): Promise<{
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
    participatingStores: number;
    registeredProducts: number;
  }> {
    const [orderStats, quantityStats, storeStats, listingCount] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*)::int as "totalOrders",
          COALESCE(SUM(eo."totalAmount"), 0)::numeric as "totalRevenue"
        FROM ecommerce_orders eo
        WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
          AND eo.status = 'paid'
      `),
      this.dataSource.query(`
        SELECT COALESCE(SUM(oi.quantity), 0)::int as "totalQuantity"
        FROM ecommerce_order_items oi
        INNER JOIN ecommerce_orders eo ON eo.id = oi."orderId"
        WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
          AND eo.status = 'paid'
      `),
      this.dataSource.query(`
        SELECT COUNT(DISTINCT eo."buyerId")::int as "participatingStores"
        FROM ecommerce_orders eo
        WHERE eo.metadata->>'serviceKey' = 'kpa-groupbuy'
          AND eo.status = 'paid'
      `),
      this.listingRepo.count({
        where: { service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
      }),
    ]);

    return {
      totalOrders: orderStats[0]?.totalOrders ?? 0,
      totalQuantity: quantityStats[0]?.totalQuantity ?? 0,
      totalRevenue: parseFloat(orderStats[0]?.totalRevenue ?? '0'),
      participatingStores: storeStats[0]?.participatingStores ?? 0,
      registeredProducts: listingCount,
    };
  }

  /**
   * GET /my-participations — Authenticated user's groupbuy orders
   */
  async getMyParticipations(userId: string): Promise<{ data: any[]; total: number }> {
    const orderRepo = this.dataSource.getRepository(EcommerceOrder);
    const [orders, total] = await orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o."buyerId" = :buyerId', { buyerId: userId })
      .andWhere("o.metadata->>'serviceKey' = :sk", { sk: 'kpa-groupbuy' })
      .orderBy('o."createdAt"', 'DESC')
      .take(20)
      .getManyAndCount();

    const data = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      productName: (o.metadata as any)?.productName,
      createdAt: o.createdAt,
    }));

    return { data, total };
  }

  /**
   * GET /:id — Groupbuy detail (public)
   */
  async getGroupbuyDetail(id: string): Promise<OrganizationProductListing | null> {
    return this.listingRepo.findOne({
      where: { id, service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
    });
  }

  /**
   * POST /:id/participate — Create groupbuy order
   *
   * WO-KPA-GROUPBUY-ORDER-METADATA-SYNC-V1: listing.service_key -> Order.metadata.serviceKey propagation
   * WO-KPA-CAMPAIGN-PARTICIPATE-ENFORCEMENT-V1: Server-enforced price + validation gates
   */
  async participate(
    listingId: string,
    userId: string,
    data: { quantity?: number },
  ): Promise<{ orderId: string; orderNumber: string; status: string; totalAmount: number }> {
    // 1. listing 조회
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
    });
    if (!listing) {
      throw new GroupbuyError(404, 'Product not found');
    }

    // 2. 수량 (기본 1) + 가격 조회
    // WO-KPA-CAMPAIGN-PARTICIPATE-ENFORCEMENT-V1: 서버 강제 가격 + 검증 게이트
    const quantity = Math.max(1, parseInt(String(data?.quantity)) || 1);

    // Gate 1: Supplier product 활성/승인 검증
    const productRows = await this.dataSource.query(
      `SELECT spo.price_general, spo.is_active, spo.approval_status, s.status AS supplier_status,
              pm.marketing_name
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE spo.id = $1`,
      [listing.offer_id],
    );
    if (!productRows.length) {
      throw new GroupbuyError(404, 'Supplier product not found');
    }
    const product = productRows[0];
    if (!product.is_active) {
      throw new GroupbuyError(400, 'Product is not active', 'PRODUCT_INACTIVE');
    }
    if (product.approval_status !== 'APPROVED') {
      throw new GroupbuyError(400, 'Product is not approved', 'PRODUCT_NOT_APPROVED');
    }
    if (product.supplier_status !== 'ACTIVE') {
      throw new GroupbuyError(400, 'Supplier is not active', 'SUPPLIER_INACTIVE');
    }
    const basePrice = Number(product.price_general ?? 0);

    const unitPrice = basePrice;

    // Gate 3: 가격 유효성
    if (unitPrice <= 0) {
      throw new GroupbuyError(400, 'Invalid product price', 'INVALID_PRICE');
    }
    const subtotal = quantity * unitPrice;

    // 3. metadata.serviceKey 전파 — listing.service_key -> Order.metadata.serviceKey
    const metadata: Record<string, unknown> = {
      serviceKey: listing.service_key,
      productListingId: listing.id,
      productName: product.marketing_name || '',
      productId: listing.offer_id,
    };

    // 4. ecommerce_orders에 주문 생성 (GlycoPharm createCoreOrder 패턴)
    const orderRepo = this.dataSource.getRepository(EcommerceOrder);
    const orderItemRepo = this.dataSource.getRepository(EcommerceOrderItem);

    const order = orderRepo.create({
      orderNumber: generateGroupbuyOrderNumber(),
      buyerId: userId,
      buyerType: BuyerType.USER,
      sellerId: listing.organization_id,
      sellerType: SellerType.ORGANIZATION,
      orderType: OrderType.RETAIL,
      subtotal,
      shippingFee: 0,
      discount: 0,
      totalAmount: subtotal,
      currency: 'KRW',
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.CREATED,
      metadata,
      orderSource: 'kpa-society',
    });

    const savedOrder = await orderRepo.save(order);

    const orderItem = orderItemRepo.create({
      orderId: savedOrder.id,
      productId: listing.offer_id,
      productName: product.marketing_name || '',
      quantity,
      unitPrice,
      discount: 0,
      subtotal,
      metadata: { productListingId: listing.id },
    });

    await orderItemRepo.save(orderItem);

    return {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      status: savedOrder.status,
      totalAmount: savedOrder.totalAmount,
    };
  }
}

/**
 * Typed error for groupbuy operations — carries HTTP status + optional error code
 */
export class GroupbuyError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'GroupbuyError';
  }
}
