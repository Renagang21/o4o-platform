/**
 * ReportService
 *
 * WO-O4O-SUPPLIER-REPORTING-BILLING-BASIS-PHASE3B-CP1
 *
 * consultation 청구 근거 리포트 집계 서비스.
 * 운영자/공급자용 — 약국 선택적, 거절 사유 분포, 소스별 비교, 상위 QR.
 */

import { DataSource } from 'typeorm';

export interface ReportParams {
  from: string;
  to: string;
  pharmacyId?: string;
  sourceType?: 'qr' | 'tablet';
}

export interface ConsultationBillingReport {
  period: { from: string; to: string };
  pharmacy?: { id: string; name: string };
  summary: {
    totalEvents: number;
    totalRequests: number;
    approved: number;
    rejected: number;
    pending: number;
    totalActions: number;
    totalOrderDrafts: number;
  };
  funnel: {
    event: number;
    request: number;
    approved: number;
    action: number;
    orderDraft: number;
    eventToRequestRate: number;
    requestToApprovedRate: number;
    approvedToActionRate: number;
  };
  rejectReasons: Array<{
    reason: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  bySource: Array<{
    sourceType: string;
    requests: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    actions: number;
  }>;
  topSources: Array<{
    sourceId: string;
    sourceType: string;
    eventCount: number;
    requestCount: number;
    approvedCount: number;
    approvalRate: number;
  }>;
}

const REJECT_REASON_LABELS: Record<string, string> = {
  out_of_stock: '재고 없음',
  unavailable_time: '대응 불가 시간',
  unmet_conditions: '조건 미충족',
  duplicate: '중복 요청',
  other: '기타',
};

export class ReportService {
  constructor(private dataSource: DataSource) {}

  async getConsultationBillingReport(
    params: ReportParams,
  ): Promise<ConsultationBillingReport> {
    const { from, to, pharmacyId, sourceType } = params;

    const [
      pharmacy,
      eventSummary,
      requestSummary,
      actionSummary,
      orderDraftSummary,
      rejectReasons,
      bySource,
      topSources,
    ] = await Promise.all([
      pharmacyId ? this.getPharmacyName(pharmacyId) : Promise.resolve(undefined),
      this.aggregateEvents(from, to, pharmacyId, sourceType),
      this.aggregateRequests(from, to, pharmacyId, sourceType),
      this.aggregateActions(from, to, pharmacyId, sourceType),
      this.aggregateOrderDrafts(from, to, pharmacyId, sourceType),
      this.aggregateRejectReasons(from, to, pharmacyId, sourceType),
      this.aggregateBySource(from, to, pharmacyId),
      this.aggregateTopSources(from, to, pharmacyId),
    ]);

    const rate = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);

    return {
      period: { from, to },
      pharmacy,
      summary: {
        totalEvents: eventSummary.total,
        totalRequests: requestSummary.total,
        approved: requestSummary.approved,
        rejected: requestSummary.rejected,
        pending: requestSummary.pending,
        totalActions: actionSummary.total,
        totalOrderDrafts: orderDraftSummary.total,
      },
      funnel: {
        event: eventSummary.total,
        request: requestSummary.total,
        approved: requestSummary.approved,
        action: actionSummary.total,
        orderDraft: orderDraftSummary.total,
        eventToRequestRate: rate(requestSummary.total, eventSummary.total),
        requestToApprovedRate: rate(requestSummary.approved, requestSummary.total),
        approvedToActionRate: rate(actionSummary.total, requestSummary.approved),
      },
      rejectReasons,
      bySource,
      topSources,
    };
  }

  async listPharmacies(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.dataSource.query(
      `SELECT o.id, o.name FROM organizations o
       JOIN organization_service_enrollments ose ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
       WHERE o."isActive" = true ORDER BY o.name`,
    );
    return rows.map((r: any) => ({ id: r.id, name: r.name }));
  }

