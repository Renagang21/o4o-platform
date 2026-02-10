/**
 * InvoiceDispatchService
 *
 * WO-O4O-INVOICE-DISPATCH-PHASE3E-CP1
 *
 * CONFIRMED 인보이스의 발송/수령 관리.
 * - sendInvoice: PDF 생성 → 이메일 발송 → dispatchStatus = SENT
 * - markInvoiceReceived: dispatchStatus = RECEIVED
 * - getDispatchLog: 발송 이력 조회
 *
 * 결제 연동 없음. 커뮤니케이션 기록만.
 */

import { DataSource } from 'typeorm';
import PDFDocument from 'pdfkit';
import { emailService } from '../../../services/email.service.js';
import type { DispatchLogEntry } from '../entities/billing-invoice.entity.js';

export interface SendInvoiceParams {
  invoiceId: string;
  recipientEmail: string;
  sentBy: string;
}

export interface DispatchResult {
  invoiceId: string;
  dispatchStatus: string;
  dispatchedAt: string | null;
  dispatchedTo: string | null;
  receivedAt: string | null;
  dispatchLog: DispatchLogEntry[];
}

export class InvoiceDispatchService {
  constructor(private dataSource: DataSource) {}

  /**
   * CONFIRMED 인보이스를 이메일로 발송
   */
  async sendInvoice(params: SendInvoiceParams): Promise<DispatchResult> {
    const { invoiceId, recipientEmail, sentBy } = params;

    const rows = await this.dataSource.query(
      `SELECT * FROM glycopharm_billing_invoices WHERE id = $1`,
      [invoiceId],
    );

    if (rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = rows[0];

    if (invoice.status !== 'CONFIRMED') {
      throw new Error(`Cannot send invoice in '${invoice.status}' status. Only CONFIRMED invoices can be sent.`);
    }

    // Pharmacy name lookup
    let pharmacyName = '전체';
    if (invoice.pharmacy_id) {
      const pRows = await this.dataSource.query(
        `SELECT name FROM glycopharm_pharmacies WHERE id = $1`,
        [invoice.pharmacy_id],
      );
      if (pRows.length > 0) pharmacyName = pRows[0].name;
    }

    // Generate PDF buffer
    const pdfBuffer = await this.generateInvoicePdf(invoice, pharmacyName);

    // Generate CSV buffer
    const csvBuffer = this.generateInvoiceCsv(invoice, pharmacyName);

    // Build email
    const periodStr = `${invoice.period_from} ~ ${invoice.period_to}`;
    const amountStr = `\u20A9${Number(invoice.amount).toLocaleString()}`;
    const subject = `[o4o] 상담 서비스 인보이스 안내 (${invoice.period_from?.slice(0, 7) || ''})`;

    const html = this.buildEmailHtml({
      pharmacyName,
      periodStr,
      unit: invoice.unit === 'consultation_action' ? 'Consultation Action' : 'Approved Request',
      unitPrice: Number(invoice.unit_price).toLocaleString(),
      count: Number(invoice.count).toLocaleString(),
      amount: amountStr,
      invoiceId: invoice.id.slice(0, 8),
    });

    // Send email with attachments
    const emailResult = await emailService.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text: `인보이스 안내: 기간 ${periodStr}, 금액 ${amountStr}. 첨부 PDF/CSV를 확인해주세요.`,
      attachments: [
        {
          filename: `invoice-${invoice.id.slice(0, 8)}-${invoice.period_from}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        {
          filename: `invoice-${invoice.id.slice(0, 8)}-${invoice.period_from}.csv`,
          content: csvBuffer,
          contentType: 'text/csv',
        },
      ],
    } as any);

    if (!emailResult.success) {
      // Log failure but don't change status
      const failEntry: DispatchLogEntry = {
        action: 'sent',
        at: new Date().toISOString(),
        by: sentBy,
        channel: 'email',
        to: recipientEmail,
        note: `Failed: ${emailResult.error}`,
      };

      await this.appendDispatchLog(invoiceId, failEntry);
      throw new Error(`Email send failed: ${emailResult.error}`);
    }

    // Update dispatch status
    const now = new Date().toISOString();
    const isResend = invoice.dispatch_status === 'SENT' || invoice.dispatch_status === 'RECEIVED';
    const logEntry: DispatchLogEntry = {
      action: isResend ? 'resent' : 'sent',
      at: now,
      by: sentBy,
      channel: 'email',
      to: recipientEmail,
    };

    await this.dataSource.query(
      `UPDATE glycopharm_billing_invoices
       SET dispatch_status = 'SENT',
           dispatched_at = $1,
           dispatched_to = $2,
           dispatch_log = COALESCE(dispatch_log, '[]'::jsonb) || $3::jsonb,
           updated_at = $1
       WHERE id = $4`,
      [now, recipientEmail, JSON.stringify([logEntry]), invoiceId],
    );

    return this.getDispatchStatus(invoiceId);
  }

  /**
   * 수령 확인 처리
   */
  async markInvoiceReceived(invoiceId: string, markedBy: string): Promise<DispatchResult> {
    const rows = await this.dataSource.query(
      `SELECT * FROM glycopharm_billing_invoices WHERE id = $1`,
      [invoiceId],
    );

    if (rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = rows[0];

    if (invoice.dispatch_status === 'NONE') {
      throw new Error('Cannot mark as received: invoice has not been sent yet');
    }

    const now = new Date().toISOString();
    const logEntry: DispatchLogEntry = {
      action: 'received',
      at: now,
      by: markedBy,
      channel: 'email',
    };

    await this.dataSource.query(
      `UPDATE glycopharm_billing_invoices
       SET dispatch_status = 'RECEIVED',
           received_at = $1,
           dispatch_log = COALESCE(dispatch_log, '[]'::jsonb) || $2::jsonb,
           updated_at = $1
       WHERE id = $3`,
      [now, JSON.stringify([logEntry]), invoiceId],
    );

    return this.getDispatchStatus(invoiceId);
  }

  /**
   * 발송 상태/이력 조회
   */
  async getDispatchStatus(invoiceId: string): Promise<DispatchResult> {
    const rows = await this.dataSource.query(
      `SELECT id, dispatch_status, dispatched_at, dispatched_to, received_at, dispatch_log
       FROM glycopharm_billing_invoices WHERE id = $1`,
      [invoiceId],
    );

    if (rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const r = rows[0];
    return {
      invoiceId: r.id,
      dispatchStatus: r.dispatch_status || 'NONE',
      dispatchedAt: r.dispatched_at,
      dispatchedTo: r.dispatched_to,
      receivedAt: r.received_at,
      dispatchLog: r.dispatch_log || [],
    };
  }

  private async appendDispatchLog(invoiceId: string, entry: DispatchLogEntry): Promise<void> {
    await this.dataSource.query(
      `UPDATE glycopharm_billing_invoices
       SET dispatch_log = COALESCE(dispatch_log, '[]'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify([entry]), invoiceId],
    );
  }

  /**
   * PDF 생성 (텍스트 중심, 1장)
   */
  private generateInvoicePdf(invoice: any, pharmacyName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const periodFrom = invoice.period_from?.slice(0, 10) || '';
      const periodTo = invoice.period_to?.slice(0, 10) || '';
      const unitLabel = invoice.unit === 'consultation_action' ? 'Consultation Action' : 'Approved Request';

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text('o4o Platform - GlycoPharm Consultation Service', { align: 'center' });
      doc.moveDown(1.5);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(1);

      // Invoice Info
      doc.fontSize(10).fillColor('#333');
      doc.text(`Invoice ID: ${invoice.id.slice(0, 8).toUpperCase()}`, { continued: false });
      doc.text(`Date: ${new Date(invoice.snapshot_at || invoice.created_at).toISOString().slice(0, 10)}`);
      doc.text(`Status: ${invoice.status}`);
      doc.moveDown(1);

      // Parties
      doc.fontSize(11).fillColor('#000').text('Bill To:', { underline: true });
      doc.fontSize(10).fillColor('#333');
      doc.text(`Pharmacy: ${pharmacyName}`);
      if (invoice.supplier_id) doc.text(`Supplier ID: ${invoice.supplier_id}`);
      doc.moveDown(1);

      // Period & Billing
      doc.fontSize(11).fillColor('#000').text('Billing Details:', { underline: true });
      doc.fontSize(10).fillColor('#333');
      doc.text(`Period: ${periodFrom} ~ ${periodTo}`);
      doc.text(`Billing Unit: ${unitLabel}`);
      doc.moveDown(0.5);

      // Amount table
      const tableY = doc.y;
      doc.rect(50, tableY, 495, 20).fill('#f0f0f0');
      doc.fillColor('#333').fontSize(9);
      doc.text('Unit Price', 60, tableY + 5);
      doc.text('Count', 220, tableY + 5);
      doc.text('Total Amount', 370, tableY + 5);

      const rowY = tableY + 25;
      doc.fontSize(11).fillColor('#000');
      doc.text(`KRW ${Number(invoice.unit_price).toLocaleString()}`, 60, rowY);
      doc.text(`${Number(invoice.count).toLocaleString()}`, 220, rowY);
      doc.fontSize(13).text(`KRW ${Number(invoice.amount).toLocaleString()}`, 370, rowY);

      doc.moveDown(3);

      // Divider
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
      doc.moveDown(1);

      // Footer note
      doc.fontSize(9).fillColor('#888');
      doc.text('This is an automatically generated invoice for consultation services.', { align: 'center' });
      doc.text('Payment details will be provided separately.', { align: 'center' });
      doc.moveDown(0.5);
      doc.text(`Generated: ${new Date().toISOString().slice(0, 19)}`, { align: 'center' });

      doc.end();
    });
  }

