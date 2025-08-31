import { AppDataSource } from '../database/connection';
import { TossPaymentsAdvancedService } from './toss-payments-advanced.service';
import { cacheService } from './cache.service';
import logger from '../utils/logger';
import moment from 'moment';

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  billingKey: string;
  startDate?: Date;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalCount: number;
  trialDays?: number;
  setupFee?: number;
  features?: string[];
  maxUsers?: number;
  maxStorage?: number; // in GB
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  planId: string;
  plan?: SubscriptionPlan;
  billingKey: string;
  status: 'trial' | 'active' | 'paused' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  pausedAt?: Date;
  resumedAt?: Date;
  totalPayments: number;
  totalAmount: number;
  failedPaymentCount: number;
  lastPaymentDate?: Date;
  lastFailureDate?: Date;
  lastFailureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  subscriptionId: string;
  period: string; // YYYY-MM format
  usageRecords: Array<{
    feature: string;
    quantity: number;
    unit: string;
    unitAmount?: number;
  }>;
  totalUsageAmount?: number;
  billedAmount?: number;
  billedAt?: Date;
}

export class SubscriptionService {
  private tossPaymentsService: TossPaymentsAdvancedService;

  constructor() {
    this.tossPaymentsService = new TossPaymentsAdvancedService();
  }

