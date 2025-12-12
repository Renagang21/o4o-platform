import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FeeInvoice } from './FeeInvoice.js';

/**
 * PaymentMethod
 * 납부 방법
 */
export type PaymentMethod =
  | 'cash'              // 현금
  | 'bank_transfer'     // 무통장 입금
  | 'virtual_account'   // 가상계좌
  | 'card'              // 카드
  | 'mobile'            // 모바일 결제
  | 'pg'                // PG 결제
  | 'other';            // 기타

/**
 * PaymentStatus
 * 납부 상태
 */
export type PaymentStatus =
  | 'pending'     // 처리 대기
  | 'completed'   // 완료
  | 'failed'      // 실패
  | 'refunded'    // 환불됨
  | 'cancelled';  // 취소됨

/**
 * FeePayment Entity
 *
 * 회비 납부 내역
 * 각 납부 건에 대한 상세 정보
 */
@Entity('yaksa_fee_payments')
@Index(['invoiceId'])
@Index(['memberId'])
@Index(['status'])
@Index(['paidAt'])
@Index(['receiptNumber'], { unique: true })
export class FeePayment {
  /**
   * 납부 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 청구서 ID (FK → yaksa_fee_invoices.id)
   */
  @Column({ type: 'uuid' })
  invoiceId!: string;

  /**
   * 청구서 관계
   */
  @ManyToOne('FeeInvoice', (invoice: FeeInvoice) => invoice.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: FeeInvoice;

  /**
   * 회원 ID (FK → yaksa_members.id)
   *
   * 청구서와 별개로 회원 직접 참조 (조회 편의)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 납부 금액 (원)
   */
  @Column({ type: 'integer' })
  amount!: number;

  /**
   * 납부 방법
   */
  @Column({
    type: 'varchar',
    length: 30,
    default: 'cash',
  })
  method!: PaymentMethod;

  /**
   * 납부 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: PaymentStatus;

  /**
   * 납부일시
   */
  @Column({ type: 'timestamp' })
  paidAt!: Date;

  /**
   * 영수증 번호
   *
   * 형식: YYYY-XXXXXX (예: 2025-000001)
   */
  @Column({ type: 'varchar', length: 20, unique: true })
  receiptNumber!: string;

  // PG 결제 정보

  /**
   * PG사
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  pgProvider?: string;

  /**
   * PG 거래 ID
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string;

  /**
   * 승인 번호
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  approvalNumber?: string;

  /**
   * 카드사/은행명
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  cardOrBankName?: string;

  /**
   * 카드/계좌 마지막 4자리
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  lastFourDigits?: string;

  // 수납 정보 (현금/무통장)

  /**
   * 수납자 ID (분회 담당자)
   */
  @Column({ type: 'uuid', nullable: true })
  collectorId?: string;

  /**
   * 수납자 이름
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  collectorName?: string;

  /**
   * 수납 확인일시
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  /**
   * 수납 확인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  confirmedBy?: string;

  // 환불 정보

  /**
   * 환불일시
   */
  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  /**
   * 환불 금액
   */
  @Column({ type: 'integer', nullable: true })
  refundAmount?: number;

  /**
   * 환불 사유
   */
  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  /**
   * 환불 처리자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  refundedBy?: string;

  /**
   * 영수증 URL (PDF)
   */
  @Column({ type: 'text', nullable: true })
  receiptUrl?: string;

  /**
   * 메모
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

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

  // Helper Methods

  /**
   * 환불 가능 여부 확인
   */
  canRefund(): boolean {
    return this.status === 'completed';
  }

  /**
   * 환불 처리
   */
  processRefund(amount: number, reason: string, refundedBy: string): void {
    this.status = 'refunded';
    this.refundedAt = new Date();
    this.refundAmount = amount;
    this.refundReason = reason;
    this.refundedBy = refundedBy;
  }

  /**
   * 납부 완료 처리
   */
  markAsCompleted(): void {
    this.status = 'completed';
    this.confirmedAt = new Date();
  }

  /**
   * 납부 방법 표시명
   */
  getMethodDisplayName(): string {
    const names: Record<PaymentMethod, string> = {
      cash: '현금',
      bank_transfer: '무통장 입금',
      virtual_account: '가상계좌',
      card: '카드',
      mobile: '모바일 결제',
      pg: 'PG 결제',
      other: '기타',
    };
    return names[this.method];
  }
}
