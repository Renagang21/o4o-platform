import { AppDataSource } from '../database/connection';
import { analyticsCacheService } from './analytics-cache.service';
import logger from '../utils/logger';

/**
 * 결제 시스템과 기존 시스템들의 통합을 관리하는 서비스
 */
export class PaymentSystemIntegrationService {

  /**
   * 결제 완료 시 재고 차감 처리
   */
  async processInventoryForPayment(paymentKey: string, paymentData: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const orderRepository = AppDataSource.getRepository('Order');
      
      // 결제 정보 조회
      const payment = await paymentRepository.findOne({ where: { paymentKey } });
      if (!payment) {
        logger.warn('Payment not found for inventory processing', { paymentKey });
        return;
      }

      // 주문 정보 조회
      const order = await orderRepository.findOne({ 
        where: { id: payment.orderId },
        relations: ['items', 'items.product']
      });

      if (!order || !order.items) {
        logger.warn('Order or order items not found', { orderId: payment.orderId });
        return;
      }

      // 재고 서비스 연동 - 결제 완료 시 재고는 이미 차감되었으므로 로그만 기록
      const { inventoryService } = await import('./inventoryService');
      
      // 재고 이동 내역 기록
      for (const item of order.items) {
        await inventoryService.recordInventoryMovement(
          item.productId,
          -item.quantity,
          'sale',
          paymentKey,
          `Payment completed: ${paymentKey}`
        );

        logger.info('Inventory movement recorded for payment', {
          paymentKey,
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      // 재고 관련 캐시 무효화
      await analyticsCacheService.invalidateForDataChange('inventory');
      
    } catch (error) {
      logger.error('Error processing inventory for payment:', error);
      throw error;
    }
  }

  /**
   * 결제 취소 시 재고 복구 처리
   */
  async restoreInventoryForCancel(paymentKey: string, cancelAmount: number): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const orderRepository = AppDataSource.getRepository('Order');
      
      const payment = await paymentRepository.findOne({ where: { paymentKey } });
      if (!payment) {
        logger.warn('Payment not found for inventory restoration', { paymentKey });
        return;
      }

      const order = await orderRepository.findOne({ 
        where: { id: payment.orderId },
        relations: ['items', 'items.product']
      });

      if (!order || !order.items) {
        logger.warn('Order or order items not found for restoration', { orderId: payment.orderId });
        return;
      }

      // 부분 취소 비율 계산
      const cancelRatio = cancelAmount / payment.amount;

      const { inventoryService } = await import('./inventoryService');

      const itemsToRestore = [];
      for (const item of order.items) {
        const restoreQuantity = Math.floor(item.quantity * cancelRatio);
        
        if (restoreQuantity > 0) {
          itemsToRestore.push({
            productId: item.productId,
            quantity: restoreQuantity
          });

          // 재고 이동 내역 기록
          await inventoryService.recordInventoryMovement(
            item.productId,
            restoreQuantity,
            'return',
            paymentKey,
            `Payment cancelled: ${paymentKey}`
          );

          logger.info('Inventory restored for cancel', {
            paymentKey,
            productId: item.productId,
            restoreQuantity,
          });
        }
      }

      // 실제 재고 복구
      if (itemsToRestore.length > 0) {
        await inventoryService.restoreInventory(itemsToRestore);
      }

      await analyticsCacheService.invalidateForDataChange('inventory');
      
    } catch (error) {
      logger.error('Error restoring inventory for cancel:', error);
      throw error;
    }
  }