  /**
   * 구독 생성
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      const planRepository = AppDataSource.getRepository('SubscriptionPlan');

      // 구독 플랜 조회
      const plan = await planRepository.findOne({ where: { id: request.planId } });
      if (!plan || !plan.isActive) {
        throw new Error('Invalid or inactive subscription plan');
      }

      // 기존 활성 구독 확인
      const existingSubscription = await subscriptionRepository.findOne({
        where: {
          customerId: request.customerId,
          status: 'active'
        }
      });

      if (existingSubscription) {
        throw new Error('Customer already has an active subscription');
      }

      const now = new Date();
      const startDate = request.startDate || now;
      const trialDays = request.trialDays || plan.trialDays || 0;
      
      let trialEnd: Date | undefined;
      let nextBillingDate: Date;
      let status: Subscription['status'] = 'active';

      if (trialDays > 0) {
        trialEnd = moment(startDate).add(trialDays, 'days').toDate();
        nextBillingDate = trialEnd;
        status = 'trial';
      } else {
        nextBillingDate = this.calculateNextBillingDate(startDate, plan.interval, plan.intervalCount);
      }

      const currentPeriodEnd = this.calculateNextBillingDate(startDate, plan.interval, plan.intervalCount);

      // 구독 생성
      const subscription = subscriptionRepository.create({
        customerId: request.customerId,
        planId: request.planId,
        billingKey: request.billingKey,
        status,
        currentPeriodStart: startDate,
        currentPeriodEnd,
        nextBillingDate,
        trialStart: trialDays > 0 ? startDate : undefined,
        trialEnd,
        cancelAtPeriodEnd: false,
        totalPayments: 0,
        totalAmount: 0,
        failedPaymentCount: 0,
        metadata: request.metadata,
      });

      const savedSubscription = await subscriptionRepository.save(subscription);

      // 셋업 비용이 있는 경우 즉시 결제
      if (plan.setupFee && plan.setupFee > 0) {
        try {
          await this.processSetupFeePayment(savedSubscription as Subscription, plan);
        } catch (error) {
          // 셋업 비용 결제 실패 시 구독 취소
          await this.cancelSubscription(savedSubscription.id, 'setup_payment_failed');
          throw new Error(`Setup fee payment failed: ${error.message}`);
        }
      }

      // 캐시 무효화
      await this.invalidateCustomerCache(request.customerId);

      logger.info('Subscription created successfully', {
        subscriptionId: savedSubscription.id,
        customerId: request.customerId,
        planId: request.planId,
        status,
      });

      return await this.getSubscriptionById(savedSubscription.id);
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * 구독 조회
   */
  async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
    try {
      const cacheKey = `subscription:${subscriptionId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached as Subscription;
      }

      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan']
      });

      if (subscription) {
        // 캐시에 저장 (5분)
        await cacheService.set(cacheKey, subscription, { ttl: 300 });
      }

      return subscription as Subscription | null;
    } catch (error) {
      logger.error('Error fetching subscription:', error);
      throw error;
    }
  }

  /**
   * 고객의 구독 목록 조회
   */
  async getCustomerSubscriptions(customerId: string): Promise<Subscription[]> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const subscriptions = await subscriptionRepository.find({
        where: { customerId },
        relations: ['plan'],
        order: { createdAt: 'DESC' }
      });

      return subscriptions as Subscription[];
    } catch (error) {
      logger.error('Error fetching customer subscriptions:', error);
      throw error;
    }
  }

  /**
   * 구독 취소
   */
  async cancelSubscription(
    subscriptionId: string, 
    reason?: string,
    cancelImmediately: boolean = false
  ): Promise<Subscription> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (['cancelled', 'expired'].includes(subscription.status)) {
        throw new Error('Subscription is already cancelled or expired');
      }

      const now = new Date();
      const updateData: Partial<Subscription> = {
        cancelledAt: now,
        cancellationReason: reason,
        cancelAtPeriodEnd: !cancelImmediately,
        updatedAt: now,
      };

      if (cancelImmediately) {
        updateData.status = 'cancelled';
        updateData.currentPeriodEnd = now;
      }

      await subscriptionRepository.update(subscriptionId, updateData);

      // 캐시 무효화
      await this.invalidateSubscriptionCache(subscriptionId);
      await this.invalidateCustomerCache(subscription.customerId);

      logger.info('Subscription cancelled', {
        subscriptionId,
        customerId: subscription.customerId,
        cancelImmediately,
        reason,
      });

      return await this.getSubscriptionById(subscriptionId);
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * 구독 일시정지
   */
  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error('Only active subscriptions can be paused');
      }

      await subscriptionRepository.update(subscriptionId, {
        status: 'paused',
        pausedAt: new Date(),
        updatedAt: new Date(),
      });

      // 캐시 무효화
      await this.invalidateSubscriptionCache(subscriptionId);

      logger.info('Subscription paused', { subscriptionId });

      return await this.getSubscriptionById(subscriptionId);
    } catch (error) {
      logger.error('Error pausing subscription:', error);
      throw error;
    }
  }

  /**
   * 구독 재개
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'paused') {
        throw new Error('Only paused subscriptions can be resumed');
      }

      const now = new Date();
      const pauseDuration = now.getTime() - (subscription.pausedAt?.getTime() || 0);
      
      // 다음 결제일을 일시정지 기간만큼 연장
      const newNextBillingDate = new Date(subscription.nextBillingDate.getTime() + pauseDuration);
      const newCurrentPeriodEnd = new Date(subscription.currentPeriodEnd.getTime() + pauseDuration);

      await subscriptionRepository.update(subscriptionId, {
        status: 'active',
        resumedAt: now,
        pausedAt: null,
        nextBillingDate: newNextBillingDate,
        currentPeriodEnd: newCurrentPeriodEnd,
        updatedAt: now,
      });

      // 캐시 무효화
      await this.invalidateSubscriptionCache(subscriptionId);

      logger.info('Subscription resumed', { subscriptionId });

      return await this.getSubscriptionById(subscriptionId);
    } catch (error) {
      logger.error('Error resuming subscription:', error);
      throw error;
    }
  }

  /**
   * 정기결제 처리 (크론 작업용)
   */
  async processScheduledPayments(): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      // 오늘 결제해야 할 구독 조회
      const today = moment().startOf('day');
      const tomorrow = moment().add(1, 'day').startOf('day');

      const subscriptionsToCharge = await subscriptionRepository
        .createQueryBuilder('subscription')
        .leftJoinAndSelect('subscription.plan', 'plan')
        .where('subscription.status IN (:...statuses)', { statuses: ['active', 'trial'] })
        .andWhere('subscription.nextBillingDate >= :today', { today: today.toDate() })
        .andWhere('subscription.nextBillingDate < :tomorrow', { tomorrow: tomorrow.toDate() })
        .andWhere('subscription.cancelAtPeriodEnd = false')
        .getMany();

      logger.info(`Found ${subscriptionsToCharge.length} subscriptions to process`);

      for (const subscription of subscriptionsToCharge) {
        try {
          await this.processSubscriptionPayment(subscription as Subscription);
        } catch (error) {
          logger.error(`Failed to process subscription payment ${subscription.id}:`, error);
        }
      }

      // 만료된 구독 처리
      await this.processExpiredSubscriptions();

    } catch (error) {
      logger.error('Error processing scheduled payments:', error);
    }
  }

  /**
   * 구독 결제 처리
   */
  private async processSubscriptionPayment(subscription: Subscription): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');

      // 트라이얼 종료 확인
      if (subscription.status === 'trial' && subscription.trialEnd && new Date() >= subscription.trialEnd) {
        subscription.status = 'active';
      }

      // 결제 금액 계산 (사용량 기반 요금 포함)
      const amount = await this.calculateSubscriptionAmount(subscription);

      if (amount > 0) {
        // 빌링키로 결제 실행
        const paymentResult = await this.tossPaymentsService.payWithBillingKey({
          billingKey: subscription.billingKey,
          customerKey: subscription.customerId,
          amount,
          orderId: `sub_${subscription.id}_${Date.now()}`,
          orderName: `${subscription.plan?.name} - Monthly Subscription`,
        });

        // 성공 시 구독 정보 업데이트
        const nextPeriodStart = subscription.nextBillingDate;
        const nextPeriodEnd = this.calculateNextBillingDate(
          nextPeriodStart, 
          subscription.plan?.interval || 'monthly',
          subscription.plan?.intervalCount || 1
        );

        await subscriptionRepository.update(subscription.id, {
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          nextBillingDate: this.calculateNextBillingDate(
            nextPeriodEnd,
            subscription.plan?.interval || 'monthly',
            subscription.plan?.intervalCount || 1
          ),
          totalPayments: subscription.totalPayments + 1,
          totalAmount: subscription.totalAmount + amount,
          lastPaymentDate: new Date(),
          failedPaymentCount: 0,
          status: 'active',
          updatedAt: new Date(),
        });

        // 웹훅 이벤트 발송
        await this.tossPaymentsService.processWebhookEvent('SUBSCRIPTION_RENEWED', {
          subscriptionId: subscription.id,
          paymentKey: paymentResult.paymentKey,
          amount,
        });

        logger.info('Subscription payment processed successfully', {
          subscriptionId: subscription.id,
          amount,
          paymentKey: paymentResult.paymentKey,
        });

      } else {
        // 무료 플랜의 경우 결제 없이 기간 연장
        const nextPeriodStart = subscription.nextBillingDate;
        const nextPeriodEnd = this.calculateNextBillingDate(
          nextPeriodStart,
          subscription.plan?.interval || 'monthly',
          subscription.plan?.intervalCount || 1
        );

        await subscriptionRepository.update(subscription.id, {
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          nextBillingDate: this.calculateNextBillingDate(
            nextPeriodEnd,
            subscription.plan?.interval || 'monthly',
            subscription.plan?.intervalCount || 1
          ),
          updatedAt: new Date(),
        });
      }

    } catch (error) {
      // 결제 실패 처리
      await this.handleSubscriptionPaymentFailure(subscription, error);
      throw error;
    }
  }

  /**
   * 구독 결제 실패 처리
   */
  private async handleSubscriptionPaymentFailure(subscription: Subscription, error: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');

      const failedPaymentCount = subscription.failedPaymentCount + 1;
      const maxRetries = 3;

      let status = subscription.status;
      if (failedPaymentCount >= maxRetries) {
        status = 'past_due';
      }

      await subscriptionRepository.update(subscription.id, {
        failedPaymentCount,
        lastFailureDate: new Date(),
        lastFailureReason: error.message,
        status,
        updatedAt: new Date(),
      });

      // 웹훅 이벤트 발송
      await this.tossPaymentsService.processWebhookEvent('SUBSCRIPTION_FAILED', {
        subscriptionId: subscription.id,
        failedPaymentCount,
        error: error.message,
      });

      // 최대 재시도 횟수 도달 시 구독 취소
      if (failedPaymentCount >= maxRetries) {
        await this.cancelSubscription(subscription.id, 'payment_failure_limit_reached', true);
      }

      logger.warn('Subscription payment failed', {
        subscriptionId: subscription.id,
        failedPaymentCount,
        error: error.message,
      });

    } catch (updateError) {
      logger.error('Error handling subscription payment failure:', updateError);
    }
  }

  /**
   * 만료된 구독 처리
   */
  private async processExpiredSubscriptions(): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');

      const now = new Date();
      
      // cancelAtPeriodEnd가 true인 구독 중 기간이 만료된 것들
      const expiredSubscriptions = await subscriptionRepository
        .createQueryBuilder('subscription')
        .where('subscription.cancelAtPeriodEnd = true')
        .andWhere('subscription.currentPeriodEnd <= :now', { now })
        .andWhere('subscription.status != :cancelled', { cancelled: 'cancelled' })
        .getMany();

      for (const subscription of expiredSubscriptions) {
        await subscriptionRepository.update(subscription.id, {
          status: 'cancelled',
          updatedAt: now,
        });

        // 캐시 무효화
        await this.invalidateSubscriptionCache(subscription.id);

        logger.info('Subscription expired and cancelled', {
          subscriptionId: subscription.id,
        });
      }

    } catch (error) {
      logger.error('Error processing expired subscriptions:', error);
    }
  }

  // Helper methods

  private calculateNextBillingDate(
    startDate: Date, 
    interval: string, 
    intervalCount: number
  ): Date {
    const start = moment(startDate);
    
    switch (interval) {
      case 'daily':
        return start.add(intervalCount, 'days').toDate();
      case 'weekly':
        return start.add(intervalCount, 'weeks').toDate();
      case 'monthly':
        return start.add(intervalCount, 'months').toDate();
      case 'yearly':
        return start.add(intervalCount, 'years').toDate();
      default:
        return start.add(1, 'month').toDate();
    }
  }

  private async processSetupFeePayment(subscription: Subscription, plan: SubscriptionPlan): Promise<void> {
    if (!plan.setupFee || plan.setupFee <= 0) return;

    await this.tossPaymentsService.payWithBillingKey({
      billingKey: subscription.billingKey,
      customerKey: subscription.customerId,
      amount: plan.setupFee,
      orderId: `setup_${subscription.id}_${Date.now()}`,
      orderName: `${plan.name} - Setup Fee`,
    });
  }

  private async calculateSubscriptionAmount(subscription: Subscription): Promise<number> {
    let baseAmount = subscription.plan?.amount || 0;
    
    // 사용량 기반 요금 추가
    try {
      const usage = await this.getSubscriptionUsage(subscription.id);
      if (usage && usage.totalUsageAmount) {
        baseAmount += usage.totalUsageAmount;
      }
    } catch (error) {
      logger.warn('Error calculating usage amount:', error);
    }

    return baseAmount;
  }

  private async getSubscriptionUsage(subscriptionId: string): Promise<SubscriptionUsage | null> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const usageRepository = AppDataSource.getRepository('SubscriptionUsage');
      
      const currentPeriod = moment().format('YYYY-MM');
      return await usageRepository.findOne({
        where: { subscriptionId, period: currentPeriod }
      }) as SubscriptionUsage | null;
    } catch (error) {
      logger.error('Error fetching subscription usage:', error);
      return null;
    }
  }

  // Cache invalidation methods

  private async invalidateSubscriptionCache(subscriptionId: string): Promise<void> {
    await cacheService.delete(`subscription:${subscriptionId}`);
  }

  private async invalidateCustomerCache(customerId: string): Promise<void> {
    await cacheService.delete(`customer_subscriptions:${customerId}`);
  }

  /**
   * 구독 통계 조회
   */
  async getSubscriptionStats(): Promise<any> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const stats = await subscriptionRepository
        .createQueryBuilder('subscription')
        .select([
          'subscription.status',
          'COUNT(*) as count',
          'SUM(subscription.totalAmount) as totalRevenue',
          'AVG(subscription.totalAmount) as avgRevenue'
        ])
        .groupBy('subscription.status')
        .getRawMany();

      return stats;
    } catch (error) {
      logger.error('Error fetching subscription stats:', error);
      throw error;
    }
  }
}