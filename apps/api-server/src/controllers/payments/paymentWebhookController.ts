import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { TossPaymentsAdvancedService } from '../../services/toss-payments-advanced.service';
import { asyncHandler, createForbiddenError, createValidationError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';
import crypto from 'crypto';

export class PaymentWebhookController {
  private tossPaymentsService: TossPaymentsAdvancedService;

  constructor() {
    this.tossPaymentsService = new TossPaymentsAdvancedService();
  }

  // POST /api/webhooks/toss/payment - Toss 결제 웹훅
  handleTossPaymentWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
    const signature = req.headers['x-toss-signature'] as string;
    const body = JSON.stringify(req.body);

    // 웹훅 서명 검증
    if (!this.tossPaymentsService.validateWebhookSignature(body, signature)) {
      logger.warn('Invalid webhook signature', {
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw createForbiddenError('Invalid webhook signature');
    }

    try {
      const { eventType, data, createdAt } = req.body;

      // 웹훅 이벤트 로깅
      await this.logWebhookEvent({
        type: 'toss_payment',
        eventType,
        data,
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        receivedAt: new Date(),
        originalTimestamp: createdAt,
      });

      // 이벤트 처리
      await this.tossPaymentsService.processWebhookEvent(eventType, data);

      logger.info('Toss payment webhook processed successfully', {
        eventType,
        paymentKey: data.paymentKey,
        orderId: data.orderId,
      });

      // 200 OK 응답 (웹훅 성공)
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error processing Toss payment webhook:', {
        error: error.message,
        body: req.body,
        signature,
      });

      // 웹훅 실패 로깅
      await this.logWebhookEvent({
        type: 'toss_payment',
        eventType: req.body.eventType,
        data: req.body.data,
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        receivedAt: new Date(),
        error: error.message,
        status: 'failed',
      });

      // 500 에러 (웹훅 실패 - Toss가 재시도함)
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
      });
    }
  });

  // POST /api/webhooks/toss/subscription - 정기결제 웹훅
  handleTossSubscriptionWebhook = asyncHandler(async (req: AuthRequest, res: Response) => {
    const signature = req.headers['x-toss-signature'] as string;
    const body = JSON.stringify(req.body);

    // 웹훅 서명 검증
    if (!this.tossPaymentsService.validateWebhookSignature(body, signature)) {
      logger.warn('Invalid subscription webhook signature', {
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw createForbiddenError('Invalid webhook signature');
    }

    try {
      const { eventType, data, createdAt } = req.body;

      // 웹훅 이벤트 로깅
      await this.logWebhookEvent({
        type: 'toss_subscription',
        eventType,
        data,
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        receivedAt: new Date(),
        originalTimestamp: createdAt,
      });

      // 구독 관련 이벤트 처리
      switch (eventType) {
        case 'BILLING_KEY_CREATED':
          await this.handleBillingKeyCreated(data);
          break;
        case 'BILLING_KEY_DELETED':
          await this.handleBillingKeyDeleted(data);
          break;
        case 'SUBSCRIPTION_PAYMENT_SUCCESS':
          await this.handleSubscriptionPaymentSuccess(data);
          break;
        case 'SUBSCRIPTION_PAYMENT_FAILED':
          await this.handleSubscriptionPaymentFailed(data);
          break;
        case 'SUBSCRIPTION_CANCELLED':
          await this.handleSubscriptionCancelled(data);
          break;
        default:
          logger.warn(`Unknown subscription webhook event: ${eventType}`);
      }

      logger.info('Toss subscription webhook processed successfully', {
        eventType,
        billingKey: data.billingKey,
        customerKey: data.customerKey,
      });

      res.status(200).json({
        success: true,
        message: 'Subscription webhook processed successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Error processing Toss subscription webhook:', {
        error: error.message,
        body: req.body,
        signature,
      });

      await this.logWebhookEvent({
        type: 'toss_subscription',
        eventType: req.body.eventType,
        data: req.body.data,
        signature,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        receivedAt: new Date(),
        error: error.message,
        status: 'failed',
      });

      res.status(500).json({
        success: false,
        error: 'Subscription webhook processing failed',
        message: error.message,
      });
    }
  });

  // GET /api/webhooks/payment-events - 결제 이벤트 조회
  getPaymentEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      page = '1',
      limit = '50',
      eventType,
      status,
      startDate,
      endDate,
      paymentKey,
    } = req.query;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for webhook events');
    }

    // Validate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw createValidationError('Invalid pagination parameters');
    }

    try {
      const { AppDataSource } = await import('../../database/connection');
      const webhookEventRepository = AppDataSource.getRepository('WebhookEvent');
      
      let query = webhookEventRepository.createQueryBuilder('event')
        .orderBy('event.receivedAt', 'DESC');

      // 필터 적용
      if (eventType) {
        query = query.andWhere('event.eventType = :eventType', { eventType });
      }

      if (status) {
        query = query.andWhere('event.status = :status', { status });
      }

      if (startDate) {
        query = query.andWhere('event.receivedAt >= :startDate', { 
          startDate: new Date(startDate as string) 
        });
      }

      if (endDate) {
        query = query.andWhere('event.receivedAt <= :endDate', { 
          endDate: new Date(endDate as string) 
        });
      }

      if (paymentKey) {
        query = query.andWhere("event.data ->> 'paymentKey' = :paymentKey", { paymentKey });
      }

      // 페이지네이션
      const offset = (pageNum - 1) * limitNum;
      const [events, totalCount] = await query
        .skip(offset)
        .take(limitNum)
        .getManyAndCount();

      const totalPages = Math.ceil(totalCount / limitNum);

      logger.info('Payment events retrieved successfully', {
        userId: currentUser?.id,
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
      });

      res.json({
        success: true,
        data: {
          events,
          pagination: {
            currentPage: pageNum,
            itemsPerPage: limitNum,
            totalItems: totalCount,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          }
        },
        message: 'Payment events retrieved successfully',
      });

    } catch (error) {
      logger.error('Error retrieving payment events:', {
        userId: currentUser?.id,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/webhooks/events/stats - 웹훅 이벤트 통계 (보너스 엔드포인트)
  getWebhookStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { days = '7' } = req.query;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for webhook stats');
    }

    const daysNum = parseInt(days as string);
    if (daysNum < 1 || daysNum > 30) {
      throw createValidationError('Days parameter must be between 1 and 30');
    }

    try {
      const { AppDataSource } = await import('../../database/connection');
      const webhookEventRepository = AppDataSource.getRepository('WebhookEvent');
      
      const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      // 전체 통계
      const stats = await webhookEventRepository
        .createQueryBuilder('event')
        .select([
          'COUNT(*) as totalEvents',
          'COUNT(CASE WHEN event.status = \'success\' THEN 1 END) as successEvents',
          'COUNT(CASE WHEN event.status = \'failed\' THEN 1 END) as failedEvents',
          'COUNT(DISTINCT event.eventType) as uniqueEventTypes'
        ])
        .where('event.receivedAt >= :since', { since })
        .getRawOne();

      // 이벤트 타입별 통계
      const eventTypeStats = await webhookEventRepository
        .createQueryBuilder('event')
        .select([
          'event.eventType',
          'COUNT(*) as count',
          'COUNT(CASE WHEN event.status = \'success\' THEN 1 END) as successCount'
        ])
        .where('event.receivedAt >= :since', { since })
        .groupBy('event.eventType')
        .orderBy('count', 'DESC')
        .getRawMany();

      // 일별 트렌드
      const dailyTrends = await webhookEventRepository
        .createQueryBuilder('event')
        .select([
          "DATE_TRUNC('day', event.receivedAt) as date",
          'COUNT(*) as totalEvents',
          'COUNT(CASE WHEN event.status = \'success\' THEN 1 END) as successEvents'
        ])
        .where('event.receivedAt >= :since', { since })
        .groupBy("DATE_TRUNC('day', event.receivedAt)")
        .orderBy('date', 'ASC')
        .getRawMany();

      const webhookStats = {
        summary: {
          totalEvents: parseInt(stats.totalEvents) || 0,
          successEvents: parseInt(stats.successEvents) || 0,
          failedEvents: parseInt(stats.failedEvents) || 0,
          successRate: stats.totalEvents > 0 
            ? ((parseInt(stats.successEvents) / parseInt(stats.totalEvents)) * 100).toFixed(2)
            : '0.00',
          uniqueEventTypes: parseInt(stats.uniqueEventTypes) || 0,
        },
        eventTypes: eventTypeStats.map(item => ({
          eventType: item.eventType,
          totalCount: parseInt(item.count),
          successCount: parseInt(item.successCount),
          successRate: parseInt(item.count) > 0 
            ? ((parseInt(item.successCount) / parseInt(item.count)) * 100).toFixed(2)
            : '0.00'
        })),
        dailyTrends: dailyTrends.map(item => ({
          date: item.date.toISOString().split('T')[0],
          totalEvents: parseInt(item.totalEvents),
          successEvents: parseInt(item.successEvents),
          successRate: parseInt(item.totalEvents) > 0 
            ? ((parseInt(item.successEvents) / parseInt(item.totalEvents)) * 100).toFixed(2)
            : '0.00'
        })),
        period: {
          days: daysNum,
          startDate: since.toISOString(),
          endDate: new Date().toISOString(),
        }
      };

      res.json({
        success: true,
        data: webhookStats,
        message: 'Webhook statistics retrieved successfully',
      });

    } catch (error) {
      logger.error('Error retrieving webhook stats:', {
        userId: currentUser?.id,
        days: daysNum,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/webhooks/events/:id/retry - 실패한 웹훅 이벤트 재처리 (보너스)
  retryWebhookEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { id: eventId } = req.params;

    // Check permissions
    if (!['admin'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for webhook retry');
    }

    try {
      const { AppDataSource } = await import('../../database/connection');
      const webhookEventRepository = AppDataSource.getRepository('WebhookEvent');
      
      const event = await webhookEventRepository.findOne({ where: { id: eventId } });
      
      if (!event) {
        throw createValidationError('Webhook event not found');
      }

      if (event.status !== 'failed') {
        throw createValidationError('Only failed webhook events can be retried');
      }

      try {
        // 웹훅 이벤트 재처리
        await this.tossPaymentsService.processWebhookEvent(event.eventType, event.data);

        // 상태 업데이트
        await webhookEventRepository.update(eventId, {
          status: 'success',
          retryCount: (event.retryCount || 0) + 1,
          lastRetryAt: new Date(),
          error: null,
        });

        logger.info('Webhook event retried successfully', {
          userId: currentUser?.id,
          eventId,
          eventType: event.eventType,
        });

        res.json({
          success: true,
          message: 'Webhook event retried successfully',
        });

      } catch (retryError) {
        // 재시도 실패
        await webhookEventRepository.update(eventId, {
          retryCount: (event.retryCount || 0) + 1,
          lastRetryAt: new Date(),
          error: retryError.message,
        });

        throw retryError;
      }

    } catch (error) {
      logger.error('Error retrying webhook event:', {
        userId: currentUser?.id,
        eventId,
        error: error.message,
      });
      throw error;
    }
  });

  // Private helper methods

  private async logWebhookEvent(eventData: {
    type: string;
    eventType: string;
    data: any;
    signature?: string;
    ip?: string;
    userAgent?: string;
    receivedAt: Date;
    originalTimestamp?: string;
    error?: string;
    status?: string;
  }): Promise<void> {
    try {
      const { AppDataSource } = await import('../../database/connection');
      const webhookEventRepository = AppDataSource.getRepository('WebhookEvent');
      
      const webhookEvent = webhookEventRepository.create({
        type: eventData.type,
        eventType: eventData.eventType,
        data: eventData.data,
        signature: eventData.signature,
        sourceIp: eventData.ip,
        userAgent: eventData.userAgent,
        receivedAt: eventData.receivedAt,
        originalTimestamp: eventData.originalTimestamp ? new Date(eventData.originalTimestamp) : undefined,
        status: eventData.status || (eventData.error ? 'failed' : 'success'),
        error: eventData.error,
        retryCount: 0,
      });

      await webhookEventRepository.save(webhookEvent);
    } catch (error) {
      logger.error('Error logging webhook event:', error);
      // 웹훅 로깅 실패는 전체 프로세스를 중단하지 않음
    }
  }

  private async handleBillingKeyCreated(data: any): Promise<void> {
    logger.info('Billing key created webhook processed', {
      billingKey: data.billingKey,
      customerKey: data.customerKey,
    });
    
    // 빌링키 생성 후 처리 로직
    // - 구독 상태 업데이트
    // - 고객 알림
  }

  private async handleBillingKeyDeleted(data: any): Promise<void> {
    logger.info('Billing key deleted webhook processed', {
      billingKey: data.billingKey,
      customerKey: data.customerKey,
    });

    // 빌링키 삭제 후 처리 로직
    // - 관련 구독 취소
    // - 고객 알림
    
    try {
      const { SubscriptionService } = await import('../../services/subscription.service');
      const subscriptionService = new SubscriptionService();
      
      // 해당 빌링키로 된 활성 구독들을 취소
      const { AppDataSource } = await import('../../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const activeSubscriptions = await subscriptionRepository.find({
        where: {
          billingKey: data.billingKey,
          status: 'active'
        }
      });

      for (const subscription of activeSubscriptions) {
        await subscriptionService.cancelSubscription(
          subscription.id,
          'billing_key_deleted',
          true
        );
      }
    } catch (error) {
      logger.error('Error handling billing key deletion:', error);
    }
  }

  private async handleSubscriptionPaymentSuccess(data: any): Promise<void> {
    logger.info('Subscription payment success webhook processed', {
      paymentKey: data.paymentKey,
      subscriptionId: data.subscriptionId,
      amount: data.amount,
    });

    // 정기결제 성공 처리 로직은 이미 processWebhookEvent에서 처리됨
  }

  private async handleSubscriptionPaymentFailed(data: any): Promise<void> {
    logger.info('Subscription payment failed webhook processed', {
      subscriptionId: data.subscriptionId,
      failureReason: data.failureReason,
    });

    // 정기결제 실패 처리 로직은 이미 processWebhookEvent에서 처리됨
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    logger.info('Subscription cancelled webhook processed', {
      subscriptionId: data.subscriptionId,
      cancelledAt: data.cancelledAt,
    });

    // 구독 취소 처리 로직
    try {
      const { SubscriptionService } = await import('../../services/subscription.service');
      const subscriptionService = new SubscriptionService();
      
      await subscriptionService.cancelSubscription(
        data.subscriptionId,
        'cancelled_by_customer',
        true
      );
    } catch (error) {
      logger.error('Error handling subscription cancellation:', error);
    }
  }
}