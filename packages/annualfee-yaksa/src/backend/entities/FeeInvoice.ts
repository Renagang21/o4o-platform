import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { FeePayment } from './FeePayment.js';

/**
 * InvoiceStatus
 * 청구 상태
 */
export type InvoiceStatus =
  | 'draft'      // 임시 저장
  | 'pending'    // 발행 대기
  | 'sent'       // 발송 완료
  | 'partial'    // 부분 납부
  | 'paid'       // 납부 완료
  | 'overdue'    // 연체
  | 'cancelled'  // 취소
  | 'exempted';  // 면제

/**
 * AmountBreakdown
 * 금액 상세 내역
 */
export interface AmountBreakdown {
  baseAmount: number;           // 본회비
  divisionFeeAmount: number;    // 지부비
  branchFeeAmount: number;      // 분회비
  adjustments: Array<{
    type: string;               // pharmacistType, officialRole, exemption
    reason: string;
    amount: number;             // 양수면 추가, 음수면 감면
  }>;
  totalBeforeDiscount: number;
  totalDiscount: number;
  finalAmount: number;
}

/**
 * FeeInvoice Entity
 *
 * 회비 청구서
 * 각 회원에게 발행되는 연회비 청구 정보
 */
@Entity('yaksa_fee_invoices')
@Index(['memberId', 'year'], { unique: true })
@Index(['organizationId'])
@Index(['status'])
@Index(['year'])
@Index(['dueDate'])
@Index(['issuedAt'])
export class FeeInvoice {
  /**
   * 청구서 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 청구 시점 소속 조직 ID (FK → organizations.id)
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 청구 연도
   */
  @Column({ type: 'integer' })
  year!: number;

  /**
   * 적용된 정책 ID (FK → yaksa_fee_policies.id)
   */
  @Column({ type: 'uuid', nullable: true })
  policyId?: string;

  /**
   * 청구 금액 (최종)
   */
  @Column({ type: 'integer' })
  amount!: number;

  /**
   * 금액 상세 내역
   */
  @Column({ type: 'jsonb', nullable: true })
  amountBreakdown?: AmountBreakdown;

  /**
   * 납부된 금액
   */
  @Column({ type: 'integer', default: 0 })
  paidAmount!: number;

  /**
   * 청구 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: InvoiceStatus;

  /**
   * 발행일시
   */
  @Column({ type: 'timestamp', nullable: true })
  issuedAt?: Date;

  /**
   * 발송일시 (이메일/SMS 발송)
   */
  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  /**
   * 납부 기한
   */
  @Column({ type: 'date' })
  dueDate!: string;

  /**
   * 납부 완료일시
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 취소일시
   */
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  /**
   * 취소 사유
   */
  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  /**
   * 취소자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  cancelledBy?: string;

  /**
   * 감면 사유 (exempted 상태일 때)
   */
  @Column({ type: 'text', nullable: true })
  exemptionReason?: string;

  /**
   * 메모 (관리자용)
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * MembershipYear 동기화 완료 여부
   */
  @Column({ type: 'boolean', default: false })
  syncedToMembershipYear!: boolean;

  /**
   * 동기화 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  syncedAt?: Date;

  /**
   * 확장 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations

  /**
   * 납부 내역
   */
  @OneToMany('FeePayment', (payment: FeePayment) => payment.invoice)
  payments?: FeePayment[];

  // Helper Methods

  /**
   * 납부 가능 여부 확인
   */
  canPay(): boolean {
    return ['pending', 'sent', 'partial', 'overdue'].includes(this.status);
  }

  /**
   * 취소 가능 여부 확인
   */
  canCancel(): boolean {
    return ['draft', 'pending', 'sent'].includes(this.status);
  }

  /**
   * 잔액 계산
   */
  getRemainingAmount(): number {
    return Math.max(0, this.amount - this.paidAmount);
  }

  /**
   * 연체 여부 확인
   */
  isOverdue(): boolean {
    if (this.status === 'paid' || this.status === 'cancelled' || this.status === 'exempted') {
      return false;
    }
    const now = new Date();
    const due = new Date(this.dueDate);
    return now > due;
  }

  /**
   * 완납 처리
   */
  markAsPaid(paidAt: Date = new Date()): void {
    this.status = 'paid';
    this.paidAt = paidAt;
    this.paidAmount = this.amount;
  }

  /**
   * 부분 납부 처리
   */
  addPayment(paymentAmount: number): void {
    this.paidAmount += paymentAmount;
    if (this.paidAmount >= this.amount) {
      this.markAsPaid();
    } else {
      this.status = 'partial';
    }
  }
}
