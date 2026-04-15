/**
 * KPA Groupbuy Service
 *
 * WO-O4O-ROUTES-REFACTOR-V1: Extracted from kpa.routes.ts
 * WO-EVENT-OFFER-FIX-V1: checkout_orders 테이블 사용, ecommerce_orders 제거
 *
 * Responsibilities:
 * - Groupbuy listing queries (public, with optional auth)
 * - Operator stats aggregation
 * - User participation (order creation via checkoutService)
 */

import type { DataSource, Repository } from 'typeorm';
import { OrganizationProductListing } from '../../../modules/store-core/entities/organization-product-listing.entity.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { CheckoutOrder } from '../../../entities/checkout/CheckoutOrder.entity.js';
import { checkoutService } from '../../../services/checkout.service.js';

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
    const [orderStats, storeStats, listingCount] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*)::int AS "totalOrders",
          COALESCE(SUM(total_amount), 0)::numeric AS "totalRevenue",
          COALESCE(SUM(
            (SELECT COALESCE(SUM((elem->>'quantity')::int), 0)
             FROM jsonb_array_elements(items) AS elem)
          ), 0)::int AS "totalQuantity"
        FROM checkout_orders
        WHERE metadata->>'serviceKey' = 'kpa-groupbuy'
          AND status = 'paid'
      `),
      this.dataSource.query(`
        SELECT COUNT(DISTINCT buyer_id)::int AS "participatingStores"
        FROM checkout_orders
        WHERE metadata->>'serviceKey' = 'kpa-groupbuy'
          AND status = 'paid'
      `),
      this.listingRepo.count({
        where: { service_key: SERVICE_KEYS.KPA_GROUPBUY, is_active: true },
      }),
    ]);

    return {
      totalOrders: orderStats[0]?.totalOrders ?? 0,
      totalQuantity: orderStats[0]?.totalQuantity ?? 0,
      totalRevenue: parseFloat(orderStats[0]?.totalRevenue ?? '0'),
      participatingStores: storeStats[0]?.participatingStores ?? 0,
      registeredProducts: listingCount,
    };
  }

  /**
   * GET /my-participations — Authenticated user's groupbuy orders
   */
  async getMyParticipations(userId: string): Promise<{ data: any[]; total: number }> {
    const orderRepo = this.dataSource.getRepository(CheckoutOrder);
    const [orders, total] = await orderRepo
      .createQueryBuilder('o')
      .where('o.buyerId = :buyerId', { buyerId: userId })
      .andWhere("o.metadata->>'serviceKey' = :sk", { sk: 'kpa-groupbuy' })
      .orderBy('o.createdAt', 'DESC')
      .take(20)
      .getManyAndCount();

    const data = orders.map(o => ({
      id: o.id,
      groupbuyId: (o.metadata as any)?.productListingId || '',
      groupbuy: { title: (o.metadata as any)?.productName || o.orderNumber },
      quantity: (o.items as any[])?.[0]?.quantity || 1,
      totalPrice: o.totalAmount,
      participatedAt: o.createdAt,
      status: o.status,
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
   * POST /:id/participate — Create groupbuy order via checkoutService
   *
   * WO-EVENT-OFFER-FIX-V1: checkout_orders 사용, metadata.serviceKey 전파
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

    const quantity = Math.max(1, parseInt(String(data?.quantity)) || 1);

    // 2. Supplier product 활성/승인 검증 + 가격 조회
    const productRows = await this.dataSource.query(
      `SELECT spo.id AS spo_id, spo.supplier_id, spo.price_general, spo.is_active,
              spo.approval_status, s.status AS supplier_status,
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
    if (!product.is_active) throw new GroupbuyError(400, 'Product is not active', 'PRODUCT_INACTIVE');
    if (product.approval_status !== 'APPROVED') throw new GroupbuyError(400, 'Product is not approved', 'PRODUCT_NOT_APPROVED');
    if (product.supplier_status !== 'ACTIVE') throw new GroupbuyError(400, 'Supplier is not active', 'SUPPLIER_INACTIVE');

    const unitPrice = Number(product.price_general ?? 0);
    if (unitPrice <= 0) throw new GroupbuyError(400, 'Invalid product price', 'INVALID_PRICE');

    const subtotal = quantity * unitPrice;

    // 3. 주문 생성 (checkoutService 경유 — CLAUDE.md 규칙)
    const savedOrder = await checkoutService.createOrder({
      buyerId: userId,
      sellerId: listing.organization_id,
      supplierId: product.supplier_id,
      items: [{
        productId: listing.offer_id,
        productName: product.marketing_name || '',
        quantity,
        unitPrice,
        subtotal,
      }],
      metadata: {
        serviceKey: listing.service_key,
        productListingId: listing.id,
        productName: product.marketing_name || '',
        productId: listing.offer_id,
      },
    });

    return {
      orderId: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      status: savedOrder.status,
      totalAmount: savedOrder.totalAmount,
    };
  }
}

/**
 * Typed error for groupbuy operations
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
