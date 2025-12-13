/**
 * OrderOpsService
 *
 * 주문/배송 조회 서비스
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrderRelay,
  SellerListing,
  OrderRelayStatus,
  ProductType,
} from '@o4o/dropshipping-core';
import type { OrderListItemDto, OrderDetailDto } from '../dto/index.js';

/**
 * SellerOps에서 차단해야 하는 productType 목록
 * PHARMACEUTICAL 등 일반 판매 불가 상품 제외
 */
const BLOCKED_PRODUCT_TYPES: ProductType[] = [
  ProductType.PHARMACEUTICAL,
];

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
   *
   * PHARMACEUTICAL 등 차단된 productType은 자동 제외됩니다.
   */
  async getOrders(
    sellerId: string,
    filters?: {
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      productType?: ProductType;
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

    if (filters?.dateFrom) {
      query.andWhere('relay.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters?.dateTo) {
      query.andWhere('relay.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    // productType 필터
    if (filters?.productType) {
      query.andWhere('product.productType = :productType', {
        productType: filters.productType,
      });
    }

    query.orderBy('relay.createdAt', 'DESC');

    const orders = await query.getMany();

    // PHARMACEUTICAL 등 차단된 productType 제외
    const filteredOrders = orders.filter(order => {
      const productType = order.listing?.offer?.productMaster?.productType as ProductType;
      return !productType || !BLOCKED_PRODUCT_TYPES.includes(productType);
    });

    return filteredOrders.map((order) => ({
      id: order.id,
      listingId: order.listingId,
      productName: order.listing?.offer?.productMaster?.name || 'Unknown',
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      relayStatus: order.status, // status와 동일하게 매핑
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
    const supplierPrice = offer?.supplierPrice || 0;
    const sellingPrice = order.listing?.sellingPrice || 0;
    const margin = sellingPrice - supplierPrice;
    const marginRate = supplierPrice > 0 ? (margin / supplierPrice) * 100 : 0;

    // shippingInfo에서 배송 정보 추출
    const shippingInfo = order.shippingInfo || {};

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
          supplierPrice,
          stockQuantity: offer?.stockQuantity || 0,
        },
        sellingPrice,
        margin,
        marginRate: Math.round(marginRate * 100) / 100,
        channel: order.listing?.channel || 'custom',
        status: order.listing?.status || 'draft',
        createdAt: order.listing?.createdAt || new Date(),
      },
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      relay: {
        id: order.id,
        status: order.status,
        supplierOrderId: shippingInfo.supplierOrderId,
        trackingNumber: shippingInfo.trackingNumber,
        shippingCarrier: shippingInfo.shippingCarrier,
        dispatchedAt: order.shippedAt,
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
