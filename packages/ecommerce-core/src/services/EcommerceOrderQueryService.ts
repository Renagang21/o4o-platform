/**
 * EcommerceOrderQueryService
 *
 * 공통 조회 및 집계 서비스
 *
 * ## 설계 원칙
 *
 * 1. **판매 사실 기준**: 모든 조회/집계는 "판매가 발생했다"는 사실만 기준으로 합니다.
 *    - 정산 계산, 공급자 분배 등의 로직은 포함하지 않습니다.
 *    - 이는 각 Core App(Dropshipping Core, Retail Core 등)의 책임입니다.
 *
 * 2. **OrderType 불가지론**: 이 서비스는 OrderType에 따른 비즈니스 로직을 수행하지 않습니다.
 *    - 단순히 조회 조건으로만 사용합니다.
 *
 * 3. **확장앱 활용 기반**: Service Extension이 공통으로 사용할 수 있는
 *    기본 조회 기능을 제공합니다.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  EcommerceOrder,
  OrderType,
  OrderStatus,
  PaymentStatus,
} from '../entities/EcommerceOrder.entity.js';

/**
 * 일별 주문 요약
 */
export interface DailyOrderSummary {
  date: string;
  orderCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  cancelledCount: number;
}

/**
 * OrderType별 통계
 */
export interface OrderTypeStats {
  orderType: OrderType;
  orderCount: number;
  totalAmount: number;
  averageAmount: number;
}

/**
 * 판매자별 통계
 */
export interface SellerStats {
  sellerId: string;
  orderCount: number;
  totalAmount: number;
  paidAmount: number;
}

/**
 * 조회 필터 옵션
 */
