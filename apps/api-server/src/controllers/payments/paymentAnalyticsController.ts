import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { PaymentAnalyticsService, PaymentAnalyticsFilter } from '../../services/payment-analytics.service';
import { asyncHandler, createForbiddenError, createValidationError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(duration);

export class PaymentAnalyticsController {
  private paymentAnalyticsService: PaymentAnalyticsService;

  constructor() {
    this.paymentAnalyticsService = new PaymentAnalyticsService();
  }

  // GET /api/analytics/payments/overview - 결제 현황 분석
  getPaymentOverview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      paymentMethods,
      statuses,
      vendorIds,
      minAmount,
      maxAmount
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Payment analytics access required');
    }

    try {
      // Build filters
      const filters: PaymentAnalyticsFilter = {};

      if (startDate) {
        filters.startDate = dayjs(startDate as string).toDate();
      }

      if (endDate) {
        filters.endDate = dayjs(endDate as string).toDate();
      }

      if (paymentMethods) {
        filters.paymentMethods = Array.isArray(paymentMethods) 
          ? paymentMethods as string[]
          : [paymentMethods as string];
      }

      if (statuses) {
        filters.statuses = Array.isArray(statuses) 
          ? statuses as string[]
          : [statuses as string];
      }

      if (minAmount) {
        const min = parseFloat(minAmount as string);
        if (!isNaN(min)) {
          filters.minAmount = min;
        }
      }

      if (maxAmount) {
        const max = parseFloat(maxAmount as string);
        if (!isNaN(max)) {
          filters.maxAmount = max;
        }
      }

      // Role-based filtering
      if (currentUser?.role === 'vendor') {
        const vendorData = await this.getVendorByUserId(currentUser.id);
        if (vendorData) {
          filters.vendorIds = [vendorData.id];
        }
      } else if (vendorIds) {
        filters.vendorIds = Array.isArray(vendorIds) 
          ? vendorIds as string[]
          : [vendorIds as string];
      }

      const overview = await this.paymentAnalyticsService.getPaymentOverview(filters);

      logger.info('Payment overview retrieved successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        totalPayments: overview.totalPayments,
        totalAmount: overview.totalAmount,
        successRate: overview.successRate,
      });

      res.json({
        success: true,
        data: overview,
        message: 'Payment overview retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving payment overview:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/payments/methods - 결제 수단별 분석
  getPaymentMethodAnalysis = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      vendorIds,
      minAmount,
      maxAmount
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Payment analytics access required');
    }

    try {
      // Build filters
      const filters: PaymentAnalyticsFilter = {};

      if (startDate) {
        filters.startDate = dayjs(startDate as string).toDate();
      }

      if (endDate) {
        filters.endDate = dayjs(endDate as string).toDate();
      }

      if (minAmount) {
        const min = parseFloat(minAmount as string);
        if (!isNaN(min)) {
          filters.minAmount = min;
        }
      }

      if (maxAmount) {
        const max = parseFloat(maxAmount as string);
        if (!isNaN(max)) {
          filters.maxAmount = max;
        }
      }

      // Role-based filtering
      if (currentUser?.role === 'vendor') {
        const vendorData = await this.getVendorByUserId(currentUser.id);
        if (vendorData) {
          filters.vendorIds = [vendorData.id];
        }
      } else if (vendorIds) {
        filters.vendorIds = Array.isArray(vendorIds) 
          ? vendorIds as string[]
          : [vendorIds as string];
      }

      const methodAnalysis = await this.paymentAnalyticsService.getPaymentMethodAnalysis(filters);

      logger.info('Payment method analysis retrieved successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        methodCount: methodAnalysis.length,
      });

      res.json({
        success: true,
        data: methodAnalysis,
        message: 'Payment method analysis retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving payment method analysis:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/payments/trends - 결제 트렌드 분석
  getPaymentTrends = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      startDate,
      endDate,
      groupBy = 'day',
      paymentMethods,
      statuses,
      vendorIds,
      includeSubscription = 'true'
    } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Payment analytics access required');
    }

    // Validate groupBy parameter
    if (!['day', 'week', 'month'].includes(groupBy as string)) {
      throw createValidationError('Invalid groupBy parameter. Must be day, week, or month');
    }

    try {
      // Default date range (last 30 days)
      const start = startDate 
        ? dayjs(startDate as string).toDate()
        : dayjs().subtract(30, 'days').toDate();
      const end = endDate 
        ? dayjs(endDate as string).toDate() 
        : new Date();

      // Build filters
      const filters: PaymentAnalyticsFilter = {};

      if (paymentMethods) {
        filters.paymentMethods = Array.isArray(paymentMethods) 
          ? paymentMethods as string[]
          : [paymentMethods as string];
      }

      if (statuses) {
        filters.statuses = Array.isArray(statuses) 
          ? statuses as string[]
          : [statuses as string];
      }

      // Role-based filtering
      if (currentUser?.role === 'vendor') {
        const vendorData = await this.getVendorByUserId(currentUser.id);
        if (vendorData) {
          filters.vendorIds = [vendorData.id];
        }
      } else if (vendorIds) {
        filters.vendorIds = Array.isArray(vendorIds) 
          ? vendorIds as string[]
          : [vendorIds as string];
      }

      const trends = await this.paymentAnalyticsService.getPaymentTrends(
        start,
        end,
        groupBy as 'day' | 'week' | 'month',
        filters
      );

      // 구독 분석 포함
      let subscriptionAnalytics = null;
      if (includeSubscription === 'true') {
        try {
          subscriptionAnalytics = await this.paymentAnalyticsService.getSubscriptionAnalytics(filters);
        } catch (subscriptionError) {
          logger.warn('Error getting subscription analytics:', subscriptionError);
          // 구독 분석 실패는 전체 응답을 방해하지 않음
        }
      }

      // 실시간 통계 추가
      const realTimeStats = await this.paymentAnalyticsService.getRealTimePaymentStats();

      logger.info('Payment trends retrieved successfully', {
        userId: currentUser?.id,
        role: currentUser?.role,
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        dataPoints: trends.length,
        groupBy,
      });

      res.json({
        success: true,
        data: {
          trends,
          subscription: subscriptionAnalytics,
          realTime: realTimeStats,
          summary: {
            totalDataPoints: trends.length,
            totalRevenue: trends.reduce((sum, t) => sum + t.totalAmount, 0),
            totalPayments: trends.reduce((sum, t) => sum + t.totalPayments, 0),
            averageSuccessRate: trends.length > 0 
              ? trends.reduce((sum, t) => sum + t.successRate, 0) / trends.length 
              : 0,
            periodGrowth: this.calculatePeriodGrowth(trends),
          }
        },
        message: 'Payment trends retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving payment trends:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/payments/subscription-metrics - 구독 지표 (보너스 엔드포인트)
  getSubscriptionMetrics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for subscription metrics');
    }

    try {
      const filters: PaymentAnalyticsFilter = {};

      const subscriptionAnalytics = await this.paymentAnalyticsService.getSubscriptionAnalytics(filters);

      // 구독 통계 추가 정보
      const { SubscriptionService } = await import('../../services/subscription.service');
      const subscriptionService = new SubscriptionService();
      const subscriptionStats = await subscriptionService.getSubscriptionStats();

      logger.info('Subscription metrics retrieved successfully', {
        userId: currentUser?.id,
        totalSubscriptions: subscriptionAnalytics.totalSubscriptions,
        activeSubscriptions: subscriptionAnalytics.activeSubscriptions,
        mrr: subscriptionAnalytics.mrr,
      });

      res.json({
        success: true,
        data: {
          ...subscriptionAnalytics,
          detailedStats: subscriptionStats,
          insights: this.generateSubscriptionInsights(subscriptionAnalytics),
        },
        message: 'Subscription metrics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving subscription metrics:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/analytics/payments/real-time - 실시간 결제 통계 (보너스 엔드포인트)
  getRealTimeStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for real-time stats');
    }

    try {
      const realTimeStats = await this.paymentAnalyticsService.getRealTimePaymentStats();

      res.json({
        success: true,
        data: {
          ...realTimeStats,
          timestamp: new Date().toISOString(),
          refreshInterval: 30000, // 30 seconds
        },
        message: 'Real-time payment stats retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving real-time stats:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        error: error.message,
      });
      throw error;
    }
  });

  // Helper methods

  private async getVendorByUserId(userId: string) {
    try {
      const { AppDataSource } = await import('../../database/connection');
      const vendorRepository = AppDataSource.getRepository('VendorInfo');
      return await vendorRepository.findOne({ where: { userId } });
    } catch (error) {
      logger.error('Error getting vendor by user ID:', error);
      return null;
    }
  }

  private calculatePeriodGrowth(trends: any[]): number {
    if (trends.length < 2) return 0;

    const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
    const secondHalf = trends.slice(Math.floor(trends.length / 2));

    const firstHalfRevenue = firstHalf.reduce((sum, t) => sum + t.totalAmount, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, t) => sum + t.totalAmount, 0);

    if (firstHalfRevenue === 0) return 0;

    return ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100;
  }

  private generateSubscriptionInsights(analytics: any): string[] {
    const insights: string[] = [];

    // 이탈률 분석
    if (analytics.churnRate > 10) {
      insights.push(`High churn rate detected: ${analytics.churnRate.toFixed(1)}%. Consider improving retention strategies.`);
    } else if (analytics.churnRate < 3) {
      insights.push(`Excellent retention with ${analytics.churnRate.toFixed(1)}% churn rate.`);
    }

    // MRR 성장 분석
    if (analytics.subscriptionGrowth && analytics.subscriptionGrowth.length > 1) {
      const latestGrowth = analytics.subscriptionGrowth[analytics.subscriptionGrowth.length - 1];
      const previousGrowth = analytics.subscriptionGrowth[analytics.subscriptionGrowth.length - 2];
      
      const mrrGrowth = ((latestGrowth.mrr - previousGrowth.mrr) / previousGrowth.mrr) * 100;
      
      if (mrrGrowth > 20) {
        insights.push(`Strong MRR growth of ${mrrGrowth.toFixed(1)}% this month.`);
      } else if (mrrGrowth < 0) {
        insights.push(`MRR declined by ${Math.abs(mrrGrowth).toFixed(1)}% - review pricing and retention strategies.`);
      }
    }

    // ARPU 분석
    if (analytics.arpu > 0) {
      if (analytics.arpu < 50) {
        insights.push('Low ARPU suggests opportunity for upselling or premium plans.');
      } else if (analytics.arpu > 200) {
        insights.push('High ARPU indicates strong value delivery to customers.');
      }
    }

    // LTV 분석
    if (analytics.ltv > analytics.arpu * 24) {
      insights.push('Strong customer lifetime value supports aggressive acquisition spending.');
    } else if (analytics.ltv < analytics.arpu * 6) {
      insights.push('Low LTV/ARPU ratio suggests need to improve retention or reduce churn.');
    }

    return insights.slice(0, 5); // 최대 5개 인사이트
  }

  // GET /api/analytics/payments/export - 결제 분석 데이터 내보내기 (보너스)
  exportPaymentAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      format = 'csv',
      type = 'overview',
      startDate,
      endDate
    } = req.query;

    // Check permissions
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for data export');
    }

    // Validate parameters
    const validFormats = ['csv', 'excel', 'json'];
    if (!validFormats.includes(format as string)) {
      throw createValidationError(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    const validTypes = ['overview', 'trends', 'methods', 'subscription'];
    if (!validTypes.includes(type as string)) {
      throw createValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      // Build filters
      const filters: PaymentAnalyticsFilter = {};

      if (startDate) {
        filters.startDate = dayjs(startDate as string).toDate();
      }

      if (endDate) {
        filters.endDate = dayjs(endDate as string).toDate();
      }

      let exportData: any;
      let filename: string;

      switch (type) {
        case 'overview':
          exportData = await this.paymentAnalyticsService.getPaymentOverview(filters);
          filename = `payment-overview-${dayjs().format('YYYY-MM-DD')}`;
          break;
        case 'trends':
          exportData = await this.paymentAnalyticsService.getPaymentTrends(
            filters.startDate || dayjs().subtract(30, 'days').toDate(),
            filters.endDate || new Date(),
            'day',
            filters
          );
          filename = `payment-trends-${dayjs().format('YYYY-MM-DD')}`;
          break;
        case 'methods':
          exportData = await this.paymentAnalyticsService.getPaymentMethodAnalysis(filters);
          filename = `payment-methods-${dayjs().format('YYYY-MM-DD')}`;
          break;
        case 'subscription':
          exportData = await this.paymentAnalyticsService.getSubscriptionAnalytics(filters);
          filename = `subscription-analytics-${dayjs().format('YYYY-MM-DD')}`;
          break;
        default:
          throw createValidationError('Invalid export type');
      }

      // Set response headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
      
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.json(exportData);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.send(this.convertToCSV(exportData));
          break;
        case 'excel':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          // Excel export would require additional library like xlsx
          res.json({ message: 'Excel export not implemented yet', data: exportData });
          break;
        default:
          res.json(exportData);
      }

      logger.info('Payment analytics exported', {
        userId: currentUser?.id,
        type,
        format,
        filename,
      });

    } catch (error) {
      logger.error('Error exporting payment analytics:', {
        userId: currentUser?.id,
        type,
        format,
        error: error.message,
      });
      throw error;
    }
  });

  private convertToCSV(data: any): string {
    // 간단한 CSV 변환 로직
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          // 문자열에 쉼표가 있으면 따옴표로 감싸기
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      );
      
      return [csvHeaders, ...csvRows].join('\n');
    } else {
      // 객체인 경우 key-value 형태로 변환
      const rows = Object.entries(data).map(([key, value]) => `${key},${value}`);
      return ['Key,Value', ...rows].join('\n');
    }
  }
}