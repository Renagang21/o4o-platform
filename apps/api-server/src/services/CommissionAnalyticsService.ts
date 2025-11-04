import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Commission, CommissionStatus } from '../entities/Commission.js';
import { ConversionEvent } from '../entities/ConversionEvent.js';
import { ReferralClick } from '../entities/ReferralClick.js';
import { CommissionPolicy } from '../entities/CommissionPolicy.js';
import { Partner } from '../entities/Partner.js';

/**
 * Commission Analytics Service
 *
 * Provides business intelligence and analytics for the commission system:
 * - Funnel metrics (click → conversion → commission rates)
 * - Policy performance analysis (ROI, refund rates)
 * - Partner tier analytics (performance, tier recommendations)
 * - KPI calculations
 *
 * @service Phase 2.2
 */

/**
 * Funnel Metrics Interface
 */
export interface FunnelMetrics {
  // Raw counts
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;

  // Conversion rates
  clickToConversionRate: number;      // (conversions / clicks) * 100
  conversionToCommissionRate: number; // (commissions / conversions) * 100
  clickToCommissionRate: number;      // (commissions / clicks) * 100

  // Financial metrics
  totalRevenue: number;               // Sum of all order values
  totalCommissionAmount: number;      // Sum of all commission amounts
  avgOrderValue: number;              // Average order value
  avgCommissionAmount: number;        // Average commission amount
  effectiveCommissionRate: number;    // (total commission / total revenue) * 100

  // Status breakdown
  statusBreakdown: {
    pending: number;
    confirmed: number;
    paid: number;
    cancelled: number;
  };
}

/**
 * Policy Performance Interface
 */
export interface PolicyPerformance {
  policyId: string;
  policyName: string;
  policyType: string;

  // Volume metrics
  totalCommissions: number;
  totalAmount: number;
  avgCommission: number;

  // Quality metrics
  refundCount: number;
  refundRate: number;              // (refunded / total) * 100
  confirmationRate: number;        // (confirmed+paid / total) * 100

  // Financial metrics
  totalRevenue: number;            // From conversions using this policy
  roi: number;                     // (total commission / total revenue) * 100

  // Performance ranking
  rank?: number;
}

/**
 * Partner Tier Analytics Interface
 */
export interface PartnerTierAnalytics {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  currentTier: string;

  // Volume metrics
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;

  // Quality metrics
  conversionRate: number;          // (conversions / clicks) * 100
  commissionRate: number;          // (commissions / conversions) * 100

  // Financial metrics
  totalEarnings: number;
  avgCommissionAmount: number;
  totalRevenue: number;            // Order value from their referrals

  // Performance indicators
  refundCount: number;
  refundRate: number;

  // Tier recommendation
  recommendedTier: string;
  tierUpgradeEligible: boolean;
  tierUpgradeReason?: string;
}

/**
 * KPI Summary Interface
 */
export interface KPISummary {
  period: {
    from: Date;
    to: Date;
  };

  // Top-level metrics
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  totalRevenue: number;
  totalCommissionPaid: number;

  // Rates
  overallConversionRate: number;
  overallCommissionRate: number;

  // Top performers
  topPartner: {
    id: string;
    name: string;
    earnings: number;
  } | null;

  topPolicy: {
    id: string;
    name: string;
    commissions: number;
  } | null;

  topProduct: {
    id: string;
    name: string;
    conversions: number;
  } | null;

  // Pending actions
  pendingCommissions: number;
  pendingCommissionAmount: number;
  commissionsReadyForPayment: number;
  paymentsReadyAmount: number;
}

export class CommissionAnalyticsService {
  private commissionRepo: Repository<Commission>;
  private conversionRepo: Repository<ConversionEvent>;
  private clickRepo: Repository<ReferralClick>;
  private policyRepo: Repository<CommissionPolicy>;
  private partnerRepo: Repository<Partner>;

  constructor() {
    this.commissionRepo = AppDataSource.getRepository(Commission);
    this.conversionRepo = AppDataSource.getRepository(ConversionEvent);
    this.clickRepo = AppDataSource.getRepository(ReferralClick);
    this.policyRepo = AppDataSource.getRepository(CommissionPolicy);
    this.partnerRepo = AppDataSource.getRepository(Partner);
  }

