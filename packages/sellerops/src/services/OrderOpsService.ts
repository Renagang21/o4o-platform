/**
 * OrderOpsService
 *
 * 주문/배송 조회 서비스
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderRelay, SellerListing } from '@o4o/dropshipping-core';
import type { OrderListItemDto, OrderDetailDto } from '../dto/index.js';

@Injectable()
export class OrderOpsService {
  constructor(
    @InjectRepository(OrderRelay)
    private readonly orderRelayRepository: Repository<OrderRelay>,
    @InjectRepository(SellerListing)
    private readonly listingRepository: Repository<SellerListing>
  ) {}

  /**
   * 주문 목록 조회
   */
  async getOrders(
    sellerId: string,
    filters?: {
      status?: string;
      relayStatus?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<OrderListItemDto[]> {
    const query = this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoinAndSelect('relay.listing', 'listing')
      .innerJoinAndSelect('listing.offer', 'offer')
      .innerJoinAndSelect('offer.productMaster', 'product')
      .where('listing.sellerId = :sellerId', { sellerId });

    if (filters?.status) {
      query.andWhere('relay.status = :status', { status: filters.status });
    }

    if (filters?.relayStatus) {
      query.andWhere('relay.relayStatus = :relayStatus', {
        relayStatus: filters.relayStatus,
      });
    }

    if (filters?.dateFrom) {
      query.andWhere('relay.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters?.dateTo) {
      query.andWhere('relay.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    query.orderBy('relay.createdAt', 'DESC');

    const orders = await query.getMany();

    return orders.map((order) => ({
      id: order.id,
      listingId: order.listingId,
      productName: order.listing?.offer?.productMaster?.name || 'Unknown',
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      relayStatus: order.relayStatus || 'pending',
      createdAt: order.createdAt,
    }));
  }

  /**
   * 주문 상세 조회
   */
  async getOrderById(
    orderId: string,
    sellerId: string
  ): Promise<OrderDetailDto | null> {
    const order = await this.orderRelayRepository.findOne({
      where: { id: orderId },
      relations: ['listing', 'listing.offer', 'listing.offer.productMaster'],
    });

    if (!order || order.listing?.sellerId !== sellerId) {
      return null;
    }

    const offer = order.listing?.offer;
    const productMaster = offer?.productMaster;

    return {
      id: order.id,
      listing: {
        id: order.listing?.id || '',
        offer: {
          id: offer?.id || '',
          productMaster: {
            id: productMaster?.id || '',
            name: productMaster?.name || '',
            sku: productMaster?.sku || '',
          },
          supplyPrice: offer?.supplyPrice || 0,
          stock: offer?.stock || 0,
        },
        sellingPrice: order.listing?.sellingPrice || 0,
        margin: (order.listing?.sellingPrice || 0) - (offer?.supplyPrice || 0),
        marginRate: 0,
        channel: order.listing?.channel || '',
        isActive: order.listing?.isActive || false,
        createdAt: order.listing?.createdAt || new Date(),
      },
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      relay: {
        id: order.id,
        status: order.relayStatus || 'pending',
        supplierOrderId: order.supplierOrderId,
        trackingNumber: order.trackingNumber,
        shippingCarrier: order.shippingCarrier,
        dispatchedAt: order.dispatchedAt,
        deliveredAt: order.deliveredAt,
      },
      createdAt: order.createdAt,
    };
  }

  /**
   * 주문 상태별 카운트
   */
  async getOrderCounts(sellerId: string): Promise<Record<string, number>> {
    const results = await this.orderRelayRepository
      .createQueryBuilder('relay')
      .innerJoin('relay.listing', 'listing')
      .where('listing.sellerId = :sellerId', { sellerId })
      .select('relay.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('relay.status')
      .getRawMany();

    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.status] = parseInt(r.count);
    }

    return counts;
  }
}
