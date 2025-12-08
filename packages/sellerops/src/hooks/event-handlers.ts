/**
 * SellerOps Event Handlers
 *
 * dropshipping-core 이벤트 구독 핸들러
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

@Injectable()
export class SellerOpsEventHandlers {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 상품 마스터 업데이트 시
   */
  @OnEvent('product.master.updated')
  async handleProductMasterUpdated(data: {
    productMasterId: string;
    changes: Record<string, any>;
  }): Promise<void> {
    console.log('[sellerops] Product master updated:', data.productMasterId);
    // 해당 상품을 판매 중인 판매자들에게 알림 전송
    // 구현: 관련 리스팅 조회 → 판매자별 알림 생성
  }

  /**
   * Offer 업데이트 시 (가격/재고 변경)
   */
  @OnEvent('product.offer.updated')
  async handleOfferUpdated(data: {
    offerId: string;
    changes: { supplyPrice?: number; stock?: number };
  }): Promise<void> {
    console.log('[sellerops] Offer updated:', data.offerId);

    // 재고 부족 시 판매자에게 알림
    if (data.changes.stock !== undefined && data.changes.stock < 10) {
      // 해당 Offer를 사용하는 리스팅의 판매자 조회
      const sellers = await this.dataSource.query(`
        SELECT DISTINCT l.seller_id
        FROM dropshipping_seller_listings l
        WHERE l.offer_id = $1
      `, [data.offerId]);

      for (const seller of sellers) {
        await this.createNotification(seller.seller_id, {
          type: 'warning',
          title: '재고 부족 알림',
          message: `판매 중인 상품의 재고가 부족합니다. (남은 재고: ${data.changes.stock})`,
          data: { offerId: data.offerId, stock: data.changes.stock },
        });
      }
    }
  }

  /**
   * 주문 생성 시
   */
  @OnEvent('order.created')
  async handleOrderCreated(data: {
    orderId: string;
    listingId: string;
    quantity: number;
  }): Promise<void> {
    console.log('[sellerops] Order created:', data.orderId);

    // 리스팅의 판매자 조회 및 알림 생성
    const listing = await this.dataSource.query(`
      SELECT seller_id FROM dropshipping_seller_listings WHERE id = $1
    `, [data.listingId]);

    if (listing.length > 0) {
      await this.createNotification(listing[0].seller_id, {
        type: 'info',
        title: '새 주문 접수',
        message: `새로운 주문이 접수되었습니다. (수량: ${data.quantity})`,
        data: { orderId: data.orderId },
      });
    }
  }

  /**
   * 주문 Relay 완료 시
   */
  @OnEvent('order.relay.fulfilled')
  async handleRelayFulfilled(data: {
    orderId: string;
    trackingNumber?: string;
    shippingCarrier?: string;
  }): Promise<void> {
    console.log('[sellerops] Order relay fulfilled:', data.orderId);

    // 판매자에게 배송 시작 알림
    const order = await this.dataSource.query(`
      SELECT l.seller_id
      FROM dropshipping_order_relays r
      JOIN dropshipping_seller_listings l ON r.listing_id = l.id
      WHERE r.id = $1
    `, [data.orderId]);

    if (order.length > 0) {
      await this.createNotification(order[0].seller_id, {
        type: 'success',
        title: '배송 시작',
        message: `주문 상품이 발송되었습니다. ${data.trackingNumber ? `(송장번호: ${data.trackingNumber})` : ''}`,
        data: { orderId: data.orderId, trackingNumber: data.trackingNumber },
      });
    }
  }

  /**
   * 정산 마감 시
   */
  @OnEvent('settlement.closed')
  async handleSettlementClosed(data: {
    batchId: string;
    sellerId: string;
    netAmount: number;
  }): Promise<void> {
    console.log('[sellerops] Settlement closed:', data.batchId);

    await this.createNotification(data.sellerId, {
      type: 'info',
      title: '정산 마감',
      message: `정산이 마감되었습니다. 정산 예정 금액: ${data.netAmount.toLocaleString()}원`,
      data: { batchId: data.batchId, netAmount: data.netAmount },
    });
  }

  /**
   * 수수료 적용 시
   */
  @OnEvent('commission.applied')
  async handleCommissionApplied(data: {
    transactionId: string;
    orderId: string;
    commissionAmount: number;
  }): Promise<void> {
    console.log('[sellerops] Commission applied:', data.transactionId);
    // 필요 시 추가 로직 구현
  }

  /**
   * 알림 생성 헬퍼
   */
  private async createNotification(
    sellerId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await this.dataSource.query(`
        INSERT INTO sellerops_notifications (seller_id, type, title, message, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        sellerId,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
      ]);
    } catch (error) {
      console.error('[sellerops] Failed to create notification:', error);
    }
  }
}
