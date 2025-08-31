import { AppDataSource } from '../database/connection';
import { cacheService } from './cache.service';
import logger from '../utils/logger';
import moment from 'moment';

export interface PaymentOverview {
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averagePaymentAmount: number;
  totalFees: number;
  netRevenue: number;
  refundedAmount: number;
  refundRate: number;
  periodComparison: {
    paymentsGrowth: number;
    amountGrowth: number;
    successRateChange: number;
  };
  topPaymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

export interface PaymentMethodAnalysis {
  method: string;
  totalCount: number;
  totalAmount: number;
  successCount: number;
  successRate: number;
  averageAmount: number;
  totalFees: number;
  trends: Array<{
    date: string;
    count: number;
    amount: number;
    successRate: number;
  }>;
}

export interface PaymentTrend {
  date: string;
  totalPayments: number;
  totalAmount: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  averageAmount: number;
  refundAmount: number;
  netRevenue: number;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  churned: number;
  churnRate: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  ltv: number; // Lifetime Value
  arpu: number; // Average Revenue Per User
  subscriptionGrowth: Array<{
    date: string;
    new: number;
    cancelled: number;
    net: number;
    mrr: number;
  }>;
  planDistribution: Array<{
    planName: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

export interface PaymentAnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  paymentMethods?: string[];
  statuses?: string[];
  vendorIds?: string[];
  customerIds?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export class PaymentAnalyticsService {
  
  /**
   * 결제 현황 종합 분석
   */
  async getPaymentOverview(filters: PaymentAnalyticsFilter = {}): Promise<PaymentOverview> {
    const cacheKey = `payment_overview:${this.hashFilters(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      return cached as PaymentOverview;
    }

    try {
      const {
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
      } = filters;

      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      // 현재 기간 데이터
      let query = paymentRepository.createQueryBuilder('payment')
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      
      // 필터 적용
      if (filters.paymentMethods?.length) {
        query = query.andWhere('payment.method IN (:...methods)', { methods: filters.paymentMethods });
      }
      
      if (filters.statuses?.length) {
        query = query.andWhere('payment.status IN (:...statuses)', { statuses: filters.statuses });
      }
      
      if (filters.vendorIds?.length) {
        query = query.andWhere('payment.vendorId IN (:...vendorIds)', { vendorIds: filters.vendorIds });
      }
      
      if (filters.minAmount) {
        query = query.andWhere('payment.amount >= :minAmount', { minAmount: filters.minAmount });
      }
      
      if (filters.maxAmount) {
        query = query.andWhere('payment.amount <= :maxAmount', { maxAmount: filters.maxAmount });
      }

      const currentPeriodPayments = await query.getMany();
      
      // 이전 기간 데이터 (비교용)
      const periodLength = moment(endDate).diff(startDate);
      const previousStart = moment(startDate).subtract(periodLength).toDate();
      const previousEnd = startDate;
      
      const previousQuery = paymentRepository.createQueryBuilder('payment')
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { 
          startDate: previousStart, 
          endDate: previousEnd 
        });
        
      const previousPeriodPayments = await previousQuery.getMany();
      
      // 현재 기간 집계
      const totalPayments = currentPeriodPayments.length;
      const successfulPayments = currentPeriodPayments.filter(p => p.status === 'completed').length;
      const failedPayments = currentPeriodPayments.filter(p => p.status === 'failed').length;
      const totalAmount = currentPeriodPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const refundedAmount = currentPeriodPayments
        .filter(p => p.status === 'cancelled')
        .reduce((sum, p) => sum + (p.cancelledAmount || 0), 0);
      const totalFees = currentPeriodPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.fee || 0), 0);
      
      // 이전 기간 집계
      const previousTotalPayments = previousPeriodPayments.length;
      const previousTotalAmount = previousPeriodPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const previousSuccessfulPayments = previousPeriodPayments
        .filter(p => p.status === 'completed').length;
      
      // 성장률 계산
      const paymentsGrowth = previousTotalPayments > 0 
        ? ((totalPayments - previousTotalPayments) / previousTotalPayments) * 100 
        : 0;
      const amountGrowth = previousTotalAmount > 0 
        ? ((totalAmount - previousTotalAmount) / previousTotalAmount) * 100 
        : 0;
      const successRateChange = previousTotalPayments > 0 
        ? (successfulPayments / totalPayments) - (previousSuccessfulPayments / previousTotalPayments) 
        : 0;
      
      // 결제 수단별 집계
      const paymentMethodCounts = new Map();
      currentPeriodPayments.filter(p => p.status === 'completed').forEach(payment => {
        const method = payment.method || 'unknown';
        const existing = paymentMethodCounts.get(method) || { count: 0, amount: 0 };
        existing.count += 1;
        existing.amount += payment.amount;
        paymentMethodCounts.set(method, existing);
      });
      
      const topPaymentMethods = Array.from(paymentMethodCounts.entries())
        .map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount,
          percentage: (data.amount / totalAmount) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

      const overview: PaymentOverview = {
        totalPayments,
        totalAmount,
        successfulPayments,
        failedPayments,
        successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
        averagePaymentAmount: successfulPayments > 0 ? totalAmount / successfulPayments : 0,
        totalFees,
        netRevenue: totalAmount - totalFees - refundedAmount,
        refundedAmount,
        refundRate: totalAmount > 0 ? (refundedAmount / totalAmount) * 100 : 0,
        periodComparison: {
          paymentsGrowth,
          amountGrowth,
          successRateChange: successRateChange * 100,
        },
        topPaymentMethods,
      };

      // 캐시 저장 (10분)
      await cacheService.set(cacheKey, overview, { ttl: 600 });
      
      return overview;
    } catch (error) {
      logger.error('Error getting payment overview:', error);
      throw error;
    }
  }

  /**
   * 결제 수단별 분석
   */
  async getPaymentMethodAnalysis(filters: PaymentAnalyticsFilter = {}): Promise<PaymentMethodAnalysis[]> {
    const cacheKey = `payment_methods:${this.hashFilters(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached as PaymentMethodAnalysis[];
    }

    try {
      const {
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
      } = filters;

      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      // 결제 수단별 집계 쿼리
      const methodAnalysis = await paymentRepository
        .createQueryBuilder('payment')
        .select([
          'payment.method as method',
          'COUNT(*) as totalCount',
          'SUM(payment.amount) as totalAmount',
          'COUNT(CASE WHEN payment.status = \'completed\' THEN 1 END) as successCount',
          'AVG(payment.amount) as averageAmount',
          'SUM(COALESCE(payment.fee, 0)) as totalFees'
        ])
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy('payment.method')
        .orderBy('totalAmount', 'DESC')
        .getRawMany();

      // 각 결제 수단별 일일 트렌드 데이터 생성
      const analysisResults: PaymentMethodAnalysis[] = [];
      
      for (const method of methodAnalysis) {
        // 일일 트렌드 데이터
        const trends = await this.getMethodDailyTrends(
          method.method, 
          startDate, 
          endDate, 
          filters
        );

        analysisResults.push({
          method: method.method || 'unknown',
          totalCount: parseInt(method.totalCount),
          totalAmount: parseFloat(method.totalAmount) || 0,
          successCount: parseInt(method.successCount),
          successRate: parseInt(method.totalCount) > 0 
            ? (parseInt(method.successCount) / parseInt(method.totalCount)) * 100 
            : 0,
          averageAmount: parseFloat(method.averageAmount) || 0,
          totalFees: parseFloat(method.totalFees) || 0,
          trends,
        });
      }

      // 캐시 저장 (15분)
      await cacheService.set(cacheKey, analysisResults, { ttl: 900 });
      
      return analysisResults;
    } catch (error) {
      logger.error('Error getting payment method analysis:', error);
      throw error;
    }
  }

  /**
   * 결제 트렌드 분석
   */
  async getPaymentTrends(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
    filters: PaymentAnalyticsFilter = {}
  ): Promise<PaymentTrend[]> {
    const cacheKey = `payment_trends:${startDate.getTime()}:${endDate.getTime()}:${groupBy}:${this.hashFilters(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached as PaymentTrend[];
    }

    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      let dateFormat: string;
      let dateTrunc: string;
      
      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-WW';
          dateTrunc = 'week';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateTrunc = 'month';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateTrunc = 'day';
      }

      // PostgreSQL용 쿼리
      const trends = await paymentRepository
        .createQueryBuilder('payment')
        .select([
          `DATE_TRUNC('${dateTrunc}', payment.createdAt) as date`,
          'COUNT(*) as totalPayments',
          'SUM(CASE WHEN payment.status = \'completed\' THEN payment.amount ELSE 0 END) as totalAmount',
          'COUNT(CASE WHEN payment.status = \'completed\' THEN 1 END) as successfulPayments',
          'COUNT(CASE WHEN payment.status = \'failed\' THEN 1 END) as failedPayments',
          'SUM(CASE WHEN payment.status = \'cancelled\' THEN COALESCE(payment.cancelledAmount, 0) ELSE 0 END) as refundAmount',
          'SUM(CASE WHEN payment.status = \'completed\' THEN COALESCE(payment.fee, 0) ELSE 0 END) as totalFees'
        ])
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy(`DATE_TRUNC('${dateTrunc}', payment.createdAt)`)
        .orderBy('date', 'ASC')
        .getRawMany();

      const trendResults: PaymentTrend[] = trends.map(trend => {
        const totalPayments = parseInt(trend.totalPayments);
        const successfulPayments = parseInt(trend.successfulPayments);
        const totalAmount = parseFloat(trend.totalAmount) || 0;
        const refundAmount = parseFloat(trend.refundAmount) || 0;
        const totalFees = parseFloat(trend.totalFees) || 0;

        return {
          date: moment(trend.date).format(dateFormat),
          totalPayments,
          totalAmount,
          successfulPayments,
          failedPayments: parseInt(trend.failedPayments),
          successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
          averageAmount: successfulPayments > 0 ? totalAmount / successfulPayments : 0,
          refundAmount,
          netRevenue: totalAmount - totalFees - refundAmount,
        };
      });

      // 캐시 저장 (30분)
      await cacheService.set(cacheKey, trendResults, { ttl: 1800 });
      
      return trendResults;
    } catch (error) {
      logger.error('Error getting payment trends:', error);
      throw error;
    }
  }

  /**
   * 구독 분석
   */
  async getSubscriptionAnalytics(filters: PaymentAnalyticsFilter = {}): Promise<SubscriptionAnalytics> {
    const cacheKey = `subscription_analytics:${this.hashFilters(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      return cached as SubscriptionAnalytics;
    }

    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      // 전체 구독 통계
      const totalSubscriptions = await subscriptionRepository.count();
      const activeSubscriptions = await subscriptionRepository.count({
        where: { status: 'active' }
      });
      
      // 이탈률 계산 (지난 30일 기준)
      const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
      const churned = await subscriptionRepository.count({
        where: {
          status: 'cancelled',
          cancelledAt: {
            $gte: thirtyDaysAgo
          }
        } as any
      });
      
      // MRR 계산
      const mrrQuery = await subscriptionRepository
        .createQueryBuilder('subscription')
        .leftJoin('subscription.plan', 'plan')
        .select([
          'SUM(CASE WHEN plan.interval = \'monthly\' THEN plan.amount ELSE plan.amount / 12 END) as mrr'
        ])
        .where('subscription.status = :status', { status: 'active' })
        .getRawOne();
      
      const mrr = parseFloat(mrrQuery.mrr) || 0;
      const arr = mrr * 12;
      
      // ARPU 계산
      const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
      
      // LTV 계산 (단순화된 버전: MRR / churn rate)
      const churnRate = totalSubscriptions > 0 ? (churned / totalSubscriptions) * 100 : 0;
      const ltv = churnRate > 0 ? arpu / (churnRate / 100) : 0;
      
      // 구독 성장 트렌드 (지난 12개월)
      const subscriptionGrowth = await this.getSubscriptionGrowthTrends();
      
      // 플랜별 분포
      const planDistribution = await this.getSubscriptionPlanDistribution();

      const analytics: SubscriptionAnalytics = {
        totalSubscriptions,
        activeSubscriptions,
        churned,
        churnRate,
        mrr,
        arr,
        ltv,
        arpu,
        subscriptionGrowth,
        planDistribution,
      };

      // 캐시 저장 (20분)
      await cacheService.set(cacheKey, analytics, { ttl: 1200 });
      
      return analytics;
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getMethodDailyTrends(
    method: string,
    startDate: Date,
    endDate: Date,
    filters: PaymentAnalyticsFilter
  ): Promise<Array<{ date: string; count: number; amount: number; successRate: number }>> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      const trends = await paymentRepository
        .createQueryBuilder('payment')
        .select([
          `DATE_TRUNC('day', payment.createdAt) as date`,
          'COUNT(*) as count',
          'SUM(CASE WHEN payment.status = \'completed\' THEN payment.amount ELSE 0 END) as amount',
          'COUNT(CASE WHEN payment.status = \'completed\' THEN 1 END) as successCount'
        ])
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('payment.method = :method', { method })
        .groupBy(`DATE_TRUNC('day', payment.createdAt)`)
        .orderBy('date', 'ASC')
        .getRawMany();

      return trends.map(trend => ({
        date: moment(trend.date).format('YYYY-MM-DD'),
        count: parseInt(trend.count),
        amount: parseFloat(trend.amount) || 0,
        successRate: parseInt(trend.count) > 0 
          ? (parseInt(trend.successCount) / parseInt(trend.count)) * 100 
          : 0,
      }));
    } catch (error) {
      logger.error('Error getting method daily trends:', error);
      return [];
    }
  }

  private async getSubscriptionGrowthTrends(): Promise<Array<{
    date: string;
    new: number;
    cancelled: number;
    net: number;
    mrr: number;
  }>> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const growth = [];
      
      for (let i = 11; i >= 0; i--) {
        const monthStart = moment().subtract(i, 'months').startOf('month');
        const monthEnd = moment().subtract(i, 'months').endOf('month');
        
        const newSubs = await subscriptionRepository.count({
          where: {
            createdAt: {
              $gte: monthStart.toDate(),
              $lte: monthEnd.toDate()
            }
          } as any
        });
        
        const cancelledSubs = await subscriptionRepository.count({
          where: {
            status: 'cancelled',
            cancelledAt: {
              $gte: monthStart.toDate(),
              $lte: monthEnd.toDate()
            }
          } as any
        });
        
        // 해당 월말 기준 MRR 계산
        const mrrQuery = await subscriptionRepository
          .createQueryBuilder('subscription')
          .leftJoin('subscription.plan', 'plan')
          .select([
            'SUM(CASE WHEN plan.interval = \'monthly\' THEN plan.amount ELSE plan.amount / 12 END) as mrr'
          ])
          .where('subscription.status = :status', { status: 'active' })
          .andWhere('subscription.createdAt <= :date', { date: monthEnd.toDate() })
          .getRawOne();
        
        growth.push({
          date: monthStart.format('YYYY-MM'),
          new: newSubs,
          cancelled: cancelledSubs,
          net: newSubs - cancelledSubs,
          mrr: parseFloat(mrrQuery.mrr) || 0,
        });
      }
      
      return growth;
    } catch (error) {
      logger.error('Error getting subscription growth trends:', error);
      return [];
    }
  }

  private async getSubscriptionPlanDistribution(): Promise<Array<{
    planName: string;
    count: number;
    revenue: number;
    percentage: number;
  }>> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const subscriptionRepository = AppDataSource.getRepository('Subscription');
      
      const distribution = await subscriptionRepository
        .createQueryBuilder('subscription')
        .leftJoin('subscription.plan', 'plan')
        .select([
          'plan.name as planName',
          'COUNT(*) as count',
          'SUM(plan.amount) as revenue'
        ])
        .where('subscription.status = :status', { status: 'active' })
        .groupBy('plan.name')
        .getRawMany();

      const totalRevenue = distribution.reduce((sum, item) => sum + parseFloat(item.revenue), 0);

      return distribution.map(item => ({
        planName: item.planName || 'Unknown',
        count: parseInt(item.count),
        revenue: parseFloat(item.revenue) || 0,
        percentage: totalRevenue > 0 ? (parseFloat(item.revenue) / totalRevenue) * 100 : 0,
      }));
    } catch (error) {
      logger.error('Error getting subscription plan distribution:', error);
      return [];
    }
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64');
  }

