import { DataSource, Repository } from 'typeorm';
import { FeeInvoiceService } from './FeeInvoiceService.js';
import { FeePaymentService } from './FeePaymentService.js';
import { FeeExemptionService } from './FeeExemptionService.js';
import { FeeCalculationService, MemberFeeContext } from './FeeCalculationService.js';
import { FeeInvoice } from '../entities/FeeInvoice.js';

/**
 * MemberFeeStatus
 * 회원의 회비 상태
 */
export interface MemberFeeStatus {
  memberId: string;
  year: number;
  status: 'paid' | 'unpaid' | 'partial' | 'exempt' | 'overdue' | 'pending';
  invoice?: {
    id: string;
    amount: number;
    paidAmount: number;
    dueDate: string;
    status: string;
  };
  exemptions?: Array<{
    category: string;
    reason: string;
    amount: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paidAt: Date;
    method: string;
    receiptNumber: string;
  }>;
  calculatedAmount?: number;
  finalAmount?: number;
}

/**
 * MemberFeeService
 *
 * 회원별 회비 상태 관리 서비스
 * Membership-Yaksa와 AnnualFee-Yaksa 간의 통합 인터페이스
 */
export class MemberFeeService {
  private invoiceService: FeeInvoiceService;
  private paymentService: FeePaymentService;
  private exemptionService: FeeExemptionService;
  private calculationService: FeeCalculationService;

  constructor(private dataSource: DataSource) {
    this.invoiceService = new FeeInvoiceService(dataSource);
    this.paymentService = new FeePaymentService(dataSource);
    this.exemptionService = new FeeExemptionService(dataSource);
    this.calculationService = new FeeCalculationService(dataSource);
  }

  /**
   * 회원 회비 상태 조회
   */
  async getMemberFeeStatus(
    memberId: string,
    year?: number
  ): Promise<MemberFeeStatus> {
    const targetYear = year ?? new Date().getFullYear();

    // 청구서 조회
    const invoice = await this.invoiceService.findByMemberAndYear(
      memberId,
      targetYear
    );

    // 청구서가 없으면 pending 상태
    if (!invoice) {
      return {
        memberId,
        year: targetYear,
        status: 'pending',
      };
    }

    // 납부 내역 조회
    const payments = await this.paymentService.findByMember(memberId);
    const yearPayments = payments.filter(
      (p) => p.invoice?.year === targetYear && p.status === 'completed'
    );

    // 감면 내역 조회
    const exemptions = await this.exemptionService.findApprovedByMemberAndYear(
      memberId,
      targetYear
    );

    // 상태 결정
    let status: MemberFeeStatus['status'];
    if (invoice.status === 'exempted') {
      status = 'exempt';
    } else if (invoice.status === 'paid') {
      status = 'paid';
    } else if (invoice.status === 'partial') {
      status = 'partial';
    } else if (invoice.isOverdue()) {
      status = 'overdue';
    } else {
      status = 'unpaid';
    }

    return {
      memberId,
      year: targetYear,
      status,
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        paidAmount: invoice.paidAmount,
        dueDate: invoice.dueDate,
        status: invoice.status,
      },
      exemptions: exemptions.map((e) => ({
        category: e.category,
        reason: e.reason,
        amount: e.exemptionAmount || 0,
      })),
      payments: yearPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paidAt: p.paidAt,
        method: p.method,
        receiptNumber: p.receiptNumber,
      })),
      finalAmount: invoice.amount,
    };
  }

  /**
   * 회원 회비 계산 미리보기
   */
  async calculateMemberFee(
    context: MemberFeeContext,
    year?: number
  ): Promise<{
    breakdown: any;
    exemptions: any[];
    finalAmount: number;
    isExempt: boolean;
    exemptReason?: string;
  }> {
    const result = await this.calculationService.calculateFee(context, year);

    return {
      breakdown: result.breakdown,
      exemptions: result.exemptions,
      finalAmount: result.breakdown.finalAmount,
      isExempt: result.isExempt,
      exemptReason: result.exemptReason,
    };
  }

  /**
   * 회원의 과거 회비 이력 조회
   */
  async getMemberFeeHistory(memberId: string): Promise<MemberFeeStatus[]> {
    const invoices = await this.invoiceService.findByMember(memberId);

    const history: MemberFeeStatus[] = [];

    for (const invoice of invoices) {
      const status = await this.getMemberFeeStatus(memberId, invoice.year);
      history.push(status);
    }

    return history;
  }

  /**
   * 회원 영수증 목록 조회
   */
  async getMemberReceipts(
    memberId: string
  ): Promise<
    Array<{
      year: number;
      receiptNumber: string;
      amount: number;
      paidAt: Date;
      method: string;
      receiptUrl?: string;
    }>
  > {
    const payments = await this.paymentService.findByMember(memberId);

    return payments
      .filter((p) => p.status === 'completed')
      .map((p) => ({
        year: p.invoice?.year || 0,
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paidAt: p.paidAt,
        method: p.method,
        receiptUrl: p.receiptUrl,
      }));
  }

  /**
   * 회원의 현재 연도 회비 납부 여부
   */
  async isPaidForCurrentYear(memberId: string): Promise<boolean> {
    const status = await this.getMemberFeeStatus(memberId);
    return status.status === 'paid' || status.status === 'exempt';
  }

  /**
   * 회원의 회비 관련 요약 정보
   *
   * Member.computedStatus에 추가될 정보
   */
  async getMemberFeeSummary(memberId: string): Promise<{
    feeStatus: 'paid' | 'unpaid' | 'partial' | 'exempt' | 'overdue' | 'pending';
    feeAmount: number;
    exemptionReason?: string;
    lastPaidYear?: number;
    unpaidYears: number[];
  }> {
    const currentYear = new Date().getFullYear();
    const status = await this.getMemberFeeStatus(memberId, currentYear);

    // 미납 연도 조회 (최근 5년)
    const unpaidYears: number[] = [];
    for (let y = currentYear - 5; y < currentYear; y++) {
      const yearStatus = await this.getMemberFeeStatus(memberId, y);
      if (yearStatus.status === 'unpaid' || yearStatus.status === 'overdue') {
        unpaidYears.push(y);
      }
    }

    // 마지막 납부 연도 조회
    const receipts = await this.getMemberReceipts(memberId);
    const lastPaidYear = receipts.length > 0
      ? Math.max(...receipts.map((r) => r.year))
      : undefined;

    return {
      feeStatus: status.status,
      feeAmount: status.invoice?.amount || 0,
      exemptionReason: status.status === 'exempt'
        ? status.exemptions?.[0]?.reason
        : undefined,
      lastPaidYear,
      unpaidYears,
    };
  }
}
