/**
 * DashboardService
 *
 * 판매자 대시보드 데이터 집계
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Seller,
  SellerListing,
  OrderRelay,
  SettlementBatch,
} from '@o4o/dropshipping-core';
import type { DashboardSummaryDto, AlertDto } from '../dto/index.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Seller)
    private readonly sellerRepository: Repository<Seller>,
    @InjectRepository(SellerListing)
    private readonly listingRepository: Repository<SellerListing>,
    @InjectRepository(OrderRelay)
    private readonly orderRelayRepository: Repository<OrderRelay>,
    @InjectRepository(SettlementBatch)
    private readonly settlementRepository: Repository<SettlementBatch>
  ) {}

  /**
   * 대시보드 요약 데이터 조회
   */
  async getDashboardSummary(sellerId: string): Promise<DashboardSummaryDto> {
    // 총 판매액 계산
    const salesResult = await this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoin('relay.listing', 'listing')
      .where('listing.sellerId = :sellerId', { sellerId })
      .andWhere('relay.status IN (:...statuses)', {
        statuses: ['delivered', 'completed'],
      })
      .select('SUM(relay.totalPrice)', 'total')
      .getRawOne();

    const totalSales = parseFloat(salesResult?.total || '0');

    // 정산 예정 금액
    const pendingResult = await this.settlementRepository
      .createQueryBuilder('batch')
      .where('batch.sellerId = :sellerId', { sellerId })
      .andWhere('batch.status = :status', { status: 'closed' })
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    const pendingSettlement = parseFloat(pendingResult?.total || '0');

    // 활성 리스팅 수
    const activeListings = await this.listingRepository.count({
      where: { sellerId, isActive: true },
    });

    // 대기 중인 주문 수
    const pendingOrders = await this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoin('relay.listing', 'listing')
      .where('listing.sellerId = :sellerId', { sellerId })
      .andWhere('relay.status IN (:...statuses)', {
        statuses: ['pending', 'dispatched'],
      })
      .getCount();

    // 승인된 공급자 수 (SellerOps에서는 직접 조회)
    const approvedSuppliers = await this.dataSource.query(`
      SELECT COUNT(DISTINCT s.id) as count
      FROM dropshipping_suppliers s
      WHERE s.status = 'active'
    `);

    // 최근 알림
    const recentAlerts = await this.getRecentAlerts(sellerId);

    return {
      totalSales,
      pendingSettlement,
      activeListings,
      pendingOrders,
      approvedSuppliers: parseInt(approvedSuppliers[0]?.count || '0'),
      recentAlerts,
    };
  }

  /**
   * 최근 알림 조회
   */
  private async getRecentAlerts(sellerId: string): Promise<AlertDto[]> {
    const notifications = await this.dataSource.query(`
      SELECT id, type, title, message, created_at as "createdAt"
      FROM sellerops_notifications
      WHERE seller_id = $1 AND read = false
      ORDER BY created_at DESC
      LIMIT 5
    `, [sellerId]);

    return notifications.map((n: any) => ({
      id: n.id,
      type: n.type || 'info',
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
    }));
  }
}