  /**
   * 결제 완료 시 수수료 생성
   */
  async processCommissionForPayment(paymentKey: string, paymentData: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const orderRepository = AppDataSource.getRepository('Order');
      
      const payment = await paymentRepository.findOne({ where: { paymentKey } });
      if (!payment) {
        logger.warn('Payment not found for commission processing', { paymentKey });
        return;
      }

      const order = await orderRepository.findOne({ 
        where: { id: payment.orderId },
        relations: ['vendor']
      });

      if (!order || !order.vendor) {
        logger.warn('Order or vendor not found', { orderId: payment.orderId });
        return;
      }

      // 수수료 서비스 연동 - 실시간 커미션 생성
      const paymentCommissionRepository = AppDataSource.getRepository('PaymentCommission');
      
      const commission = paymentCommissionRepository.create({
        paymentKey,
        orderId: payment.orderId,
        vendorId: order.vendorId,
        amount: payment.amount,
        commissionRate: order.vendor.affiliateRate || 12.0,
        commissionAmount: (payment.amount * (order.vendor.affiliateRate || 12.0)) / 100,
        paymentMethod: payment.method,
        status: 'pending',
        createdAt: new Date(),
      });

      await paymentCommissionRepository.save(commission);

      logger.info('Commission created for payment', {
        paymentKey,
        vendorId: order.vendorId,
        amount: payment.amount,
      });

      await analyticsCacheService.invalidateForDataChange('commission');
      
    } catch (error) {
      logger.error('Error processing commission for payment:', error);
      throw error;
    }
  }

  /**
   * 결제 취소 시 수수료 조정
   */
  async adjustCommissionForCancel(paymentKey: string, cancelAmount: number): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentCommissionRepository = AppDataSource.getRepository('PaymentCommission');
      
      const commission = await paymentCommissionRepository.findOne({
        where: { paymentKey }
      });

      if (commission) {
        const adjustmentRatio = cancelAmount / commission.amount;
        const adjustmentAmount = commission.commissionAmount * adjustmentRatio;
        
        commission.adjustmentAmount = (commission.adjustmentAmount || 0) + adjustmentAmount;
        commission.adjustmentReason = 'payment_cancelled';
        commission.adjustedAt = new Date();
        commission.status = cancelAmount >= commission.amount ? 'cancelled' : 'adjusted';
        
        await paymentCommissionRepository.save(commission);
      }

      logger.info('Commission adjusted for cancel', {
        paymentKey,
        cancelAmount,
      });

      await analyticsCacheService.invalidateForDataChange('commission');
      
    } catch (error) {
      logger.error('Error adjusting commission for cancel:', error);
      throw error;
    }
  }

  /**
   * 에스크로 확정 시 판매자 정산 처리
   */
  async processVendorSettlement(paymentKey: string, confirmData: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const orderRepository = AppDataSource.getRepository('Order');
      
      const payment = await paymentRepository.findOne({ where: { paymentKey } });
      if (!payment) {
        logger.warn('Payment not found for settlement processing', { paymentKey });
        return;
      }

      const order = await orderRepository.findOne({ 
        where: { id: payment.orderId },
        relations: ['vendor']
      });

      if (!order || !order.vendor) {
        logger.warn('Order or vendor not found for settlement', { orderId: payment.orderId });
        return;
      }

      // 에스크로 확정으로 인한 정산 처리
      const escrowSettlementRepository = AppDataSource.getRepository('EscrowSettlement');
      
      const settlement = escrowSettlementRepository.create({
        paymentKey,
        vendorId: order.vendorId,
        amount: confirmData.totalAmount,
        settlementType: 'escrow_confirmed',
        status: 'confirmed',
        confirmedAt: new Date(),
        settlementDate: new Date(),
      });

      await escrowSettlementRepository.save(settlement);

      logger.info('Vendor settlement processed for escrow', {
        paymentKey,
        vendorId: order.vendorId,
        amount: confirmData.totalAmount,
      });

      await analyticsCacheService.invalidateForDataChange('commission');
      
    } catch (error) {
      logger.error('Error processing vendor settlement:', error);
      throw error;
    }
  }

  /**
   * 결제 데이터를 분석 시스템에 반영
   */
  async updateAnalyticsForPayment(paymentKey: string, paymentData: any, eventType: string): Promise<void> {
    try {
      // 결제 관련 캐시 무효화
      await analyticsCacheService.invalidateForDataChange('order', paymentData.orderId);
      
      // 실시간 분석 데이터 업데이트
      const { PaymentAnalyticsService } = await import('./payment-analytics.service');
      const paymentAnalyticsService = new PaymentAnalyticsService();

      // 실시간 통계 업데이트를 위한 캐시 무효화
      await analyticsCacheService.invalidateByTags(['payment_analytics', 'real_time_stats']);

      logger.info('Analytics updated for payment event', {
        paymentKey,
        eventType,
        orderId: paymentData.orderId,
      });
      
    } catch (error) {
      logger.error('Error updating analytics for payment:', error);
      // 분석 업데이트 실패는 전체 프로세스를 중단하지 않음
    }
  }

  /**
   * 구독 결제 성공 시 통합 처리
   */
  async processSubscriptionPaymentSuccess(subscriptionId: string, paymentData: any): Promise<void> {
    try {
      logger.info('Processing subscription payment success integration', {
        subscriptionId,
        paymentKey: paymentData.paymentKey,
        amount: paymentData.amount,
      });

      // 구독 관련 분석 데이터 업데이트
      await analyticsCacheService.invalidateByTags(['subscription_analytics', 'payment_analytics']);

      // 구독 서비스 알림 (선택적)
      // await this.notifySubscriptionSuccess(subscriptionId, paymentData);

      logger.info('Subscription payment success integration completed', {
        subscriptionId,
        paymentKey: paymentData.paymentKey,
      });
      
    } catch (error) {
      logger.error('Error processing subscription payment success integration:', error);
      throw error;
    }
  }

  /**
   * 구독 결제 실패 시 통합 처리
   */
  async processSubscriptionPaymentFailure(subscriptionId: string, failureData: any): Promise<void> {
    try {
      logger.info('Processing subscription payment failure integration', {
        subscriptionId,
        failureReason: failureData.failureReason,
      });

      // 구독 분석 데이터 업데이트
      await analyticsCacheService.invalidateByTags(['subscription_analytics']);

      // 고객 알림 처리 (선택적)
      // await this.notifySubscriptionFailure(subscriptionId, failureData);

      logger.info('Subscription payment failure integration completed', {
        subscriptionId,
      });
      
    } catch (error) {
      logger.error('Error processing subscription payment failure integration:', error);
      throw error;
    }
  }

  /**
   * 정산 데이터 동기화
   */
  async syncSettlementData(date: string): Promise<void> {
    try {
      logger.info('Starting settlement data synchronization', { date });

      const { TossPaymentsAdvancedService } = await import('./toss-payments-advanced.service');
      const tossPaymentsService = new TossPaymentsAdvancedService();

      // Toss에서 정산 데이터 조회
      const settlementData = await tossPaymentsService.getSettlements(date);

      const { AppDataSource } = await import('../database/connection');
      const settlementRecordRepository = AppDataSource.getRepository('SettlementRecord');

      // 정산 데이터 저장 또는 업데이트
      for (const settlement of settlementData.settlements) {
        const existingRecord = await settlementRecordRepository.findOne({
          where: { paymentKey: settlement.paymentKey, date }
        });

        if (existingRecord) {
          // 업데이트
          await settlementRecordRepository.update(existingRecord.id, {
            amount: settlement.amount,
            fee: settlement.fee,
            netAmount: settlement.netAmount,
            settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
            status: settlementData.settlementStatus,
            updatedAt: new Date(),
          });
        } else {
          // 새로 생성
          const newRecord = settlementRecordRepository.create({
            paymentKey: settlement.paymentKey,
            orderId: settlement.orderId,
            amount: settlement.amount,
            fee: settlement.fee,
            netAmount: settlement.netAmount,
            settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
            status: settlementData.settlementStatus,
            date,
          });
          await settlementRecordRepository.save(newRecord);
        }
      }

      // 정산 관련 캐시 무효화
      await analyticsCacheService.invalidateByTags(['settlement', 'payment_analytics']);

      logger.info('Settlement data synchronization completed', {
        date,
        totalSettlements: settlementData.settlements.length,
        totalAmount: settlementData.totalAmount,
      });
      
    } catch (error) {
      logger.error('Error synchronizing settlement data:', error);
      throw error;
    }
  }

  /**
   * 결제 이벤트 통합 처리 메인 함수
   */
  async handlePaymentEvent(eventType: string, paymentKey: string, data: any): Promise<void> {
    try {
      logger.info('Handling payment event integration', {
        eventType,
        paymentKey,
      });

      switch (eventType) {
        case 'PAYMENT_COMPLETED':
          await Promise.all([
            this.processInventoryForPayment(paymentKey, data),
            this.processCommissionForPayment(paymentKey, data),
            this.updateAnalyticsForPayment(paymentKey, data, eventType),
          ]);
          break;

        case 'PAYMENT_CANCELLED':
          await Promise.all([
            this.restoreInventoryForCancel(paymentKey, data.cancelAmount || data.totalAmount),
            this.adjustCommissionForCancel(paymentKey, data.cancelAmount || data.totalAmount),
            this.updateAnalyticsForPayment(paymentKey, data, eventType),
          ]);
          break;

        case 'ESCROW_CONFIRMED':
          await Promise.all([
            this.processVendorSettlement(paymentKey, data),
            this.updateAnalyticsForPayment(paymentKey, data, eventType),
          ]);
          break;

        case 'SUBSCRIPTION_RENEWED':
          await this.processSubscriptionPaymentSuccess(data.subscriptionId, data);
          break;

        case 'SUBSCRIPTION_FAILED':
          await this.processSubscriptionPaymentFailure(data.subscriptionId, data);
          break;

        default:
          logger.warn(`Unknown payment event type for integration: ${eventType}`);
      }

      logger.info('Payment event integration completed', {
        eventType,
        paymentKey,
      });
      
    } catch (error) {
      logger.error('Error handling payment event integration:', error);
      throw error;
    }
  }

  /**
   * 시스템 상태 검증 (헬스체크용)
   */
  async validateSystemIntegration(): Promise<{
    inventory: boolean;
    commission: boolean;
    analytics: boolean;
    database: boolean;
    cache: boolean;
  }> {
    const status = {
      inventory: false,
      commission: false,
      analytics: false,
      database: false,
      cache: false,
    };

    try {
      // 데이터베이스 연결 확인
      const { AppDataSource } = await import('../database/connection');
      await AppDataSource.query('SELECT 1');
      status.database = true;

      // 캐시 서비스 확인
      await analyticsCacheService.set('health_check', 'ok', { ttl: 60 });
      const cacheResult = await analyticsCacheService.get('health_check');
      status.cache = cacheResult === 'ok';

      // 재고 서비스 확인
      try {
        const { InventoryService } = await import('./inventoryService');
        status.inventory = true;
      } catch (error) {
        logger.warn('Inventory service not available:', error.message);
      }

      // 수수료 서비스 확인
      try {
        const { CommissionService } = await import('./commission.service');
        status.commission = true;
      } catch (error) {
        logger.warn('Commission service not available:', error.message);
      }

      // 분석 서비스 확인
      try {
        const { PaymentAnalyticsService } = await import('./payment-analytics.service');
        status.analytics = true;
      } catch (error) {
        logger.warn('Analytics service not available:', error.message);
      }

    } catch (error) {
      logger.error('Error validating system integration:', error);
    }

    return status;
  }
}

// Export singleton instance
export const paymentSystemIntegration = new PaymentSystemIntegrationService();