  /**
   * 결제 실시간 통계
   */
  async getRealTimePaymentStats(): Promise<{
    todayPayments: number;
    todayRevenue: number;
    activePayments: number;
    averageProcessingTime: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const today = moment().startOf('day').toDate();
      const now = new Date();

      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      const todayStats = await paymentRepository
        .createQueryBuilder('payment')
        .select([
          'COUNT(*) as todayPayments',
          'SUM(CASE WHEN payment.status = \'completed\' THEN payment.amount ELSE 0 END) as todayRevenue',
          'COUNT(CASE WHEN payment.status = \'processing\' THEN 1 END) as activePayments'
        ])
        .where('payment.createdAt >= :today', { today })
        .getRawOne();

      // 실패 사유 집계 (오늘)
      const failureReasons = await paymentRepository
        .createQueryBuilder('payment')
        .select([
          'payment.failureReason as reason',
          'COUNT(*) as count'
        ])
        .where('payment.status = :status', { status: 'failed' })
        .andWhere('payment.createdAt >= :today', { today })
        .groupBy('payment.failureReason')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany();

      return {
        todayPayments: parseInt(todayStats.todayPayments) || 0,
        todayRevenue: parseFloat(todayStats.todayRevenue) || 0,
        activePayments: parseInt(todayStats.activePayments) || 0,
        averageProcessingTime: 2.5, // 모의 데이터 - 실제로는 처리 시간 추적 필요
        topFailureReasons: failureReasons.map(item => ({
          reason: item.reason || 'Unknown',
          count: parseInt(item.count)
        }))
      };
    } catch (error) {
      logger.error('Error getting real-time payment stats:', error);
      throw error;
    }
  }
}