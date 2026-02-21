/**
 * InvoiceService
 *
 * WO-O4O-INVOICE-FINALIZATION-PHASE3D-CP1
 *
 * 청구 스냅샷 고정 · 인보이스 CRUD.
 * - createInvoiceDraftFromPreview: Preview 결과를 DRAFT 스냅샷으로 저장
 * - confirmInvoice: DRAFT → CONFIRMED (금액/건수 고정)
 * - getInvoice / listInvoices: 조회
 *
 * CONFIRMED 이후 재계산/수정 불가.
 */

import { DataSource } from 'typeorm';
import { BillingPreviewService } from './billing-preview.service.js';
import type { InvoiceLineSnapshot, InvoiceStatus, BillingUnit, DispatchLogEntry } from '../entities/billing-invoice.entity.js';

export interface CreateInvoiceDraftParams {
  periodFrom: string;
  periodTo: string;
  pharmacyId?: string;
  supplierId?: string;
  unit: BillingUnit;
  unitPrice: number;
  createdBy: string;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  pharmacyId?: string;
  supplierId?: string;
  periodFrom?: string;
  periodTo?: string;
}

export interface InvoiceResult {
  id: string;
  serviceKey: string;
  supplierId: string | null;
  pharmacyId: string | null;
  pharmacyName?: string;
  periodFrom: string;
  periodTo: string;
  unit: BillingUnit;
  unitPrice: number;
  count: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  snapshotAt: string;
  createdBy: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  lineSnapshot: InvoiceLineSnapshot[] | null;
  metadata: Record<string, any> | null;
  dispatchStatus: string;
  dispatchedAt: string | null;
  dispatchedTo: string | null;
  receivedAt: string | null;
  dispatchLog: DispatchLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export class InvoiceService {
  private billingPreviewService: BillingPreviewService;

  constructor(private dataSource: DataSource) {
    this.billingPreviewService = new BillingPreviewService(dataSource);
  }

  /**
   * Preview 결과를 그대로 DRAFT 인보이스로 저장
   */
  async createInvoiceDraftFromPreview(
    params: CreateInvoiceDraftParams,
  ): Promise<InvoiceResult> {
    const { periodFrom, periodTo, pharmacyId, supplierId, unit, unitPrice, createdBy } = params;

    // 중복 검사
    const existing = await this.dataSource.query(
      `SELECT id, status FROM glycopharm_billing_invoices
       WHERE ($1::varchar IS NOT DISTINCT FROM supplier_id)
         AND ($2::uuid IS NOT DISTINCT FROM pharmacy_id)
         AND period_from = $3
         AND period_to = $4
         AND unit = $5
       LIMIT 1`,
      [supplierId || null, pharmacyId || null, periodFrom, periodTo, unit],
    );

    if (existing.length > 0) {
      throw new Error(
        `Invoice already exists for this period/supplier/pharmacy/unit (id: ${existing[0].id}, status: ${existing[0].status})`,
      );
    }

    // 3-C Preview 호출하여 스냅샷 생성
    const preview = await this.billingPreviewService.getConsultationBillingPreview({
      from: periodFrom,
      to: periodTo,
      pharmacyId,
      supplierId,
      unit,
      unitPrice,
    });

    const now = new Date();

    const rows = await this.dataSource.query(
      `INSERT INTO glycopharm_billing_invoices
        (service_key, supplier_id, pharmacy_id, period_from, period_to,
         unit, unit_price, count, amount, currency, status,
         snapshot_at, created_by, line_snapshot, metadata, created_at, updated_at)
       VALUES
        ('glycopharm', $1, $2, $3, $4,
         $5, $6, $7, $8, 'KRW', 'DRAFT',
         $9, $10, $11, $12, $9, $9)
       RETURNING *`,
      [
        supplierId || null,
        pharmacyId || null,
        periodFrom,
        periodTo,
        unit,
        unitPrice,
        preview.count,
        preview.amount,
        now.toISOString(),
        createdBy,
        JSON.stringify(preview.details),
        JSON.stringify({ createdFrom: 'billing-preview', previewPharmacy: preview.pharmacy }),
      ],
    );

    return this.mapRow(rows[0], preview.pharmacy?.name);
  }

  /**
   * DRAFT → CONFIRMED 전환
   */
  async confirmInvoice(invoiceId: string, confirmedBy: string): Promise<InvoiceResult> {
    // 현재 상태 확인
    const existing = await this.dataSource.query(
      `SELECT * FROM glycopharm_billing_invoices WHERE id = $1`,
      [invoiceId],
    );

    if (existing.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = existing[0];

    if (invoice.status !== 'DRAFT') {
      throw new Error(`Cannot confirm invoice in '${invoice.status}' status. Only DRAFT invoices can be confirmed.`);
    }

    const now = new Date();

    const rows = await this.dataSource.query(
      `UPDATE glycopharm_billing_invoices
       SET status = 'CONFIRMED',
           confirmed_by = $1,
           confirmed_at = $2,
           updated_at = $2,
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
       WHERE id = $4
       RETURNING *`,
      [
        confirmedBy,
        now.toISOString(),
        JSON.stringify({ confirmedAction: { by: confirmedBy, at: now.toISOString() } }),
        invoiceId,
      ],
    );

    return this.mapRow(rows[0]);
  }

  /**
   * 인보이스 상세 조회
   */
  async getInvoice(invoiceId: string): Promise<InvoiceResult | null> {
    const rows = await this.dataSource.query(
      `SELECT i.*, p.name AS pharmacy_name
       FROM glycopharm_billing_invoices i
       LEFT JOIN organizations p ON p.id = i.pharmacy_id
       WHERE i.id = $1`,
      [invoiceId],
    );

    if (rows.length === 0) return null;
    return this.mapRow(rows[0], rows[0].pharmacy_name);
  }

  /**
   * 인보이스 목록 조회
   */
  async listInvoices(params: ListInvoicesParams): Promise<InvoiceResult[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.status) {
      conditions.push(`i.status = $${idx}`);
      values.push(params.status);
      idx++;
    }
    if (params.pharmacyId) {
      conditions.push(`i.pharmacy_id = $${idx}`);
      values.push(params.pharmacyId);
      idx++;
    }
    if (params.supplierId) {
      conditions.push(`i.supplier_id = $${idx}`);
      values.push(params.supplierId);
      idx++;
    }
    if (params.periodFrom) {
      conditions.push(`i.period_from >= $${idx}`);
      values.push(params.periodFrom);
      idx++;
    }
    if (params.periodTo) {
      conditions.push(`i.period_to <= $${idx}`);
      values.push(params.periodTo);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.dataSource.query(
      `SELECT i.*, p.name AS pharmacy_name
       FROM glycopharm_billing_invoices i
       LEFT JOIN organizations p ON p.id = i.pharmacy_id
       ${where}
       ORDER BY i.created_at DESC`,
      values,
    );

    return rows.map((r: any) => this.mapRow(r, r.pharmacy_name));
  }

  private mapRow(row: any, pharmacyName?: string): InvoiceResult {
    return {
      id: row.id,
      serviceKey: row.service_key,
      supplierId: row.supplier_id,
      pharmacyId: row.pharmacy_id,
      pharmacyName: pharmacyName || undefined,
      periodFrom: row.period_from,
      periodTo: row.period_to,
      unit: row.unit,
      unitPrice: row.unit_price,
      count: row.count,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      snapshotAt: row.snapshot_at,
      createdBy: row.created_by,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
      lineSnapshot: row.line_snapshot,
      metadata: row.metadata,
      dispatchStatus: row.dispatch_status || 'NONE',
      dispatchedAt: row.dispatched_at || null,
      dispatchedTo: row.dispatched_to || null,
      receivedAt: row.received_at || null,
      dispatchLog: row.dispatch_log || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
