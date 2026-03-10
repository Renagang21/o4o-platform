/**
 * PartnerCopilotService
 *
 * WO-O4O-PARTNER-COPILOT-DASHBOARD-V1
 *
 * Copilot dashboard data: KPI, product performance, store expansion,
 * commission trends, alerts, AI insight.
 */

import type { DataSource } from 'typeorm';

export interface PartnerCopilotKpi {
  totalCommissions: number;
  totalCommissionAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  activeContracts: number;
  totalReferrals: number;
  recentClicks: number;
}

export interface PartnerProductPerformanceItem {
  productName: string;
  orders: number;
  commissionTotal: number;
  avgCommissionRate: number;
}

export interface PartnerStoreExpansion {
  totalStores: number;
  newStores7d: number;
  contractedStores: number;
}

export interface PartnerCommissionTrend {
  currentAmount: number;
  previousAmount: number;
  currentCount: number;
  previousCount: number;
  growthRate: number;
}

export interface PartnerAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface PartnerAiInsightResult {
  insight: {
    summary: string;
    riskLevel: string;
    recommendedActions: string[];
    confidenceScore: number;
  };
  meta: { provider: string; model: string; durationMs: number };
}

export class PartnerCopilotService {
  constructor(private dataSource: DataSource) {}

  async getKpiSummary(partnerId: string): Promise<PartnerCopilotKpi> {
    // Commission stats
    const commissionRows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "totalCommissions",
         COALESCE(SUM(commission_amount), 0)::int AS "totalCommissionAmount",
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0)::int AS "pendingAmount",
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved'), 0)::int AS "approvedAmount",
         COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0)::int AS "paidAmount"
       FROM partner_commissions
       WHERE partner_id = $1 AND status != 'cancelled'`,
      [partnerId]
    );

    // Active contracts
    const contractRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS "activeContracts"
       FROM neture_seller_partner_contracts
       WHERE partner_id = $1 AND contract_status = 'active'`,
      [partnerId]
    );

    // Referrals
    const referralRows = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS "totalReferrals",
         COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "recentClicks"
       FROM partner_referrals
       WHERE partner_id = $1`,
      [partnerId]
    );

    return {
      totalCommissions: commissionRows[0]?.totalCommissions ?? 0,
      totalCommissionAmount: commissionRows[0]?.totalCommissionAmount ?? 0,
      pendingAmount: commissionRows[0]?.pendingAmount ?? 0,
      approvedAmount: commissionRows[0]?.approvedAmount ?? 0,
      paidAmount: commissionRows[0]?.paidAmount ?? 0,
      activeContracts: contractRows[0]?.activeContracts ?? 0,
      totalReferrals: referralRows[0]?.totalReferrals ?? 0,
      recentClicks: referralRows[0]?.recentClicks ?? 0,
    };
  }

  async getProductPerformance(partnerId: string, limit = 10): Promise<PartnerProductPerformanceItem[]> {
    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(pm.marketing_name, '(이름 없음)') AS "productName",
         COUNT(DISTINCT pc.order_id)::int AS orders,
         COALESCE(SUM(pc.commission_amount), 0)::int AS "commissionTotal",
         ROUND(AVG(pc.commission_rate), 2)::float AS "avgCommissionRate"
       FROM partner_commissions pc
       LEFT JOIN neture_order_items oi ON oi.order_id = pc.order_id
       LEFT JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
       LEFT JOIN product_masters pm ON pm.id = spo.product_master_id
       WHERE pc.partner_id = $1 AND pc.status != 'cancelled'
       GROUP BY pm.marketing_name
       ORDER BY "commissionTotal" DESC
       LIMIT $2`,
      [partnerId, limit]
    );

    return rows.map((r: any) => ({
      productName: r.productName,
      orders: r.orders,
      commissionTotal: r.commissionTotal,
      avgCommissionRate: r.avgCommissionRate ?? 0,
    }));
  }

  async getStoreExpansion(partnerId: string): Promise<PartnerStoreExpansion> {
    // Unique stores from referrals
    const referralStores = await this.dataSource.query(
      `SELECT
         COUNT(DISTINCT store_id)::int AS "totalStores",
         COUNT(DISTINCT store_id) FILTER (
           WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
         )::int AS "newStores7d"
       FROM partner_referrals
       WHERE partner_id = $1 AND store_id IS NOT NULL`,
      [partnerId]
    );

    // Contracted stores
    const contractStores = await this.dataSource.query(
      `SELECT COUNT(DISTINCT seller_id)::int AS "contractedStores"
       FROM neture_seller_partner_contracts
       WHERE partner_id = $1 AND contract_status = 'active'`,
      [partnerId]
    );

    return {
      totalStores: referralStores[0]?.totalStores ?? 0,
      newStores7d: referralStores[0]?.newStores7d ?? 0,
      contractedStores: contractStores[0]?.contractedStores ?? 0,
    };
  }

  async getCommissionTrends(partnerId: string): Promise<PartnerCommissionTrend> {
    const rows = await this.dataSource.query(
      `WITH current_period AS (
         SELECT
           COALESCE(SUM(commission_amount), 0)::int AS amount,
           COUNT(*)::int AS cnt
         FROM partner_commissions
         WHERE partner_id = $1
           AND status != 'cancelled'
           AND created_at >= CURRENT_DATE - INTERVAL '7 days'
       ),
       prev_period AS (
         SELECT
           COALESCE(SUM(commission_amount), 0)::int AS amount,
           COUNT(*)::int AS cnt
         FROM partner_commissions
         WHERE partner_id = $1
           AND status != 'cancelled'
           AND created_at >= CURRENT_DATE - INTERVAL '14 days'
           AND created_at < CURRENT_DATE - INTERVAL '7 days'
       )
       SELECT
         cp.amount AS "currentAmount",
         pp.amount AS "previousAmount",
         cp.cnt AS "currentCount",
         pp.cnt AS "previousCount",
         CASE WHEN pp.amount > 0
           THEN ROUND((cp.amount - pp.amount)::numeric / pp.amount * 100)::int
           ELSE CASE WHEN cp.amount > 0 THEN 100 ELSE 0 END
         END AS "growthRate"
       FROM current_period cp, prev_period pp`,
      [partnerId]
    );

    return {
      currentAmount: rows[0]?.currentAmount ?? 0,
      previousAmount: rows[0]?.previousAmount ?? 0,
      currentCount: rows[0]?.currentCount ?? 0,
      previousCount: rows[0]?.previousCount ?? 0,
      growthRate: rows[0]?.growthRate ?? 0,
    };
  }

  async getAlerts(partnerId: string): Promise<PartnerAlert[]> {
    const alerts: PartnerAlert[] = [];

    // 1. Pending commissions older than 7 days
    const pendingOld = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM partner_commissions
       WHERE partner_id = $1
         AND status = 'pending'
         AND created_at < CURRENT_DATE - INTERVAL '7 days'`,
      [partnerId]
    );
    if (pendingOld[0]?.cnt > 0) {
      alerts.push({
        type: 'pending_commission_overdue',
        severity: 'warning',
        message: `${pendingOld[0].cnt}건의 커미션이 7일 이상 대기 중입니다.`,
      });
    }

    // 2. No referrals in last 7 days
    const recentReferrals = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM partner_referrals
       WHERE partner_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [partnerId]
    );
    if (recentReferrals[0]?.cnt === 0) {
      alerts.push({
        type: 'no_recent_referrals',
        severity: 'info',
        message: '최근 7일간 새로운 레퍼럴이 없습니다. 레퍼럴 링크를 공유해보세요.',
      });
    }

    // 3. Contracts expiring within 30 days
    const expiringContracts = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt
       FROM neture_seller_partner_contracts
       WHERE partner_id = $1
         AND contract_status = 'active'
         AND expires_at IS NOT NULL
         AND expires_at <= CURRENT_DATE + INTERVAL '30 days'`,
      [partnerId]
    );
    if (expiringContracts[0]?.cnt > 0) {
      alerts.push({
        type: 'contract_expiring',
        severity: 'warning',
        message: `${expiringContracts[0].cnt}건의 계약이 30일 이내에 만료됩니다.`,
      });
    }

    return alerts;
  }

  async getAiInsight(partnerId: string, userId: string): Promise<PartnerAiInsightResult> {
    const kpi = await this.getKpiSummary(partnerId);
    const trends = await this.getCommissionTrends(partnerId);
    const alerts = await this.getAlerts(partnerId);

    // Try AI insight
    try {
      const { runAIInsight } = await import('@o4o/ai-core');
      const aiResult = await runAIInsight({
        service: 'neture',
        insightType: 'partner-performance',
        contextData: {
          partner: {
            totalCommissions: kpi.totalCommissions,
            totalCommissionAmount: kpi.totalCommissionAmount,
            pendingAmount: kpi.pendingAmount,
            activeContracts: kpi.activeContracts,
            totalReferrals: kpi.totalReferrals,
          },
          trends: {
            commissionGrowth: trends.growthRate,
            currentAmount: trends.currentAmount,
            previousAmount: trends.previousAmount,
          },
          alertCount: alerts.length,
          warningAlerts: alerts.filter(a => a.severity === 'warning').length,
        },
        user: {
          id: userId,
          role: 'neture:partner',
        },
      });

      if (aiResult.success && aiResult.insight) {
        return {
          insight: aiResult.insight,
          meta: {
            provider: aiResult.meta.provider,
            model: aiResult.meta.model,
            durationMs: aiResult.meta.durationMs,
          },
        };
      }
    } catch {
      // AI unavailable, fall through to rule-based
    }

    // Rule-based fallback
    const summaryParts: string[] = [];
    if (kpi.totalCommissions > 0) summaryParts.push(`총 ${kpi.totalCommissions}건의 커미션 발생`);
    if (kpi.activeContracts > 0) summaryParts.push(`활성 계약 ${kpi.activeContracts}건`);
    if (kpi.totalReferrals > 0) summaryParts.push(`레퍼럴 링크 ${kpi.totalReferrals}개 생성`);
    if (trends.growthRate !== 0) {
      summaryParts.push(`커미션 ${trends.growthRate > 0 ? '증가' : '감소'} ${Math.abs(trends.growthRate)}%`);
    }
    if (summaryParts.length === 0) summaryParts.push('아직 활동 데이터가 없습니다.');

    const actions: string[] = [];
    if (alerts.some(a => a.severity === 'warning')) actions.push('주의 알림을 확인하세요.');
    if (kpi.totalReferrals === 0) actions.push('레퍼럴 링크를 생성하여 홍보를 시작하세요.');
    if (kpi.activeContracts === 0) actions.push('제품 풀에서 파트너 계약을 신청하세요.');
    if (trends.growthRate < 0) actions.push('커미션이 감소 추세입니다. 레퍼럴 활동을 늘려보세요.');

    const riskLevel = alerts.some(a => a.severity === 'critical') ? 'high'
      : alerts.some(a => a.severity === 'warning') ? 'medium'
      : 'low';

    return {
      insight: {
        summary: summaryParts.join('. ') + '.',
        riskLevel,
        recommendedActions: actions,
        confidenceScore: 0.6,
      },
      meta: { provider: 'rule-based', model: 'partner-copilot-v1', durationMs: 0 },
    };
  }
}
