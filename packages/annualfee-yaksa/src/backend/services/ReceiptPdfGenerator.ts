/**
 * ReceiptPdfGenerator
 *
 * 회비 영수증 PDF 생성 서비스
 * - 납부 확인 영수증 생성
 * - 약사회 공식 양식 적용
 * - PDF 파일 생성 및 반환
 *
 * Phase R1.1: MembershipReadPort 사용으로 의존성 전환
 */

import { DataSource, Repository } from 'typeorm';
import { FeePayment } from '../entities/FeePayment.js';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeeLogService } from './FeeLogService.js';
import type { MembershipReadPort, MemberBasicInfo } from '@o4o/membership-yaksa';

export interface ReceiptData {
  // 영수증 기본 정보
  receiptNumber: string;
  issueDate: Date;

  // 납부자 정보
  memberName: string;
  licenseNumber?: string;
  organizationName?: string;

  // 납부 정보
  year: number;
  paymentDate: Date;
  paymentMethod: string;
  amount: number;

  // 금액 내역
  breakdown: {
    baseAmount: number;
    divisionFee: number;
    branchFee: number;
    adjustments?: Array<{ type: string; amount: number; reason: string }>;
  };

  // 발급 기관 정보
  issuerName: string;
  issuerAddress: string;
  issuerPhone: string;
  issuerRegistrationNumber: string;
}

export interface PdfGeneratorResult {
  success: boolean;
  buffer?: Buffer;
  filename?: string;
  error?: string;
}

export class ReceiptPdfGenerator {
  private paymentRepo: Repository<FeePayment>;
  private invoiceRepo: Repository<FeeInvoice>;
  private logService: FeeLogService;
  private membershipPort: MembershipReadPort | null = null;

  // 발급 기관 정보 (약사회)
  private issuerInfo = {
    name: '대한약사회',
    address: '서울특별시 서초구 반포대로 222 (서초동)',
    phone: '02-581-1201',
    registrationNumber: '214-82-00372',
  };

  constructor(private dataSource: DataSource) {
    this.paymentRepo = dataSource.getRepository(FeePayment);
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * Phase R1.1: MembershipReadPort 주입
   */
  setMembershipPort(port: MembershipReadPort): void {
    this.membershipPort = port;
  }

  /**
   * 납부 ID로 영수증 PDF 생성
   */
  async generateReceiptPdf(
    paymentId: string,
    performedBy?: string
  ): Promise<PdfGeneratorResult> {
    // 납부 정보 조회
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: '납부 정보를 찾을 수 없습니다.' };
    }

    if (payment.status !== 'completed') {
      return { success: false, error: '완료된 납부만 영수증을 발급할 수 있습니다.' };
    }

