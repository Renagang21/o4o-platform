/**
 * AiBillingService — WO-O4O-AI-BILLING-DATA-SYSTEM-V1
 *
 * 월별 AI 정산 데이터 생성·확정·결제 완료 처리.
 * ai_usage_aggregate 기반 → ai_billing_summary 스냅샷.
 */

import type { DataSource } from 'typeorm';

// ── Types ──

export interface BillingSummaryRow {
  id: number;
  period: string;
  serviceKey: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  adjustmentAmount: number;
  finalCost: number;
  status: string;
  note: string | null;
  generatedAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
}

export interface ScopeBreakdownRow {
  scope: string;
  requests: number;
  tokens: number;
  cost: number;
}

// ── Service ──

export class AiBillingService {
  constructor(private dataSource: DataSource) {}

  /**
   * 월별 billing 생성.
   * ai_usage_aggregate (layer=service, periodKey=YYYY-MM) 기반.
   */
  async generate(month: string): Promise<BillingSummaryRow[]> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    // 1. aggregate에서 서비스별 집계 조회
    const aggregates = await this.dataSource.query(`
      SELECT layer_key AS "layerKey", limit_type AS "limitType",
             current_value AS "currentValue"
      FROM ai_usage_aggregate
      WHERE layer = 'service' AND period_key = $1
    `, [month]);