  private async getPharmacyName(
    pharmacyId: string,
  ): Promise<{ id: string; name: string } | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, name FROM organizations WHERE id = $1`,
      [pharmacyId],
    );
    return rows[0] ? { id: rows[0].id, name: rows[0].name } : undefined;
  }

  private buildConditions(
    dateCol: string,
    pharmacyCol: string,
    sourceCol: string | null,
    from: string,
    to: string,
    pharmacyId?: string,
    sourceType?: string,
  ): { where: string; values: any[] } {
    const conditions: string[] = [
      `${dateCol} >= $1`,
      `${dateCol} <= $2`,
    ];
    const values: any[] = [from, to];
    let idx = 3;

    if (pharmacyId) {
      conditions.push(`${pharmacyCol} = $${idx}`);
      values.push(pharmacyId);
      idx++;
    }
    if (sourceType && sourceCol) {
      conditions.push(`${sourceCol} = $${idx}`);
      values.push(sourceType);
      idx++;
    }

    return { where: conditions.join(' AND '), values };
  }

  private async aggregateEvents(
    from: string, to: string, pharmacyId?: string, sourceType?: string,
  ) {
    const { where, values } = this.buildConditions(
      'created_at', 'pharmacy_id', 'source_type', from, to, pharmacyId, sourceType,
    );
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM glycopharm_events
      WHERE purpose = 'consultation' AND ${where}
    `;
    const rows = await this.dataSource.query(sql, values);
    return { total: rows[0]?.total || 0 };
  }

  private async aggregateRequests(
    from: string, to: string, pharmacyId?: string, sourceType?: string,
  ) {
    const { where, values } = this.buildConditions(
      'requested_at', 'pharmacy_id', 'source_type', from, to, pharmacyId, sourceType,
    );
    const sql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int AS approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending
      FROM glycopharm_customer_requests
      WHERE purpose = 'consultation' AND ${where}
    `;
    const rows = await this.dataSource.query(sql, values);
    const r = rows[0] || {};
    return { total: r.total || 0, approved: r.approved || 0, rejected: r.rejected || 0, pending: r.pending || 0 };
  }

  private async aggregateActions(
    from: string, to: string, pharmacyId?: string, sourceType?: string,
  ) {
    const conditions: string[] = [
      `al.action_type = 'consultation_log'`,
      `al.created_at >= $1`,
      `al.created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let idx = 3;
    if (pharmacyId) {
      conditions.push(`r.pharmacy_id = $${idx}`);
      values.push(pharmacyId);
      idx++;
    }
    if (sourceType) {
      conditions.push(`r.source_type = $${idx}`);
      values.push(sourceType);
      idx++;
    }
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM glycopharm_request_action_logs al
      JOIN glycopharm_customer_requests r ON r.id = al.request_id
      WHERE ${conditions.join(' AND ')}
    `;
    const rows = await this.dataSource.query(sql, values);
    return { total: rows[0]?.total || 0 };
  }

  private async aggregateOrderDrafts(
    from: string, to: string, pharmacyId?: string, sourceType?: string,
  ) {
    const conditions: string[] = [
      `al.action_type = 'order_draft'`,
      `al.created_at >= $1`,
      `al.created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let idx = 3;
    if (pharmacyId) {
      conditions.push(`r.pharmacy_id = $${idx}`);
      values.push(pharmacyId);
      idx++;
    }
    if (sourceType) {
      conditions.push(`r.source_type = $${idx}`);
      values.push(sourceType);
      idx++;
    }
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM glycopharm_request_action_logs al
      JOIN glycopharm_customer_requests r ON r.id = al.request_id
      WHERE ${conditions.join(' AND ')}
    `;
    const rows = await this.dataSource.query(sql, values);
    return { total: rows[0]?.total || 0 };
  }

  private async aggregateRejectReasons(
    from: string, to: string, pharmacyId?: string, sourceType?: string,
  ) {
    const { where, values } = this.buildConditions(
      'requested_at', 'pharmacy_id', 'source_type', from, to, pharmacyId, sourceType,
    );
    const sql = `
      SELECT
        metadata->>'rejectReason' AS reason,
        COUNT(*)::int AS count
      FROM glycopharm_customer_requests
      WHERE purpose = 'consultation' AND status = 'rejected' AND ${where}
      GROUP BY metadata->>'rejectReason'
      ORDER BY count DESC
    `;
    const rows: Array<{ reason: string | null; count: number }> = await this.dataSource.query(sql, values);

    const totalRejected = rows.reduce((sum, r) => sum + r.count, 0);
    return rows.map((r) => ({
      reason: r.reason || 'unknown',
      label: REJECT_REASON_LABELS[r.reason || ''] || r.reason || '미지정',
      count: r.count,
      percentage: totalRejected === 0 ? 0 : Math.round((r.count / totalRejected) * 1000) / 10,
    }));
  }

  private async aggregateBySource(
    from: string, to: string, pharmacyId?: string,
  ) {
    const conditions: string[] = [
      `r.purpose = 'consultation'`,
      `r.requested_at >= $1`,
      `r.requested_at <= $2`,
    ];
    const values: any[] = [from, to];
    let idx = 3;
    if (pharmacyId) {
      conditions.push(`r.pharmacy_id = $${idx}`);
      values.push(pharmacyId);
      idx++;
    }
    const sql = `
      SELECT
        r.source_type AS "sourceType",
        COUNT(*)::int AS requests,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int AS approved,
        COUNT(CASE WHEN r.status = 'rejected' THEN 1 END)::int AS rejected,
        COUNT(DISTINCT al.id)::int AS actions
      FROM glycopharm_customer_requests r
      LEFT JOIN glycopharm_request_action_logs al ON al.request_id = r.id AND al.action_type = 'consultation_log'
      WHERE ${conditions.join(' AND ')}
      GROUP BY r.source_type
      ORDER BY requests DESC
    `;
    const rows: any[] = await this.dataSource.query(sql, values);
    return rows.map((r) => ({
      sourceType: r.sourceType,
      requests: r.requests || 0,
      approved: r.approved || 0,
      rejected: r.rejected || 0,
      approvalRate: r.requests === 0 ? 0 : Math.round((r.approved / r.requests) * 1000) / 10,
      actions: r.actions || 0,
    }));
  }

  private async aggregateTopSources(
    from: string, to: string, pharmacyId?: string,
  ) {
    const conditions: string[] = [
      `e.purpose = 'consultation'`,
      `e.source_id IS NOT NULL`,
      `e.created_at >= $1`,
      `e.created_at <= $2`,
    ];
    const values: any[] = [from, to];
    let idx = 3;
    if (pharmacyId) {
      conditions.push(`e.pharmacy_id = $${idx}`);
      values.push(pharmacyId);
      idx++;
    }

    // Top sources by event count, with request/approval counts from subquery
    const sql = `
      WITH top_events AS (
        SELECT
          e.source_id,
          e.source_type,
          COUNT(*)::int AS event_count
        FROM glycopharm_events e
        WHERE ${conditions.join(' AND ')}
        GROUP BY e.source_id, e.source_type
        ORDER BY event_count DESC
        LIMIT 5
      ),
      request_stats AS (
        SELECT
          r.source_id,
          COUNT(*)::int AS request_count,
          COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::int AS approved_count
        FROM glycopharm_customer_requests r
        WHERE r.purpose = 'consultation'
          AND r.requested_at >= $1 AND r.requested_at <= $2
          ${pharmacyId ? `AND r.pharmacy_id = $${idx - 1}` : ''}
          AND r.source_id IS NOT NULL
        GROUP BY r.source_id
      )
      SELECT
        te.source_id AS "sourceId",
        te.source_type AS "sourceType",
        te.event_count AS "eventCount",
        COALESCE(rs.request_count, 0)::int AS "requestCount",
        COALESCE(rs.approved_count, 0)::int AS "approvedCount"
      FROM top_events te
      LEFT JOIN request_stats rs ON rs.source_id = te.source_id
      ORDER BY te.event_count DESC
    `;
    const rows: any[] = await this.dataSource.query(sql, values);
    return rows.map((r) => ({
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      eventCount: r.eventCount || 0,
      requestCount: r.requestCount || 0,
      approvedCount: r.approvedCount || 0,
      approvalRate: r.requestCount === 0 ? 0 : Math.round((r.approvedCount / r.requestCount) * 1000) / 10,
    }));
  }
}
