/**
 * BillingPreviewService
 *
 * WO-O4O-BILLING-AUTOMATION-PHASE3C-CP1
 *
 * consultation 목적 청구 미리보기 산출 서비스.
 * - 기간 내 consultation Action 또는 approved Request 집계
 * - 고정 단가 적용
 * - 저장 없음 (Preview only)
 */

import { DataSource } from 'typeorm';

export type BillingUnit = 'consultation_action' | 'approved_request';

export interface BillingPreviewParams {
  from: string;
  to: string;
  pharmacyId?: string;
  supplierId?: string;
  unit?: BillingUnit;
  unitPrice?: number;
}

export interface BillingPreviewResult {
  period: { from: string; to: string };
  pharmacy?: { id: string; name: string };
  unit: BillingUnit;
  unitPrice: number;
  count: number;
  amount: number;
  details: BillingPreviewDetail[];
}

export interface BillingPreviewDetail {
  date: string;
  sourceId: string | null;
  requestId: string;
  actionType: string;
  unitPrice: number;
}

const DEFAULT_UNIT_PRICE = 5000;
const DEFAULT_UNIT: BillingUnit = 'consultation_action';

export class BillingPreviewService {
  constructor(private dataSource: DataSource) {}

  async getConsultationBillingPreview(
    params: BillingPreviewParams,
  ): Promise<BillingPreviewResult> {
    const {
      from,
      to,
      pharmacyId,
      unit = DEFAULT_UNIT,
      unitPrice = DEFAULT_UNIT_PRICE,
    } = params;

    const [pharmacy, countAndDetails] = await Promise.all([
      pharmacyId ? this.getPharmacyName(pharmacyId) : Promise.resolve(undefined),
      unit === 'consultation_action'
        ? this.aggregateActions(from, to, pharmacyId)
        : this.aggregateApprovedRequests(from, to, pharmacyId),
    ]);

    const { count, details } = countAndDetails;

    return {
      period: { from, to },
      pharmacy,
      unit,
      unitPrice,
      count,
      amount: count * unitPrice,
      details: details.map((d) => ({ ...d, unitPrice })),
    };
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

  private async aggregateActions(
    from: string,
    to: string,
    pharmacyId?: string,
  ): Promise<{ count: number; details: BillingPreviewDetail[] }> {
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

    const sql = `
      SELECT
        al.created_at::date::text AS date,
        r.source_id AS "sourceId",
        al.request_id AS "requestId",
        al.action_type AS "actionType"
      FROM glycopharm_request_action_logs al
      JOIN glycopharm_customer_requests r ON r.id = al.request_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY al.created_at ASC
    `;
    const rows: BillingPreviewDetail[] = await this.dataSource.query(sql, values);

    return {
      count: rows.length,
      details: rows.map((r) => ({
        date: r.date,
        sourceId: r.sourceId,
        requestId: r.requestId,
        actionType: r.actionType,
        unitPrice: 0, // filled by caller
      })),
    };
  }

  private async aggregateApprovedRequests(
    from: string,
    to: string,
    pharmacyId?: string,
  ): Promise<{ count: number; details: BillingPreviewDetail[] }> {
    const conditions: string[] = [
      `r.purpose = 'consultation'`,
      `r.status = 'approved'`,
      `r.handled_at >= $1`,
      `r.handled_at <= $2`,
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
        r.handled_at::date::text AS date,
        r.source_id AS "sourceId",
        r.id AS "requestId",
        'approved_request' AS "actionType"
      FROM glycopharm_customer_requests r
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.handled_at ASC
    `;
    const rows: BillingPreviewDetail[] = await this.dataSource.query(sql, values);

    return {
      count: rows.length,
      details: rows.map((r) => ({
        date: r.date,
        sourceId: r.sourceId,
        requestId: r.requestId,
        actionType: r.actionType,
        unitPrice: 0,
      })),
    };
  }
}