    // 서비스별로 group
    const serviceMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const row of aggregates) {
      const key = row.layerKey;
      if (!serviceMap.has(key)) {
        serviceMap.set(key, { requests: 0, tokens: 0, cost: 0 });
      }
      const entry = serviceMap.get(key)!;
      const val = Number(row.currentValue);
      if (row.limitType === 'requests') entry.requests = val;
      else if (row.limitType === 'tokens') entry.tokens = val;
      else if (row.limitType === 'cost') entry.cost = val;
    }

    if (serviceMap.size === 0) {
      throw new Error(`No aggregate data found for ${month}`);
    }

    // 2. 각 서비스별 billing_summary INSERT
    const results: BillingSummaryRow[] = [];
    for (const [serviceKey, data] of serviceMap) {
      try {
        const rows = await this.dataSource.query(`
          INSERT INTO ai_billing_summary (period, service_key, total_requests, total_tokens, total_cost, final_cost)
          VALUES ($1, $2, $3, $4, $5, $5)
          RETURNING id, period, service_key AS "serviceKey",
                    total_requests AS "totalRequests", total_tokens AS "totalTokens",
                    total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
                    final_cost AS "finalCost", status, note,
                    generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
        `, [month, serviceKey, data.requests, data.tokens, data.cost]);
        results.push(this.formatRow(rows[0]));
      } catch (err: any) {
        if (err.code === '23505') {
          throw new Error(`Billing already exists for ${month}/${serviceKey}`);
        }
        throw err;
      }
    }

    return results;
  }

  /**
   * 전체 billing 목록.
   */
  async list(filters?: { status?: string; period?: string }): Promise<BillingSummaryRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.period) {
      conditions.push(`period = $${idx++}`);
      params.push(filters.period);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.dataSource.query(`
      SELECT id, period, service_key AS "serviceKey",
             total_requests AS "totalRequests", total_tokens AS "totalTokens",
             total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
             final_cost AS "finalCost", status, note,
             generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
      FROM ai_billing_summary
      ${where}
      ORDER BY period DESC, service_key
    `, params);

    return rows.map((r: any) => this.formatRow(r));
  }

  /**
   * billing 상세 + scope breakdown.
   */
  async getDetail(id: number): Promise<{ summary: BillingSummaryRow; scopeBreakdown: ScopeBreakdownRow[] }> {
    const rows = await this.dataSource.query(`
      SELECT id, period, service_key AS "serviceKey",
             total_requests AS "totalRequests", total_tokens AS "totalTokens",
             total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
             final_cost AS "finalCost", status, note,
             generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
      FROM ai_billing_summary WHERE id = $1
    `, [id]);

    if (!rows[0]) throw new Error('Billing not found');
    const summary = this.formatRow(rows[0]);

    // scope breakdown from aggregate
    let scopeBreakdown: ScopeBreakdownRow[] = [];
    try {
      const scopeRows = await this.dataSource.query(`
        SELECT layer_key AS scope, limit_type AS "limitType",
               current_value AS "currentValue"
        FROM ai_usage_aggregate
        WHERE layer = 'scope' AND period_key = $1
        ORDER BY layer_key
      `, [summary.period]);

      const scopeMap = new Map<string, { requests: number; tokens: number; cost: number }>();
      for (const r of scopeRows) {
        if (!scopeMap.has(r.scope)) {
          scopeMap.set(r.scope, { requests: 0, tokens: 0, cost: 0 });
        }
        const entry = scopeMap.get(r.scope)!;
        const val = Number(r.currentValue);
        if (r.limitType === 'requests') entry.requests = val;
        else if (r.limitType === 'tokens') entry.tokens = val;
        else if (r.limitType === 'cost') entry.cost = val;
      }

      scopeBreakdown = Array.from(scopeMap.entries()).map(([scope, data]) => ({
        scope,
        requests: data.requests,
        tokens: data.tokens,
        cost: data.cost,
      }));
    } catch { /* aggregate table may not exist */ }

    return { summary, scopeBreakdown };
  }

  /**
   * 조정액 수정 (draft만 허용).
   */
  async updateAdjustment(id: number, amount: number, note?: string): Promise<BillingSummaryRow> {
    const current = await this.getById(id);
    if (current.status !== 'draft') {
      throw new Error('Cannot modify confirmed/paid billing');
    }

    const rows = await this.dataSource.query(`
      UPDATE ai_billing_summary
      SET adjustment_amount = $1,
          final_cost = total_cost + $1,
          note = COALESCE($2, note)
      WHERE id = $3
      RETURNING id, period, service_key AS "serviceKey",
                total_requests AS "totalRequests", total_tokens AS "totalTokens",
                total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
                final_cost AS "finalCost", status, note,
                generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
    `, [amount, note || null, id]);

    return this.formatRow(rows[0]);
  }

  /**
   * 확정 (draft → confirmed).
   */
  async confirm(id: number): Promise<BillingSummaryRow> {
    const current = await this.getById(id);
    if (current.status !== 'draft') {
      throw new Error('Only draft billing can be confirmed');
    }

    const rows = await this.dataSource.query(`
      UPDATE ai_billing_summary
      SET status = 'confirmed',
          final_cost = total_cost + adjustment_amount,
          confirmed_at = NOW()
      WHERE id = $1
      RETURNING id, period, service_key AS "serviceKey",
                total_requests AS "totalRequests", total_tokens AS "totalTokens",
                total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
                final_cost AS "finalCost", status, note,
                generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
    `, [id]);

    return this.formatRow(rows[0]);
  }

  /**
   * 결제 완료 (confirmed → paid).
   */
  async markPaid(id: number): Promise<BillingSummaryRow> {
    const current = await this.getById(id);
    if (current.status !== 'confirmed') {
      throw new Error('Only confirmed billing can be marked as paid');
    }

    const rows = await this.dataSource.query(`
      UPDATE ai_billing_summary
      SET status = 'paid', paid_at = NOW()
      WHERE id = $1
      RETURNING id, period, service_key AS "serviceKey",
                total_requests AS "totalRequests", total_tokens AS "totalTokens",
                total_cost AS "totalCost", adjustment_amount AS "adjustmentAmount",
                final_cost AS "finalCost", status, note,
                generated_at AS "generatedAt", confirmed_at AS "confirmedAt", paid_at AS "paidAt"
    `, [id]);

    return this.formatRow(rows[0]);
  }

  /**
   * CSV 문자열 생성.
   */
  async exportCsv(id: number): Promise<{ csv: string; filename: string }> {
    const { summary, scopeBreakdown } = await this.getDetail(id);

    const lines: string[] = [];
    lines.push('AI Billing Summary');
    lines.push(`Period,${summary.period}`);
    lines.push(`Service,${summary.serviceKey}`);
    lines.push(`Status,${summary.status}`);
    lines.push('');
    lines.push('Total Requests,Total Tokens,Total Cost,Adjustment,Final Cost');
    lines.push(`${summary.totalRequests},${summary.totalTokens},${summary.totalCost},${summary.adjustmentAmount},${summary.finalCost}`);
    lines.push('');

    if (scopeBreakdown.length > 0) {
      lines.push('Scope Breakdown');
      lines.push('Scope,Requests,Tokens,Cost');
      for (const s of scopeBreakdown) {
        lines.push(`${s.scope},${s.requests},${s.tokens},${s.cost}`);
      }
    }

    const filename = `ai-billing-${summary.period}-${summary.serviceKey}.csv`;
    return { csv: lines.join('\n'), filename };
  }

  // ── Private ──

  private async getById(id: number): Promise<{ status: string }> {
    const rows = await this.dataSource.query(
      `SELECT status FROM ai_billing_summary WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new Error('Billing not found');
    return rows[0];
  }

  private formatRow(r: any): BillingSummaryRow {
    return {
      id: r.id,
      period: r.period,
      serviceKey: r.serviceKey,
      totalRequests: Number(r.totalRequests),
      totalTokens: Number(r.totalTokens),
      totalCost: Number(r.totalCost),
      adjustmentAmount: Number(r.adjustmentAmount),
      finalCost: Number(r.finalCost),
      status: r.status,
      note: r.note || null,
      generatedAt: r.generatedAt ? new Date(r.generatedAt).toISOString() : new Date().toISOString(),
      confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : null,
      paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
    };
  }
}