  /**
   * CSV 생성 (스냅샷 기준)
   */
  private generateInvoiceCsv(invoice: any, pharmacyName: string): Buffer {
    const lines: string[] = [];

    lines.push(`Invoice Snapshot`);
    lines.push(`ID,${invoice.id}`);
    lines.push(`Period,${invoice.period_from} ~ ${invoice.period_to}`);
    lines.push(`Pharmacy,${pharmacyName}`);
    lines.push(`Unit,${invoice.unit}`);
    lines.push(`Unit Price,${invoice.unit_price}`);
    lines.push(`Count,${invoice.count}`);
    lines.push(`Amount,${invoice.amount}`);
    lines.push(`Status,${invoice.status}`);
    lines.push('');

    const lineSnapshot = invoice.line_snapshot || [];
    if (lineSnapshot.length > 0) {
      lines.push('Date,Source ID,Request ID,Action Type,Unit Price');
      for (const d of lineSnapshot) {
        lines.push(`${d.date},${d.sourceId || ''},${d.requestId},${d.actionType},${d.unitPrice}`);
      }
    }

    const bom = '\uFEFF';
    return Buffer.from(bom + lines.join('\n'), 'utf-8');
  }

  /**
   * 이메일 HTML 생성
   */
  private buildEmailHtml(data: {
    pharmacyName: string;
    periodStr: string;
    unit: string;
    unitPrice: string;
    count: string;
    amount: string;
    invoiceId: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>인보이스 안내</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .summary { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .summary-row:last-child { border-bottom: none; }
    .total { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
    .total-amount { font-size: 24px; font-weight: bold; color: #065f46; }
    .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 13px; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin-top: 15px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:22px;">인보이스 안내</h1>
      <p style="margin:5px 0 0;opacity:0.85;font-size:14px;">o4o Platform - GlycoPharm 상담 서비스</p>
    </div>
    <div class="content">
      <p>안녕하세요,</p>
      <p>아래 인보이스를 안내드립니다. 첨부된 PDF 및 CSV 파일을 확인해주세요.</p>

      <div class="summary">
        <div class="summary-row">
          <span style="color:#64748b">인보이스 번호</span>
          <strong>${data.invoiceId}</strong>
        </div>
        <div class="summary-row">
          <span style="color:#64748b">약국</span>
          <strong>${data.pharmacyName}</strong>
        </div>
        <div class="summary-row">
          <span style="color:#64748b">청구 기간</span>
          <strong>${data.periodStr}</strong>
        </div>
        <div class="summary-row">
          <span style="color:#64748b">청구 기준</span>
          <strong>${data.unit}</strong>
        </div>
        <div class="summary-row">
          <span style="color:#64748b">단가</span>
          <strong>\\u20A9${data.unitPrice}</strong>
        </div>
        <div class="summary-row">
          <span style="color:#64748b">건수</span>
          <strong>${data.count}건</strong>
        </div>
      </div>

      <div class="total">
        <div style="font-size:13px;color:#059669;margin-bottom:5px;">총 청구 금액</div>
        <div class="total-amount">${data.amount}</div>
      </div>

      <div class="note">
        결제는 별도 안내 예정입니다. 문의사항이 있으시면 아래 연락처로 연락해주세요.
      </div>

      <div class="footer">
        <p>o4o Platform<br>support@neture.co.kr</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
