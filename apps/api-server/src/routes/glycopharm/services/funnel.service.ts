/**
 * FunnelService
 *
 * WO-O4O-FUNNEL-VISUALIZATION-PHASE3A-CP1
 *
 * consultation 목적 한정 퍼널 집계 서비스.
 * Event → Request → Action → Order(참고) 단계별 수치 제공.
 * 내부 판단용 — 차트 없음, 금액 없음, 숫자만.
 */

import { DataSource } from 'typeorm';

export interface FunnelParams {
  from: string;
  to: string;
  pharmacyId?: string;
  sourceType?: 'qr' | 'tablet';
}

export interface ConsultationFunnelSummary {
  period: { from: string; to: string };
  event: { total: number; impressions: number; clicks: number; qrScans: number };
  request: { total: number; approved: number; rejected: number; pending: number };
  action: { total: number; draft: number; inProgress: number; completed: number };
  orderDraft: { total: number };
}

export class FunnelService {
  constructor(private dataSource: DataSource) {}

  async getConsultationFunnelSummary(
    params: FunnelParams,
  ): Promise<ConsultationFunnelSummary> {
    const { from, to, pharmacyId, sourceType } = params;

    const [eventResult, requestResult, actionResult, orderDraftResult] =
      await Promise.all([
        this.aggregateEvents(from, to, pharmacyId, sourceType),
        this.aggregateRequests(from, to, pharmacyId, sourceType),
        this.aggregateActions(from, to, pharmacyId, sourceType),
        this.aggregateOrderDrafts(from, to, pharmacyId, sourceType),
      ]);

    return {
      period: { from, to },
      event: eventResult,
      request: requestResult,
      action: actionResult,
      orderDraft: orderDraftResult,
    };
  }

  private async aggregateEvents(
    from: string,
    to: string,
    pharmacyId?: string,
    sourceType?: string,
  ) {
    const conditions: string[] = [
      `purpose = 'consultation'`,
      `created_at >= $1`,
      `created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let paramIdx = 3;

    if (pharmacyId) {
      conditions.push(`pharmacy_id = $${paramIdx}`);
      values.push(pharmacyId);
      paramIdx++;
    }
    if (sourceType) {
      conditions.push(`source_type = $${paramIdx}`);
      values.push(sourceType);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END)::int AS impressions,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END)::int AS clicks,
        COUNT(CASE WHEN event_type = 'qr_scan' THEN 1 END)::int AS "qrScans"
      FROM glycopharm_events
      WHERE ${where}
    `;

    const rows = await this.dataSource.query(sql, values);
    const row = rows[0] || {};
    return {
      total: row.total || 0,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      qrScans: row.qrScans || 0,
    };
  }

  private async aggregateRequests(
    from: string,
    to: string,
    pharmacyId?: string,
    sourceType?: string,
  ) {
    const conditions: string[] = [
      `purpose = 'consultation'`,
      `requested_at >= $1`,
      `requested_at <= $2`,
    ];
    const values: any[] = [from, to];
    let paramIdx = 3;

    if (pharmacyId) {
      conditions.push(`pharmacy_id = $${paramIdx}`);
      values.push(pharmacyId);
      paramIdx++;
    }
    if (sourceType) {
      conditions.push(`source_type = $${paramIdx}`);
      values.push(sourceType);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int AS approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending
      FROM glycopharm_customer_requests
      WHERE ${where}
    `;

    const rows = await this.dataSource.query(sql, values);
    const row = rows[0] || {};
    return {
      total: row.total || 0,
      approved: row.approved || 0,
      rejected: row.rejected || 0,
      pending: row.pending || 0,
    };
  }

  private async aggregateActions(
    from: string,
    to: string,
    pharmacyId?: string,
    sourceType?: string,
  ) {
    const conditions: string[] = [
      `al.action_type = 'consultation_log'`,
      `al.created_at >= $1`,
      `al.created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let paramIdx = 3;

    if (pharmacyId) {
      conditions.push(`r.pharmacy_id = $${paramIdx}`);
      values.push(pharmacyId);
      paramIdx++;
    }
    if (sourceType) {
      conditions.push(`r.source_type = $${paramIdx}`);
      values.push(sourceType);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN al.status = 'draft' THEN 1 END)::int AS draft,
        COUNT(CASE WHEN al.status = 'in_progress' THEN 1 END)::int AS "inProgress",
        COUNT(CASE WHEN al.status = 'completed' THEN 1 END)::int AS completed
      FROM glycopharm_request_action_logs al
      JOIN glycopharm_customer_requests r ON r.id = al.request_id
      WHERE ${where}
    `;

    const rows = await this.dataSource.query(sql, values);
    const row = rows[0] || {};
    return {
      total: row.total || 0,
      draft: row.draft || 0,
      inProgress: row.inProgress || 0,
      completed: row.completed || 0,
    };
  }

  private async aggregateOrderDrafts(
    from: string,
    to: string,
    pharmacyId?: string,
    sourceType?: string,
  ) {
    const conditions: string[] = [
      `al.action_type = 'order_draft'`,
      `al.created_at >= $1`,
      `al.created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let paramIdx = 3;

    if (pharmacyId) {
      conditions.push(`r.pharmacy_id = $${paramIdx}`);
      values.push(pharmacyId);
      paramIdx++;
    }
    if (sourceType) {
      conditions.push(`r.source_type = $${paramIdx}`);
      values.push(sourceType);
      paramIdx++;
    }

    const where = conditions.join(' AND ');
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM glycopharm_request_action_logs al
      JOIN glycopharm_customer_requests r ON r.id = al.request_id
      WHERE ${where}
    `;

    const rows = await this.dataSource.query(sql, values);
    const row = rows[0] || {};
    return {
      total: row.total || 0,
    };
  }
}