export interface OrderQueryFilters {
  orderType?: OrderType;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  sellerId?: string;
  buyerId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EcommerceOrderQueryService {
  constructor(
    @InjectRepository(EcommerceOrder)
    private readonly orderRepository: Repository<EcommerceOrder>
  ) {}

  // ===== 기본 조회 메서드 =====

  /**
   * OrderType으로 주문 조회
   *
   * @param orderType - 주문 유형
   * @param options - 추가 필터 옵션
   * @returns 주문 목록
   *
   * @example
   * // Dropshipping Core에서 사용
   * const dropshippingOrders = await queryService.findByOrderType(
   *   OrderType.DROPSHIPPING,
   *   { status: OrderStatus.PAID }
   * );
   */
  async findByOrderType(
    orderType: OrderType,
    options?: Omit<OrderQueryFilters, 'orderType'>
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findAll({ ...options, orderType });
  }

  /**
   * 판매자 ID로 주문 조회
   *
   * @param sellerId - 판매자 ID
   * @param options - 추가 필터 옵션
   * @returns 주문 목록
   */
  async findBySellerId(
    sellerId: string,
    options?: Omit<OrderQueryFilters, 'sellerId'>
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findAll({ ...options, sellerId });
  }

  /**
   * 구매자 ID로 주문 조회
   *
   * @param buyerId - 구매자 ID
   * @param options - 추가 필터 옵션
   * @returns 주문 목록
   */
  async findByBuyerId(
    buyerId: string,
    options?: Omit<OrderQueryFilters, 'buyerId'>
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    return this.findAll({ ...options, buyerId });
  }

  /**
   * 복합 필터 조회
   *
   * @param filters - 조회 필터
   * @returns 주문 목록 및 총 개수
   */
  async findAll(
    filters: OrderQueryFilters = {}
  ): Promise<{ orders: EcommerceOrder[]; total: number }> {
    const query = this.orderRepository.createQueryBuilder('order');

    // 필터 적용
    if (filters.orderType) {
      query.andWhere('order.orderType = :orderType', {
        orderType: filters.orderType,
      });
    }

    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.paymentStatus) {
      query.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: filters.paymentStatus,
      });
    }

    if (filters.sellerId) {
      query.andWhere('order.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    if (filters.buyerId) {
      query.andWhere('order.buyerId = :buyerId', { buyerId: filters.buyerId });
    }

    if (filters.startDate) {
      query.andWhere('order.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('order.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // 총 개수
    const total = await query.getCount();

    // 정렬 및 페이지네이션
    query.orderBy('order.createdAt', 'DESC');

    if (filters.limit) {
      query.take(filters.limit);
    }

    if (filters.offset) {
      query.skip(filters.offset);
    }

    const orders = await query.getMany();

    return { orders, total };
  }

  // ===== 집계 메서드 =====

  /**
   * 일별 주문 요약
   *
   * 지정된 기간의 일별 주문 통계를 반환합니다.
   *
   * @param startDate - 시작일
   * @param endDate - 종료일
   * @param orderType - (선택) 특정 OrderType만 집계
   * @returns 일별 주문 요약 배열
   *
   * @note
   * - totalAmount: 모든 주문의 금액 합계
   * - paidAmount: 결제 완료된 주문의 금액 합계
   * - 정산 금액이 아닌 "판매 금액"입니다.
   */
  async getDailyOrderSummary(
    startDate: Date,
    endDate: Date,
    orderType?: OrderType
  ): Promise<DailyOrderSummary[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect(
        `SUM(CASE WHEN order.paymentStatus = '${PaymentStatus.PAID}' THEN 1 ELSE 0 END)`,
        'paidCount'
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.paymentStatus = '${PaymentStatus.PAID}' THEN order.totalAmount ELSE 0 END), 0)`,
        'paidAmount'
      )
      .addSelect(
        `SUM(CASE WHEN order.status = '${OrderStatus.CANCELLED}' THEN 1 ELSE 0 END)`,
        'cancelledCount'
      )
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (orderType) {
      query.andWhere('order.orderType = :orderType', { orderType });
    }

    query
      .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.createdAt, 'YYYY-MM-DD')", 'ASC');

    const results = await query.getRawMany();

    return results.map((row) => ({
      date: row.date,
      orderCount: parseInt(row.orderCount, 10),
      totalAmount: parseFloat(row.totalAmount),
      paidCount: parseInt(row.paidCount, 10),
      paidAmount: parseFloat(row.paidAmount),
      cancelledCount: parseInt(row.cancelledCount, 10),
    }));
  }

  /**
   * OrderType별 통계
   *
   * 전체 또는 지정 기간의 OrderType별 주문 통계를 반환합니다.
   *
   * @param startDate - (선택) 시작일
   * @param endDate - (선택) 종료일
   * @returns OrderType별 통계 배열
   */
  async getStatsByOrderType(
    startDate?: Date,
    endDate?: Date
  ): Promise<OrderTypeStats[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('order.orderType', 'orderType')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect('COALESCE(AVG(order.totalAmount), 0)', 'averageAmount');

    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    query.groupBy('order.orderType').orderBy('orderCount', 'DESC');

    const results = await query.getRawMany();

    return results.map((row) => ({
      orderType: row.orderType as OrderType,
      orderCount: parseInt(row.orderCount, 10),
      totalAmount: parseFloat(row.totalAmount),
      averageAmount: parseFloat(row.averageAmount),
    }));
  }

  /**
   * 판매자별 통계
   *
   * @param orderType - (선택) 특정 OrderType만 집계
   * @param startDate - (선택) 시작일
   * @param endDate - (선택) 종료일
   * @param limit - (선택) 반환할 최대 개수 (기본: 10)
   * @returns 판매자별 통계 배열 (판매액 내림차순)
   */
  async getStatsBySeller(
    orderType?: OrderType,
    startDate?: Date,
    endDate?: Date,
    limit: number = 10
  ): Promise<SellerStats[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('order.sellerId', 'sellerId')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalAmount')
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.paymentStatus = '${PaymentStatus.PAID}' THEN order.totalAmount ELSE 0 END), 0)`,
        'paidAmount'
      );

    if (orderType) {
      query.andWhere('order.orderType = :orderType', { orderType });
    }

    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    query
      .groupBy('order.sellerId')
      .orderBy('totalAmount', 'DESC')
      .limit(limit);

    const results = await query.getRawMany();

    return results.map((row) => ({
      sellerId: row.sellerId,
      orderCount: parseInt(row.orderCount, 10),
      totalAmount: parseFloat(row.totalAmount),
      paidAmount: parseFloat(row.paidAmount),
    }));
  }

  // ===== 유틸리티 메서드 =====

  /**
   * 특정 기간의 총 주문 수 조회
   */
  async countOrders(filters: OrderQueryFilters = {}): Promise<number> {
    const { total } = await this.findAll({ ...filters, limit: 0 });
    return total;
  }

  /**
   * 특정 기간의 총 매출액 조회
   *
   * @note 결제 완료된 주문만 합산합니다.
   */
  async getTotalPaidAmount(
    startDate?: Date,
    endDate?: Date,
    orderType?: OrderType
  ): Promise<number> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      });

    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }

    if (orderType) {
      query.andWhere('order.orderType = :orderType', { orderType });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || '0');
  }
}
