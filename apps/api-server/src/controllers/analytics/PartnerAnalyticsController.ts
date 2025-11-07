import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Partner } from '../../entities/Partner.js';
import { ReferralClick, ClickStatus } from '../../entities/ReferralClick.js';
import { ConversionEvent, ConversionStatus } from '../../entities/ConversionEvent.js';
import { Commission, CommissionStatus } from '../../entities/Commission.js';
import { PaymentSettlement, SettlementStatus, RecipientType } from '../../entities/PaymentSettlement.js';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

/**
 * Partner Analytics Controller
 * Phase 7: Provides performance metrics and insights for partners
 */
export class PartnerAnalyticsController {

  /**
   * Helper: Get partner ID from request
   * Resolves "me" to current user's partner ID
   */
  private async resolvePartnerId(req: Request): Promise<string | null> {
    const { partnerId } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // If "me" or not specified, resolve to current user's partner
    if (!partnerId || partnerId === 'me') {
      const partnerRepo = AppDataSource.getRepository(Partner);
      const partner = await partnerRepo.findOne({ where: { userId } });
      return partner?.id || null;
    }

    // If admin requests specific partner, verify permission
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const partnerRepo = AppDataSource.getRepository(Partner);
      const partner = await partnerRepo.findOne({ where: { id: partnerId as string } });

      if (!partner || partner.userId !== userId) {
        return null; // Unauthorized
      }
    }