  /**
   * Get funnel metrics for a date range
   *
   * Calculates click → conversion → commission funnel with conversion rates.
   *
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Funnel metrics
   */
  async getFunnelMetrics(dateFrom: Date, dateTo: Date): Promise<FunnelMetrics> {
    // Count clicks
    const totalClicks = await this.clickRepo.count({
      where: { timestamp: Between(dateFrom, dateTo) }
    });

    // Count conversions and get revenue
    const conversionsData = await this.conversionRepo
      .createQueryBuilder('conversion')
      .select('COUNT(conversion.id)', 'count')
      .addSelect('SUM(conversion.orderValue)', 'totalRevenue')
      .addSelect('AVG(conversion.orderValue)', 'avgOrderValue')
      .where('conversion.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    const totalConversions = parseInt(conversionsData.count) || 0;
    const totalRevenue = parseFloat(conversionsData.totalRevenue) || 0;
    const avgOrderValue = parseFloat(conversionsData.avgOrderValue) || 0;

    // Get commission data with status breakdown
    const commissionsData = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('COUNT(commission.id)', 'count')
      .addSelect('SUM(commission.commissionAmount)', 'totalAmount')
      .addSelect('AVG(commission.commissionAmount)', 'avgAmount')
      .addSelect('COUNT(CASE WHEN commission.status = :pending THEN 1 END)', 'pending')
      .addSelect('COUNT(CASE WHEN commission.status = :confirmed THEN 1 END)', 'confirmed')
      .addSelect('COUNT(CASE WHEN commission.status = :paid THEN 1 END)', 'paid')
      .addSelect('COUNT(CASE WHEN commission.status = :cancelled THEN 1 END)', 'cancelled')
      .where('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .setParameter('pending', CommissionStatus.PENDING)
      .setParameter('confirmed', CommissionStatus.CONFIRMED)
      .setParameter('paid', CommissionStatus.PAID)
      .setParameter('cancelled', CommissionStatus.CANCELLED)
      .getRawOne();

    const totalCommissions = parseInt(commissionsData.count) || 0;
    const totalCommissionAmount = parseFloat(commissionsData.totalAmount) || 0;
    const avgCommissionAmount = parseFloat(commissionsData.avgAmount) || 0;

    // Calculate conversion rates
    const clickToConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const conversionToCommissionRate = totalConversions > 0 ? (totalCommissions / totalConversions) * 100 : 0;
    const clickToCommissionRate = totalClicks > 0 ? (totalCommissions / totalClicks) * 100 : 0;
    const effectiveCommissionRate = totalRevenue > 0 ? (totalCommissionAmount / totalRevenue) * 100 : 0;

    return {
      totalClicks,
      totalConversions,
      totalCommissions,
      clickToConversionRate: this.roundToTwo(clickToConversionRate),
      conversionToCommissionRate: this.roundToTwo(conversionToCommissionRate),
      clickToCommissionRate: this.roundToTwo(clickToCommissionRate),
      totalRevenue,
      totalCommissionAmount,
      avgOrderValue,
      avgCommissionAmount,
      effectiveCommissionRate: this.roundToTwo(effectiveCommissionRate),
      statusBreakdown: {
        pending: parseInt(commissionsData.pending) || 0,
        confirmed: parseInt(commissionsData.confirmed) || 0,
        paid: parseInt(commissionsData.paid) || 0,
        cancelled: parseInt(commissionsData.cancelled) || 0
      }
    };
  }

  /**
   * Get policy performance analysis
   *
   * Analyzes performance of each commission policy including ROI and refund rates.
   *
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Array of policy performance metrics
   */
  async getPolicyPerformance(dateFrom: Date, dateTo: Date): Promise<PolicyPerformance[]> {
    // Get all active policies
    const policies = await this.policyRepo.find({
      where: { isActive: true }
    });

    // Calculate performance for each policy
    const performanceData = await Promise.all(
      policies.map(async (policy) => {
        // Get commission stats for this policy
        const commissionsData = await this.commissionRepo
          .createQueryBuilder('commission')
          .select('COUNT(commission.id)', 'count')
          .addSelect('SUM(commission.commissionAmount)', 'totalAmount')
          .addSelect('AVG(commission.commissionAmount)', 'avgAmount')
          .addSelect('COUNT(CASE WHEN commission.status = :cancelled THEN 1 END)', 'refunded')
          .addSelect('COUNT(CASE WHEN commission.status IN (:...confirmedStatuses) THEN 1 END)', 'confirmed')
          .where('commission.policyId = :policyId', { policyId: policy.id })
          .andWhere('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
          .setParameter('cancelled', CommissionStatus.CANCELLED)
          .setParameter('confirmedStatuses', [CommissionStatus.CONFIRMED, CommissionStatus.PAID])
          .getRawOne();

        const totalCommissions = parseInt(commissionsData.count) || 0;
        const totalAmount = parseFloat(commissionsData.totalAmount) || 0;
        const avgCommission = parseFloat(commissionsData.avgAmount) || 0;
        const refundCount = parseInt(commissionsData.refunded) || 0;
        const confirmedCount = parseInt(commissionsData.confirmed) || 0;

        // Get total revenue from conversions using this policy
        const revenueData = await this.commissionRepo
          .createQueryBuilder('commission')
          .leftJoin('commission.conversion', 'conversion')
          .select('SUM(conversion.orderValue)', 'totalRevenue')
          .where('commission.policyId = :policyId', { policyId: policy.id })
          .andWhere('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
          .getRawOne();

        const totalRevenue = parseFloat(revenueData.totalRevenue) || 0;

        // Calculate metrics
        const refundRate = totalCommissions > 0 ? (refundCount / totalCommissions) * 100 : 0;
        const confirmationRate = totalCommissions > 0 ? (confirmedCount / totalCommissions) * 100 : 0;
        const roi = totalRevenue > 0 ? (totalAmount / totalRevenue) * 100 : 0;

        return {
          policyId: policy.id,
          policyName: policy.name,
          policyType: policy.type,
          totalCommissions,
          totalAmount,
          avgCommission,
          refundCount,
          refundRate: this.roundToTwo(refundRate),
          confirmationRate: this.roundToTwo(confirmationRate),
          totalRevenue,
          roi: this.roundToTwo(roi)
        };
      })
    );

    // Sort by total amount and add ranking
    performanceData.sort((a, b) => b.totalAmount - a.totalAmount);
    performanceData.forEach((data, index) => {
      data.rank = index + 1;
    });

    return performanceData;
  }

  /**
   * Get partner tier analytics
   *
   * Analyzes partner performance and provides tier upgrade recommendations.
   *
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Array of partner analytics
   */
  async getPartnerTierAnalytics(dateFrom: Date, dateTo: Date): Promise<PartnerTierAnalytics[]> {
    // Get all active partners
    const partners = await this.partnerRepo.find({
      where: { isActive: true }
    });

    // Calculate analytics for each partner
    const analytics = await Promise.all(
      partners.map(async (partner) => {
        // Count clicks
        const totalClicks = await this.clickRepo.count({
          where: {
            partnerId: partner.id,
            timestamp: Between(dateFrom, dateTo)
          }
        });

        // Get conversion data
        const conversionsData = await this.conversionRepo
          .createQueryBuilder('conversion')
          .select('COUNT(conversion.id)', 'count')
          .addSelect('SUM(conversion.orderValue)', 'totalRevenue')
          .where('conversion.partnerId = :partnerId', { partnerId: partner.id })
          .andWhere('conversion.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
          .getRawOne();

        const totalConversions = parseInt(conversionsData.count) || 0;
        const totalRevenue = parseFloat(conversionsData.totalRevenue) || 0;

        // Get commission data
        const commissionsData = await this.commissionRepo
          .createQueryBuilder('commission')
          .select('COUNT(commission.id)', 'count')
          .addSelect('SUM(commission.commissionAmount)', 'totalEarnings')
          .addSelect('AVG(commission.commissionAmount)', 'avgAmount')
          .addSelect('COUNT(CASE WHEN commission.status = :cancelled THEN 1 END)', 'refunded')
          .where('commission.partnerId = :partnerId', { partnerId: partner.id })
          .andWhere('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
          .andWhere('commission.status != :cancelled', { cancelled: CommissionStatus.CANCELLED })
          .setParameter('cancelled', CommissionStatus.CANCELLED)
          .getRawOne();

        const totalCommissions = parseInt(commissionsData.count) || 0;
        const totalEarnings = parseFloat(commissionsData.totalEarnings) || 0;
        const avgCommissionAmount = parseFloat(commissionsData.avgAmount) || 0;
        const refundCount = parseInt(commissionsData.refunded) || 0;

        // Calculate rates
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
        const commissionRate = totalConversions > 0 ? (totalCommissions / totalConversions) * 100 : 0;
        const refundRate = totalCommissions > 0 ? (refundCount / totalCommissions) * 100 : 0;

        // Determine recommended tier
        const tierRecommendation = this.calculateTierRecommendation(
          partner.tier || 'bronze',
          totalEarnings,
          conversionRate,
          refundRate,
          totalCommissions
        );

        return {
          partnerId: partner.id,
          partnerName: partner.name || partner.email,
          partnerEmail: partner.email,
          currentTier: partner.tier || 'bronze',
          totalClicks,
          totalConversions,
          totalCommissions,
          conversionRate: this.roundToTwo(conversionRate),
          commissionRate: this.roundToTwo(commissionRate),
          totalEarnings,
          avgCommissionAmount,
          totalRevenue,
          refundCount,
          refundRate: this.roundToTwo(refundRate),
          recommendedTier: tierRecommendation.tier,
          tierUpgradeEligible: tierRecommendation.eligible,
          tierUpgradeReason: tierRecommendation.reason
        };
      })
    );

    // Sort by total earnings (descending)
    analytics.sort((a, b) => b.totalEarnings - a.totalEarnings);

    return analytics;
  }

  /**
   * Get KPI summary
   *
   * Provides high-level KPIs and pending actions for dashboard overview.
   *
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns KPI summary
   */
  async getKPISummary(dateFrom: Date, dateTo: Date): Promise<KPISummary> {
    // Get funnel metrics
    const funnel = await this.getFunnelMetrics(dateFrom, dateTo);

    // Find top partner
    const topPartnerData = await this.commissionRepo
      .createQueryBuilder('commission')
      .leftJoin('commission.partner', 'partner')
      .select('commission.partnerId', 'partnerId')
      .addSelect('partner.name', 'partnerName')
      .addSelect('partner.email', 'partnerEmail')
      .addSelect('SUM(commission.commissionAmount)', 'earnings')
      .where('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .andWhere('commission.status != :cancelled', { cancelled: CommissionStatus.CANCELLED })
      .groupBy('commission.partnerId')
      .addGroupBy('partner.name')
      .addGroupBy('partner.email')
      .orderBy('earnings', 'DESC')
      .limit(1)
      .getRawOne();

    // Find top policy
    const topPolicyData = await this.commissionRepo
      .createQueryBuilder('commission')
      .leftJoin('commission.policy', 'policy')
      .select('commission.policyId', 'policyId')
      .addSelect('policy.name', 'policyName')
      .addSelect('COUNT(commission.id)', 'commissions')
      .where('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('commission.policyId')
      .addGroupBy('policy.name')
      .orderBy('commissions', 'DESC')
      .limit(1)
      .getRawOne();

    // Find top product
    const topProductData = await this.conversionRepo
      .createQueryBuilder('conversion')
      .leftJoin('conversion.product', 'product')
      .select('conversion.productId', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('COUNT(conversion.id)', 'conversions')
      .where('conversion.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('conversion.productId')
      .addGroupBy('product.name')
      .orderBy('conversions', 'DESC')
      .limit(1)
      .getRawOne();

    // Get pending commissions
    const pendingData = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('COUNT(commission.id)', 'count')
      .addSelect('SUM(commission.commissionAmount)', 'amount')
      .where('commission.status = :pending', { pending: CommissionStatus.PENDING })
      .getRawOne();

    // Get commissions ready for payment (confirmed status)
    const readyForPaymentData = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('COUNT(commission.id)', 'count')
      .addSelect('SUM(commission.commissionAmount)', 'amount')
      .where('commission.status = :confirmed', { confirmed: CommissionStatus.CONFIRMED })
      .getRawOne();

    // Get total commission paid
    const paidData = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('SUM(commission.commissionAmount)', 'amount')
      .where('commission.status = :paid', { paid: CommissionStatus.PAID })
      .andWhere('commission.paidAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    return {
      period: { from: dateFrom, to: dateTo },
      totalClicks: funnel.totalClicks,
      totalConversions: funnel.totalConversions,
      totalCommissions: funnel.totalCommissions,
      totalRevenue: funnel.totalRevenue,
      totalCommissionPaid: parseFloat(paidData.amount) || 0,
      overallConversionRate: funnel.clickToConversionRate,
      overallCommissionRate: funnel.effectiveCommissionRate,
      topPartner: topPartnerData ? {
        id: topPartnerData.partnerId,
        name: topPartnerData.partnerName || topPartnerData.partnerEmail,
        earnings: parseFloat(topPartnerData.earnings) || 0
      } : null,
      topPolicy: topPolicyData ? {
        id: topPolicyData.policyId,
        name: topPolicyData.policyName,
        commissions: parseInt(topPolicyData.commissions) || 0
      } : null,
      topProduct: topProductData ? {
        id: topProductData.productId,
        name: topProductData.productName,
        conversions: parseInt(topProductData.conversions) || 0
      } : null,
      pendingCommissions: parseInt(pendingData.count) || 0,
      pendingCommissionAmount: parseFloat(pendingData.amount) || 0,
      commissionsReadyForPayment: parseInt(readyForPaymentData.count) || 0,
      paymentsReadyAmount: parseFloat(readyForPaymentData.amount) || 0
    };
  }

  /**
   * Calculate tier recommendation based on performance metrics
   *
   * Tier criteria:
   * - Bronze: Default tier
   * - Silver: $5,000+ earnings, 3%+ conversion rate, <10% refund rate
   * - Gold: $10,000+ earnings, 5%+ conversion rate, <5% refund rate
   * - Platinum: $25,000+ earnings, 7%+ conversion rate, <3% refund rate
   *
   * @private
   */
  private calculateTierRecommendation(
    currentTier: string,
    totalEarnings: number,
    conversionRate: number,
    refundRate: number,
    totalCommissions: number
  ): { tier: string; eligible: boolean; reason?: string } {
    // Minimum commissions threshold (at least 10 commissions to evaluate)
    if (totalCommissions < 10) {
      return {
        tier: currentTier,
        eligible: false,
        reason: 'Insufficient data (minimum 10 commissions required)'
      };
    }

    // Platinum tier criteria
    if (totalEarnings >= 25000 && conversionRate >= 7 && refundRate < 3) {
      return {
        tier: 'platinum',
        eligible: currentTier !== 'platinum',
        reason: currentTier !== 'platinum' ? 'Excellent performance across all metrics' : undefined
      };
    }

    // Gold tier criteria
    if (totalEarnings >= 10000 && conversionRate >= 5 && refundRate < 5) {
      return {
        tier: 'gold',
        eligible: currentTier === 'bronze' || currentTier === 'silver',
        reason: currentTier !== 'gold' ? 'Strong earnings and conversion rate' : undefined
      };
    }

    // Silver tier criteria
    if (totalEarnings >= 5000 && conversionRate >= 3 && refundRate < 10) {
      return {
        tier: 'silver',
        eligible: currentTier === 'bronze',
        reason: currentTier === 'bronze' ? 'Good performance, ready for upgrade' : undefined
      };
    }

    // Default to bronze
    return {
      tier: 'bronze',
      eligible: false,
      reason: undefined
    };
  }

  /**
   * Round number to 2 decimal places
   *
   * @private
   */
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }
}