    // 청구서 정보 조회
    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId },
    });

    if (!invoice) {
      return { success: false, error: '청구서 정보를 찾을 수 없습니다.' };
    }

    // Phase R1.1: MembershipReadPort를 통한 회원 정보 조회
    let member: MemberBasicInfo | null = null;
    if (this.membershipPort) {
      member = await this.membershipPort.getMemberById(payment.memberId);
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[ReceiptPdfGenerator] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMember = await memberRepo.findOne({
        where: { id: payment.memberId },
      });
      if (rawMember) {
        const m = rawMember as any;
        member = {
          id: m.id,
          userId: m.userId,
          organizationId: m.organizationId,
          name: m.name,
          email: m.email,
          phone: m.phone,
          licenseNumber: m.licenseNumber,
          registrationNumber: m.registrationNumber,
        };
      }
    }

    if (!member) {
      return { success: false, error: '회원 정보를 찾을 수 없습니다.' };
    }

    // 조직 정보 조회
    let organizationName = '';
    try {
      const orgRepo = this.dataSource.getRepository('Organization');
      const organization = await orgRepo.findOne({
        where: { id: member.organizationId },
      });
      organizationName = (organization as any)?.name || '';
    } catch {
      // Organization 조회 실패 시 무시
    }

    // 영수증 데이터 구성
    const receiptData: ReceiptData = {
      receiptNumber: payment.receiptNumber || this.generateReceiptNumber(payment),
      issueDate: new Date(),
      memberName: member.name,
      licenseNumber: member.licenseNumber,
      organizationName,
      year: invoice.year,
      paymentDate: payment.paidAt,
      paymentMethod: this.getPaymentMethodLabel(payment.method),
      amount: payment.amount,
      breakdown: invoice.amountBreakdown as any,
      issuerName: this.issuerInfo.name,
      issuerAddress: this.issuerInfo.address,
      issuerPhone: this.issuerInfo.phone,
      issuerRegistrationNumber: this.issuerInfo.registrationNumber,
    };

    // PDF 생성
    const pdfBuffer = await this.createPdfBuffer(receiptData);

    // 로그 기록
    await this.logService.log({
      action: 'payment_created',
      entityType: 'payment',
      entityId: paymentId,
      memberId: payment.memberId,
      data: {
        receiptGenerated: true,
        receiptNumber: receiptData.receiptNumber,
        amount: payment.amount,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'user',
    });

    const filename = `receipt_${receiptData.receiptNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return {
      success: true,
      buffer: pdfBuffer,
      filename,
    };
  }

  /**
   * PDF 버퍼 생성
   * (pdfmake 또는 pdf-lib 사용)
   */
  private async createPdfBuffer(data: ReceiptData): Promise<Buffer> {
    // PDF 콘텐츠 구성 (HTML 기반 간이 구현)
    // 실제 배포 시 pdfmake 또는 puppeteer 사용 권장

    const htmlContent = this.generateReceiptHtml(data);

    // 간이 PDF 생성 (텍스트 기반)
    // 실제 환경에서는 pdfmake, puppeteer, 또는 외부 서비스 사용
    const pdfContent = this.convertHtmlToPlainPdf(htmlContent, data);

    return Buffer.from(pdfContent, 'utf-8');
  }

  /**
   * HTML 영수증 생성
   */
  private generateReceiptHtml(data: ReceiptData): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('ko-KR').format(amount);

    const formatDate = (date: Date) =>
      date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>연회비 납부 영수증</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 24px; margin: 0; }
    .header p { margin: 5px 0; color: #666; }
    .receipt-number { font-size: 14px; text-align: right; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .row .label { color: #666; }
    .row .value { font-weight: 500; }
    .amount-section { background: #f5f5f5; padding: 15px; border-radius: 5px; }
    .total { font-size: 20px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
    .stamp { text-align: right; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.issuerName}</h1>
    <p>연회비 납부 영수증</p>
  </div>

  <div class="receipt-number">
    영수증번호: ${data.receiptNumber}<br>
    발급일: ${formatDate(data.issueDate)}
  </div>

  <div class="section">
    <div class="section-title">납부자 정보</div>
    <div class="row">
      <span class="label">성명</span>
      <span class="value">${data.memberName}</span>
    </div>
    ${data.licenseNumber ? `
    <div class="row">
      <span class="label">면허번호</span>
      <span class="value">${data.licenseNumber}</span>
    </div>
    ` : ''}
    ${data.organizationName ? `
    <div class="row">
      <span class="label">소속</span>
      <span class="value">${data.organizationName}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">납부 정보</div>
    <div class="row">
      <span class="label">납부연도</span>
      <span class="value">${data.year}년 연회비</span>
    </div>
    <div class="row">
      <span class="label">납부일</span>
      <span class="value">${formatDate(data.paymentDate)}</span>
    </div>
    <div class="row">
      <span class="label">납부방법</span>
      <span class="value">${data.paymentMethod}</span>
    </div>
  </div>

  <div class="section amount-section">
    <div class="section-title">금액 내역</div>
    <div class="row">
      <span class="label">본회비</span>
      <span class="value">${formatCurrency(data.breakdown.baseAmount)}원</span>
    </div>
    <div class="row">
      <span class="label">지부비</span>
      <span class="value">${formatCurrency(data.breakdown.divisionFee)}원</span>
    </div>
    <div class="row">
      <span class="label">분회비</span>
      <span class="value">${formatCurrency(data.breakdown.branchFee)}원</span>
    </div>
    ${data.breakdown.adjustments?.map(adj => `
    <div class="row">
      <span class="label">${adj.reason}</span>
      <span class="value">${adj.amount > 0 ? '+' : ''}${formatCurrency(adj.amount)}원</span>
    </div>
    `).join('') || ''}
    <div class="row total">
      <span class="label">납부 총액</span>
      <span class="value">${formatCurrency(data.amount)}원</span>
    </div>
  </div>

  <div class="stamp">
    <p>${data.issuerName}</p>
    <p>사업자등록번호: ${data.issuerRegistrationNumber}</p>
    <p>[직인]</p>
  </div>

  <div class="footer">
    <p>${data.issuerAddress}</p>
    <p>Tel: ${data.issuerPhone}</p>
    <p>본 영수증은 연회비 납부를 증명합니다.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * HTML을 간이 PDF 형식으로 변환
   * (실제 환경에서는 puppeteer 또는 pdfmake 사용)
   */
  private convertHtmlToPlainPdf(html: string, data: ReceiptData): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('ko-KR').format(amount);

    const formatDate = (date: Date) =>
      date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    // 텍스트 기반 영수증 (실제로는 PDF 바이너리)
    const textContent = `
================================================================================
                              ${data.issuerName}
                            연회비 납부 영수증
================================================================================

영수증번호: ${data.receiptNumber}
발급일: ${formatDate(data.issueDate)}

--------------------------------------------------------------------------------
[납부자 정보]
--------------------------------------------------------------------------------
성명: ${data.memberName}
${data.licenseNumber ? `면허번호: ${data.licenseNumber}` : ''}
${data.organizationName ? `소속: ${data.organizationName}` : ''}

--------------------------------------------------------------------------------
[납부 정보]
--------------------------------------------------------------------------------
납부연도: ${data.year}년 연회비
납부일: ${formatDate(data.paymentDate)}
납부방법: ${data.paymentMethod}

--------------------------------------------------------------------------------
[금액 내역]
--------------------------------------------------------------------------------
본회비:     ${formatCurrency(data.breakdown.baseAmount).padStart(15)}원
지부비:     ${formatCurrency(data.breakdown.divisionFee).padStart(15)}원
분회비:     ${formatCurrency(data.breakdown.branchFee).padStart(15)}원
${data.breakdown.adjustments?.map(adj =>
  `${adj.reason}:     ${(adj.amount > 0 ? '+' : '') + formatCurrency(adj.amount).padStart(15)}원`
).join('\n') || ''}
--------------------------------------------------------------------------------
납부 총액:  ${formatCurrency(data.amount).padStart(15)}원
================================================================================

                                              ${data.issuerName}
                                 사업자등록번호: ${data.issuerRegistrationNumber}
                                              [직인]

--------------------------------------------------------------------------------
${data.issuerAddress}
Tel: ${data.issuerPhone}

본 영수증은 연회비 납부를 증명합니다.
================================================================================
    `.trim();

    return textContent;
  }

  /**
   * 영수증 번호 생성
   */
  private generateReceiptNumber(payment: FeePayment): string {
    const date = payment.paidAt;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    return `R${year}${month}${day}-${random}`;
  }

  /**
   * 납부 방법 라벨
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: '현금',
      bank_transfer: '계좌이체',
      card: '신용카드',
      virtual_account: '가상계좌',
      auto_debit: '자동이체',
    };
    return labels[method] || method;
  }

  /**
   * 영수증 HTML 반환 (웹 표시용)
   */
  async getReceiptHtml(paymentId: string): Promise<{ success: boolean; html?: string; error?: string }> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      return { success: false, error: '납부 정보를 찾을 수 없습니다.' };
    }

    const invoice = await this.invoiceRepo.findOne({ where: { id: payment.invoiceId } });
    if (!invoice) {
      return { success: false, error: '청구서 정보를 찾을 수 없습니다.' };
    }

    // Phase R1.1: MembershipReadPort를 통한 회원 정보 조회
    let member: MemberBasicInfo | null = null;
    if (this.membershipPort) {
      member = await this.membershipPort.getMemberById(payment.memberId);
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[ReceiptPdfGenerator] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMember = await memberRepo.findOne({ where: { id: payment.memberId } });
      if (rawMember) {
        const m = rawMember as any;
        member = {
          id: m.id,
          userId: m.userId,
          organizationId: m.organizationId,
          name: m.name,
          email: m.email,
          phone: m.phone,
          licenseNumber: m.licenseNumber,
          registrationNumber: m.registrationNumber,
        };
      }
    }

    if (!member) {
      return { success: false, error: '회원 정보를 찾을 수 없습니다.' };
    }

    let organizationName = '';
    try {
      const orgRepo = this.dataSource.getRepository('Organization');
      const organization = await orgRepo.findOne({
        where: { id: member.organizationId },
      });
      organizationName = (organization as any)?.name || '';
    } catch {
      // ignore
    }

    const receiptData: ReceiptData = {
      receiptNumber: payment.receiptNumber || this.generateReceiptNumber(payment),
      issueDate: new Date(),
      memberName: member.name,
      licenseNumber: member.licenseNumber,
      organizationName,
      year: invoice.year,
      paymentDate: payment.paidAt,
      paymentMethod: this.getPaymentMethodLabel(payment.method),
      amount: payment.amount,
      breakdown: invoice.amountBreakdown as any,
      issuerName: this.issuerInfo.name,
      issuerAddress: this.issuerInfo.address,
      issuerPhone: this.issuerInfo.phone,
      issuerRegistrationNumber: this.issuerInfo.registrationNumber,
    };

    return {
      success: true,
      html: this.generateReceiptHtml(receiptData),
    };
  }
}

export function createReceiptPdfGenerator(dataSource: DataSource): ReceiptPdfGenerator {
  return new ReceiptPdfGenerator(dataSource);
}
