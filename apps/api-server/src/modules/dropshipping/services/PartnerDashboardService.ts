/**
 * PartnerDashboardService
 * NextGen V2 - Dropshipping Module
 * Partner metrics, commissions, and performance tracking
 *
 * Provides partner-specific statistics including:
 * - Total clicks, orders, revenue, commissions
 * - Conversion rates and performance metrics
 * - Earnings breakdown (available, pending, paid)
 */

import AppDataSource from '../../../database/connection.js';
import { Commission, CommissionStatus } from '../entities/Commission.js';
import { ConversionEvent, ConversionStatus } from '../../../entities/ConversionEvent.js';
import { Partner } from '../entities/Partner.js';
import { Between } from 'typeorm';
import logger from '../../../utils/logger.js';
import {
  DateRangeFilter,
  PaginationParams,
  DashboardMetaDto,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import { dashboardRangeService, type ParsedDateRange } from './DashboardRangeService.js';

export interface PartnerDashboardSummary {
  totalClicks: number;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  averageOrderValue: number;
  earnings: {
    available: number; // CONFIRMED commissions
    pending: number;   // PENDING commissions
    paid: number;      // PAID commissions
  };
}

export interface PartnerPerformanceMetrics {
  clicksThisMonth: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
  commissionThisMonth: number;
  conversionRateThisMonth: number;
}

export class PartnerDashboardService {
  private commissionRepository = AppDataSource.getRepository(Commission);
  private conversionRepository = AppDataSource.getRepository(ConversionEvent);
  private partnerRepository = AppDataSource.getRepository(Partner);

  /**
   * Get dashboard summary for a partner
   */
  async getSummaryForPartner(
    partnerId: string,
    dateRange?: DateRangeFilter | ParsedDateRange
  ): Promise<PartnerDashboardSummary> {
    try {
      // Parse date range
      let parsedRange: ParsedDateRange;
      if (dateRange && 'range' in dateRange) {
        parsedRange = dateRange as ParsedDateRange;
      } else if (dateRange && ('from' in dateRange || 'to' in dateRange)) {
        parsedRange = {
          startDate: (dateRange as DateRangeFilter).from || new Date('2020-01-01'),
          endDate: (dateRange as DateRangeFilter).to || new Date(),
          range: 'custom'
        };
      } else {
        parsedRange = dashboardRangeService.parseDateRange({});
      }

      // Get conversion events (clicks)
      const conversionStats = await this.conversionRepository
        .createQueryBuilder('conversion')
        .select('COUNT(*)', 'totalClicks')
        .addSelect('COUNT(CASE WHEN conversion.status = :confirmed THEN 1 END)', 'totalOrders')
        .addSelect('SUM(CASE WHEN conversion.status = :confirmed THEN conversion.orderAmount ELSE 0 END)', 'totalRevenue')
        .where('conversion.partnerId = :partnerId', { partnerId })
        .andWhere('conversion.eventDate BETWEEN :startDate AND :endDate', {
          startDate: parsedRange.startDate,
          endDate: parsedRange.endDate
        })
        .setParameters({ confirmed: ConversionStatus.CONFIRMED })
        .getRawOne();

      // Get commission earnings
      const earningsStats = await this.commissionRepository
        .createQueryBuilder('commission')
        .select('SUM(CASE WHEN commission.status = :pending THEN commission.commissionAmount ELSE 0 END)', 'pending')
        .addSelect('SUM(CASE WHEN commission.status = :confirmed THEN commission.commissionAmount ELSE 0 END)', 'available')
        .addSelect('SUM(CASE WHEN commission.status = :paid THEN commission.commissionAmount ELSE 0 END)', 'paid')
        .addSelect('SUM(commission.commissionAmount)', 'totalCommission')
        .where('commission.partnerId = :partnerId', { partnerId })
        .andWhere('commission.createdAt BETWEEN :startDate AND :endDate', {
          startDate: parsedRange.startDate,
          endDate: parsedRange.endDate
        })
        .setParameters({
          pending: CommissionStatus.PENDING,
          confirmed: CommissionStatus.CONFIRMED,
          paid: CommissionStatus.PAID
        })
        .getRawOne();

      const totalClicks = parseInt(conversionStats.totalClicks) || 0;
      const totalOrders = parseInt(conversionStats.totalOrders) || 0;
      const totalRevenue = parseFloat(conversionStats.totalRevenue) || 0;
      const totalCommission = parseFloat(earningsStats.totalCommission) || 0;

      const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const summary: PartnerDashboardSummary = {
        totalClicks,
        totalOrders,
        totalRevenue,
        totalCommission,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        earnings: {
          pending: parseFloat(earningsStats.pending) || 0,
          available: parseFloat(earningsStats.available) || 0,
          paid: parseFloat(earningsStats.paid) || 0
        }
      };

      logger.debug('[PartnerDashboardService] Summary calculated', {
        partnerId,
        summary
      });

      return summary;
    } catch (error: any) {
      logger.error('[PartnerDashboardService] Error getting summary', {
        error: error.message,
        partnerId
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for current month
   */
  async getMonthlyPerformance(partnerId: string): Promise<PartnerPerformanceMetrics> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const summary = await this.getSummaryForPartner(partnerId, {
        from: monthStart,
        to: monthEnd
      });

      return {
        clicksThisMonth: summary.totalClicks,
        ordersThisMonth: summary.totalOrders,
        revenueThisMonth: summary.totalRevenue,
        commissionThisMonth: summary.totalCommission,
        conversionRateThisMonth: summary.conversionRate
      };
    } catch (error: any) {
      logger.error('[PartnerDashboardService] Error getting monthly performance', {
        error: error.message,
        partnerId
      });
      throw error;
    }
  }
}