    return partnerId as string;
  }

  /**
   * Helper: Parse date range from query
   */
  private parseDateRange(req: Request): { start: Date; end: Date } {
    const { from, to, range } = req.query;

    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (from && to) {
      start = new Date(from as string);
      end = new Date(to as string);
    } else if (range) {
      switch (range) {
        case 'last_7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'this_month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          start = lastMonth;
          end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Default: last 30 days
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  /**
   * GET /api/v1/analytics/partner/summary
   * Returns aggregated KPI summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = await this.resolvePartnerId(req);

      if (!partnerId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ERR_ANALYTICS_FORBIDDEN',
            message: 'You do not have permission to view this partner\'s analytics',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { start, end } = this.parseDateRange(req);

      // Calculate previous period for comparison
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousEnd = new Date(start.getTime() - 1);

      // Get repositories
      const clickRepo = AppDataSource.getRepository(ReferralClick);
      const conversionRepo = AppDataSource.getRepository(ConversionEvent);
      const commissionRepo = AppDataSource.getRepository(Commission);
      const settlementRepo = AppDataSource.getRepository(PaymentSettlement);

      // Current period metrics
      const [
        currentClicks,
        currentConversions,
        currentCommissions,
        currentSettlements
      ] = await Promise.all([
        clickRepo.count({
          where: {
            partnerId,
            status: ClickStatus.VALID,
            createdAt: Between(start, end)
          }
        }),
        conversionRepo.count({
          where: {
            partnerId,
            status: ConversionStatus.CONFIRMED,
            createdAt: Between(start, end)
          }
        }),
        commissionRepo.find({
          where: {
            partnerId,
            status: CommissionStatus.CONFIRMED,
            createdAt: Between(start, end)
          }
        }),
        settlementRepo.find({
          where: {
            recipientType: RecipientType.PARTNER,
            recipientId: partnerId,
            createdAt: Between(start, end)
          }
        })
      ]);

      // Previous period for comparison
      const [previousClicks, previousConversions] = await Promise.all([
        clickRepo.count({
          where: {
            partnerId,
            status: ClickStatus.VALID,
            createdAt: Between(previousStart, previousEnd)
          }
        }),
        conversionRepo.count({
          where: {
            partnerId,
            status: ConversionStatus.CONFIRMED,
            createdAt: Between(previousStart, previousEnd)
          }
        })
      ]);

      // Calculate order amounts
      const conversions = await conversionRepo.find({
        where: {
          partnerId,
          status: ConversionStatus.CONFIRMED,
          createdAt: Between(start, end)
        }
      });

      const totalOrderValue = conversions.reduce((sum, c) => sum + Number(c.orderAmount || 0), 0);
      const aov = currentConversions > 0 ? totalOrderValue / currentConversions : 0;

      // Commission calculations
      const confirmedCommissionAmount = currentCommissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
      const epc = currentClicks > 0 ? confirmedCommissionAmount / currentClicks : 0;

      // Settlement calculations
      const paidSettlements = currentSettlements.filter(s => s.status === SettlementStatus.COMPLETED);
      const pendingSettlements = currentSettlements.filter(s =>
        s.status === SettlementStatus.PENDING || s.status === SettlementStatus.SCHEDULED || s.status === SettlementStatus.PROCESSING
      );

      const paidAmount = paidSettlements.reduce((sum, s) => sum + Number(s.netAmount), 0);
      const pendingAmount = pendingSettlements.reduce((sum, s) => sum + Number(s.netAmount), 0);
      const paidRate = confirmedCommissionAmount > 0 ? (paidAmount / confirmedCommissionAmount) * 100 : 0;

      // CVR calculation
      const cvr = currentClicks > 0 ? (currentConversions / currentClicks) * 100 : 0;

      // Calculate changes
      const clicksChange = previousClicks > 0 ? ((currentClicks - previousClicks) / previousClicks) * 100 : 0;
      const conversionsChange = previousConversions > 0 ? ((currentConversions - previousConversions) / previousConversions) * 100 : 0;

      // Returning customer calculation
      const uniqueCustomers = new Set(conversions.map(c => c.customerId).filter(Boolean));
      const customerConversionCounts = new Map<string, number>();
      conversions.forEach(c => {
        if (c.customerId) {
          customerConversionCounts.set(c.customerId, (customerConversionCounts.get(c.customerId) || 0) + 1);
        }
      });
      const returningCount = Array.from(customerConversionCounts.values()).filter(count => count > 1).length;
      const returningRatio = currentConversions > 0 ? (returningCount / currentConversions) * 100 : 0;

      res.json({
        success: true,
        data: {
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
            days: periodDays
          },
          metrics: {
            clicks: {
              value: currentClicks,
              change: clicksChange,
              changeType: clicksChange >= 0 ? 'increase' : 'decrease'
            },
            conversions: {
              value: currentConversions,
              change: conversionsChange,
              changeType: conversionsChange >= 0 ? 'increase' : 'decrease'
            },
            cvr: {
              value: Number(cvr.toFixed(2)),
              unit: 'percent',
              change: 0, // Simplified - would need previous CVR
              changeType: 'neutral'
            },
            aov: {
              value: Math.round(aov),
              unit: 'KRW',
              change: 0,
              changeType: 'neutral'
            },
            epc: {
              value: Number(epc.toFixed(2)),
              unit: 'KRW',
              change: 0,
              changeType: 'neutral'
            },
            pendingExposure: {
              value: Math.round(pendingAmount),
              unit: 'KRW',
              breakdown: {
                scheduled: Math.round(pendingSettlements.filter(s => s.status === SettlementStatus.SCHEDULED).reduce((sum, s) => sum + Number(s.netAmount), 0)),
                processing: Math.round(pendingSettlements.filter(s => s.status === SettlementStatus.PROCESSING).reduce((sum, s) => sum + Number(s.netAmount), 0)),
                pending: Math.round(pendingSettlements.filter(s => s.status === SettlementStatus.PENDING).reduce((sum, s) => sum + Number(s.netAmount), 0))
              }
            },
            paidRate: {
              value: Number(paidRate.toFixed(2)),
              unit: 'percent',
              amounts: {
                confirmed: Math.round(confirmedCommissionAmount),
                paid: Math.round(paidAmount)
              }
            },
            returningRatio: {
              value: Number(returningRatio.toFixed(2)),
              unit: 'percent',
              breakdown: {
                returning: returningCount,
                total: currentConversions
              }
            }
          },
          comparison: {
            previousPeriod: {
              start: previousStart.toISOString(),
              end: previousEnd.toISOString()
            }
          }
        },
        metadata: {
          timezone: 'UTC',
          cacheHit: false,
          computedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ERR_ANALYTICS_INTERNAL',
          message: 'Failed to compute analytics summary',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/v1/analytics/partner/timeseries
   * Returns time-series data for charts
   */
  async getTimeseries(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = await this.resolvePartnerId(req);

      if (!partnerId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ERR_ANALYTICS_FORBIDDEN',
            message: 'You do not have permission to view this partner\'s analytics',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { metric, interval = 'day', cumulative = false } = req.query;
      const { start, end } = this.parseDateRange(req);

      if (!metric) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ERR_ANALYTICS_INVALID_PARAMS',
            message: 'Metric parameter is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      let dataPoints: any[] = [];
      let unit = '';

      if (metric === 'clicks') {
        const clickRepo = AppDataSource.getRepository(ReferralClick);
        const clicks = await clickRepo.find({
          where: {
            partnerId,
            status: ClickStatus.VALID,
            createdAt: Between(start, end)
          },
          order: { createdAt: 'ASC' }
        });

        // Group by interval
        const grouped = this.groupByInterval(clicks, 'createdAt', interval as string);
        dataPoints = grouped;
        unit = 'count';

      } else if (metric === 'conversions') {
        const conversionRepo = AppDataSource.getRepository(ConversionEvent);
        const conversions = await conversionRepo.find({
          where: {
            partnerId,
            status: ConversionStatus.CONFIRMED,
            createdAt: Between(start, end)
          },
          order: { createdAt: 'ASC' }
        });

        const grouped = this.groupByInterval(conversions, 'createdAt', interval as string);
        dataPoints = grouped;
        unit = 'count';

      } else if (metric === 'commission') {
        const commissionRepo = AppDataSource.getRepository(Commission);
        const commissions = await commissionRepo.find({
          where: {
            partnerId,
            status: CommissionStatus.CONFIRMED,
            createdAt: Between(start, end)
          },
          order: { createdAt: 'ASC' }
        });

        const grouped = this.groupByIntervalWithSum(commissions, 'createdAt', 'commissionAmount', interval as string);
        dataPoints = grouped;
        unit = 'KRW';
      }

      // Add cumulative if requested
      if (cumulative) {
        let sum = 0;
        dataPoints = dataPoints.map(point => {
          sum += point.value;
          return { ...point, cumulative: sum };
        });
      }

      // Calculate summary
      const values = dataPoints.map(p => p.value);
      const summary = {
        total: values.reduce((a, b) => a + b, 0),
        average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        dataPointsCount: dataPoints.length
      };

      res.json({
        success: true,
        data: {
          metric,
          interval,
          unit,
          period: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          dataPoints,
          summary
        },
        metadata: {
          timezone: 'UTC',
          cacheHit: false,
          computedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching timeseries:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ERR_ANALYTICS_INTERNAL',
          message: 'Failed to compute timeseries data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /api/v1/analytics/partner/funnel
   * Returns conversion funnel data
   */
  async getFunnel(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = await this.resolvePartnerId(req);

      if (!partnerId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ERR_ANALYTICS_FORBIDDEN',
            message: 'You do not have permission to view this partner\'s analytics',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { start, end } = this.parseDateRange(req);

      const clickRepo = AppDataSource.getRepository(ReferralClick);
      const conversionRepo = AppDataSource.getRepository(ConversionEvent);
      const commissionRepo = AppDataSource.getRepository(Commission);
      const settlementRepo = AppDataSource.getRepository(PaymentSettlement);

      const [clicks, conversions, commissions, settlements] = await Promise.all([
        clickRepo.count({
          where: {
            partnerId,
            status: ClickStatus.VALID,
            createdAt: Between(start, end)
          }
        }),
        conversionRepo.count({
          where: {
            partnerId,
            status: ConversionStatus.CONFIRMED,
            createdAt: Between(start, end)
          }
        }),
        commissionRepo.find({
          where: {
            partnerId,
            status: CommissionStatus.CONFIRMED,
            createdAt: Between(start, end)
          }
        }),
        settlementRepo.find({
          where: {
            recipientType: RecipientType.PARTNER,
            recipientId: partnerId,
            status: SettlementStatus.COMPLETED,
            createdAt: Between(start, end)
          }
        })
      ]);

      const confirmedCommissionCount = commissions.length;
      const confirmedCommissionAmount = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
      const paidCount = settlements.length;
      const paidAmount = settlements.reduce((sum, s) => sum + Number(s.netAmount), 0);

      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const confirmationRate = conversions > 0 ? (confirmedCommissionCount / conversions) * 100 : 0;
      const paymentRate = confirmedCommissionCount > 0 ? (paidCount / confirmedCommissionCount) * 100 : 0;

      res.json({
        success: true,
        data: {
          period: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          stages: [
            {
              name: 'clicks',
              label: '클릭',
              value: clicks,
              rate: 100.00,
              dropoff: 0
            },
            {
              name: 'conversions',
              label: '전환',
              value: conversions,
              rate: Number(conversionRate.toFixed(2)),
              dropoff: clicks - conversions,
              dropoffRate: Number((100 - conversionRate).toFixed(2))
            },
            {
              name: 'confirmed_commission',
              label: '커미션 확정',
              value: confirmedCommissionCount,
              rate: conversions > 0 ? Number(((confirmedCommissionCount / clicks) * 100).toFixed(2)) : 0,
              dropoff: conversions - confirmedCommissionCount,
              dropoffRate: Number((100 - confirmationRate).toFixed(2))
            },
            {
              name: 'paid',
              label: '정산 완료',
              value: paidCount,
              rate: clicks > 0 ? Number(((paidCount / clicks) * 100).toFixed(2)) : 0,
              dropoff: confirmedCommissionCount - paidCount,
              dropoffRate: Number((100 - paymentRate).toFixed(2))
            }
          ],
          totals: {
            clicks,
            conversions,
            confirmedCommission: {
              count: confirmedCommissionCount,
              amount: Math.round(confirmedCommissionAmount),
              currency: 'KRW'
            },
            paid: {
              count: paidCount,
              amount: Math.round(paidAmount),
              currency: 'KRW'
            }
          },
          uniqueCustomers: false,
          breakdown: null
        },
        metadata: {
          timezone: 'UTC',
          cacheHit: false,
          computedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching funnel:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ERR_ANALYTICS_INTERNAL',
          message: 'Failed to compute funnel data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Helper: Group data by time interval
   */
  private groupByInterval(data: any[], dateField: string, interval: string): any[] {
    const grouped = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      const key = this.getIntervalKey(date, interval);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([timestamp, value]) => ({
      timestamp,
      value
    }));
  }

  /**
   * Helper: Group data by interval with sum
   */
  private groupByIntervalWithSum(data: any[], dateField: string, valueField: string, interval: string): any[] {
    const grouped = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      const key = this.getIntervalKey(date, interval);
      grouped.set(key, (grouped.get(key) || 0) + Number(item[valueField]));
    });

    return Array.from(grouped.entries()).map(([timestamp, value]) => ({
      timestamp,
      value: Math.round(value)
    }));
  }

  /**
   * Helper: Get interval key for date
   */
  private getIntervalKey(date: Date, interval: string): string {
    if (interval === 'hour') {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
    } else if (interval === 'day') {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    } else if (interval === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString();
    } else if (interval === 'month') {
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    }
    return date.toISOString();
  }
}
