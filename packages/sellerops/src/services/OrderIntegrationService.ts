/**
 * OrderIntegrationService
 *
 * E-commerce Core + Dropshipping Core 통합 조회 서비스
 *
 * ## Phase 4 역할
 *
 * 이 서비스는 E-commerce Core의 판매 원장과
 * Dropshipping Core의 Relay 정보를 통합하여 조회합니다.
 *
 * ### 조회 전략
 *
 * 1. **판매 원장 기준 조회**
 *    - EcommerceOrderQueryService를 통해 판매 사실 기준 조회
 *    - OrderType 필터링 지원
 *
 * 2. **Relay 정보 보강**
 *    - Dropshipping 주문인 경우 OrderRelayService로 Relay 정보 조회
 *    - 공급자 정보, 배송 추적 등 보강
 *
 * 3. **기존 API 호환**
 *    - 기존 OrderOpsService와 동일한 응답 형식 유지
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderRelay, SellerListing } from '@o4o/dropshipping-core';
import type { OrderListItemDto, OrderDetailDto } from '../dto/index.js';

/**
 * 통합 주문 필터
 */
export interface IntegratedOrderFilters {
  sellerId: string;
  orderType?: 'retail' | 'dropshipping' | 'b2b' | 'subscription';
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 통합 주문 요약
 */
export interface IntegratedOrderSummary {
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  pendingCount: number;
  completedCount: number;
  byOrderType: Record<string, { count: number; amount: number }>;
}

@Injectable()
export class OrderIntegrationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderRelay)
    private readonly orderRelayRepository: Repository<OrderRelay>,
    @InjectRepository(SellerListing)
    private readonly listingRepository: Repository<SellerListing>
  ) {}

  /**
   * 통합 주문 목록 조회
   *
   * E-commerce Core의 EcommerceOrder가 있으면 우선 조회하고,
   * 연결된 OrderRelay 정보를 보강합니다.
   *
   * @note 현재는 기존 OrderRelay 기반 조회를 유지하면서
   *       ecommerceOrderId가 있는 경우 추가 정보를 보강합니다.
   */
  async getIntegratedOrders(
    filters: IntegratedOrderFilters
  ): Promise<OrderListItemDto[]> {
    const { sellerId, status, dateFrom, dateTo, limit, offset } = filters;

    // 기존 OrderRelay 기반 조회 (기존 호환성 유지)
    const query = this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoinAndSelect('relay.listing', 'listing')
      .innerJoinAndSelect('listing.offer', 'offer')
      .innerJoinAndSelect('offer.productMaster', 'product')
      .where('listing.sellerId = :sellerId', { sellerId });

    if (status) {
      query.andWhere('relay.status = :status', { status });
    }

    if (dateFrom) {
      query.andWhere('relay.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('relay.createdAt <= :dateTo', { dateTo });
    }

    query.orderBy('relay.createdAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    if (offset) {
      query.skip(offset);
    }

    const orders = await query.getMany();

    // E-commerce Order 정보 보강 (ecommerceOrderId가 있는 경우)
    const result: OrderListItemDto[] = [];

    for (const order of orders) {
      const item: OrderListItemDto = {
        id: order.id,
        listingId: order.listingId,
        productName: order.listing?.offer?.productMaster?.name || 'Unknown',
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        status: order.status,
        relayStatus: order.status,
        createdAt: order.createdAt,
      };

      // ecommerceOrderId가 있으면 추가 정보 보강
      if (order.ecommerceOrderId) {
        const ecommerceOrder = await this.getEcommerceOrderInfo(
          order.ecommerceOrderId
        );
        if (ecommerceOrder) {
          item.ecommerceOrderId = order.ecommerceOrderId;
          item.orderType = ecommerceOrder.orderType as
            | 'retail'
            | 'dropshipping'
            | 'b2b'
            | 'subscription';
          item.paymentStatus = ecommerceOrder.paymentStatus;
        }
      }

      result.push(item);
    }

    return result;
  }

  /**
   * 통합 주문 요약 조회
   */
  async getIntegratedOrderSummary(
    sellerId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<IntegratedOrderSummary> {
    // E-commerce Order 기반 통계 (ecommerceOrderId가 있는 주문)
    const ecommerceStats = await this.getEcommerceOrderStats(
      sellerId,
      dateFrom,
      dateTo
    );

    // Legacy OrderRelay 기반 통계 (ecommerceOrderId가 없는 주문)
    const legacyStats = await this.getLegacyOrderStats(
      sellerId,
      dateFrom,
      dateTo
    );

    return {
      totalOrders: ecommerceStats.totalOrders + legacyStats.totalOrders,
      totalAmount: ecommerceStats.totalAmount + legacyStats.totalAmount,
      paidAmount: ecommerceStats.paidAmount + legacyStats.paidAmount,
      pendingCount: ecommerceStats.pendingCount + legacyStats.pendingCount,
      completedCount: ecommerceStats.completedCount + legacyStats.completedCount,
      byOrderType: {
        dropshipping: {
          count: ecommerceStats.totalOrders + legacyStats.totalOrders,
          amount: ecommerceStats.totalAmount + legacyStats.totalAmount,
        },
        // 향후 retail, b2b 등 추가
      },
    };
  }

  // ===== Helper Methods =====

  /**
   * E-commerce Order 정보 조회
   */
  private async getEcommerceOrderInfo(
    ecommerceOrderId: string
  ): Promise<{ orderType: string; paymentStatus: string } | null> {
    try {
      const result = await this.dataSource.query(
        `SELECT "orderType", "paymentStatus"
         FROM ecommerce_orders
         WHERE id = $1`,
        [ecommerceOrderId]
      );
      return result[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * E-commerce Order 기반 통계
   */
  private async getEcommerceOrderStats(
    sellerId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalOrders: number;
    totalAmount: number;
    paidAmount: number;
    pendingCount: number;
    completedCount: number;
  }> {
    try {
      let query = `
        SELECT
          COUNT(*) as "totalOrders",
          COALESCE(SUM("totalAmount"), 0) as "totalAmount",
          COALESCE(SUM(CASE WHEN "paymentStatus" = 'paid' THEN "totalAmount" ELSE 0 END), 0) as "paidAmount",
          SUM(CASE WHEN status IN ('created', 'pending_payment') THEN 1 ELSE 0 END) as "pendingCount",
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as "completedCount"
        FROM ecommerce_orders
        WHERE "sellerId" = $1
      `;
      const params: any[] = [sellerId];

      if (dateFrom) {
        query += ` AND "createdAt" >= $${params.length + 1}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND "createdAt" <= $${params.length + 1}`;
        params.push(dateTo);
      }

      const result = await this.dataSource.query(query, params);
      const row = result[0] || {};

      return {
        totalOrders: parseInt(row.totalOrders || '0', 10),
        totalAmount: parseFloat(row.totalAmount || '0'),
        paidAmount: parseFloat(row.paidAmount || '0'),
        pendingCount: parseInt(row.pendingCount || '0', 10),
        completedCount: parseInt(row.completedCount || '0', 10),
      };
    } catch {
      return {
        totalOrders: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingCount: 0,
        completedCount: 0,
      };
    }
  }

  /**
   * Legacy OrderRelay 기반 통계 (ecommerceOrderId가 없는 주문)
   */
  private async getLegacyOrderStats(
    sellerId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalOrders: number;
    totalAmount: number;
    paidAmount: number;
    pendingCount: number;
    completedCount: number;
  }> {
    const query = this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoin('relay.listing', 'listing')
      .where('listing.sellerId = :sellerId', { sellerId })
      .andWhere('relay.ecommerceOrderId IS NULL');

    if (dateFrom) {
      query.andWhere('relay.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('relay.createdAt <= :dateTo', { dateTo });
    }

    const stats = await query
      .select('COUNT(*)', 'totalOrders')
      .addSelect('COALESCE(SUM(relay.totalPrice), 0)', 'totalAmount')
      .addSelect(
        `SUM(CASE WHEN relay.status IN ('delivered', 'completed') THEN relay.totalPrice ELSE 0 END)`,
        'paidAmount'
      )
      .addSelect(
        `SUM(CASE WHEN relay.status = 'pending' THEN 1 ELSE 0 END)`,
        'pendingCount'
      )
      .addSelect(
        `SUM(CASE WHEN relay.status IN ('delivered', 'completed') THEN 1 ELSE 0 END)`,
        'completedCount'
      )
      .getRawOne();

    return {
      totalOrders: parseInt(stats?.totalOrders || '0', 10),
      totalAmount: parseFloat(stats?.totalAmount || '0'),
      paidAmount: parseFloat(stats?.paidAmount || '0'),
      pendingCount: parseInt(stats?.pendingCount || '0', 10),
      completedCount: parseInt(stats?.completedCount || '0', 10),
    };
  }
}
