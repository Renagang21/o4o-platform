import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Payment } from './Payment';

export enum SettlementStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum RecipientType {
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
  PLATFORM = 'platform'
}

export interface BankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
}

@Entity('payment_settlements')
@Index(['paymentId'])
@Index(['recipientType', 'recipientId'])
@Index(['status'])
@Index(['scheduledAt'])
export class PaymentSettlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 결제 정보
  @Column({ type: 'uuid' })
  paymentId!: string;

  @ManyToOne(() => Payment, payment => payment.settlements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment!: Payment;

  // 정산 대상
  @Column({
    type: 'enum',
    enum: RecipientType
  })
  recipientType!: RecipientType;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @Column()
  recipientName!: string;

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ default: 'KRW' })
  currency!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee!: number; // 정산 수수료

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax!: number; // 세금

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  netAmount!: number; // 실제 정산 금액 (amount - fee - tax)

  // 상태
  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING
  })
  status!: SettlementStatus;

  // 정산 일정
  @Column({ type: 'timestamp' })
  scheduledAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // 계좌 정보
  @Column({ type: 'jsonb', nullable: true })
  bankAccount?: BankAccount;

  // 거래 증빙
  @Column({ type: 'text', nullable: true })
  transactionId?: string; // 정산 시스템 거래 ID

  @Column({ type: 'text', nullable: true })
  transactionProof?: string; // 거래 증빙 URL 또는 참조

  @Column({ type: 'text', nullable: true })
  receiptUrl?: string; // 영수증 URL

  // 실패 정보
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  // 메모
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // 메타데이터
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods
  isPending(): boolean {
    return this.status === SettlementStatus.PENDING || this.status === SettlementStatus.SCHEDULED;
  }

  isCompleted(): boolean {
    return this.status === SettlementStatus.COMPLETED;
  }

  canBeRetried(): boolean {
    return this.status === SettlementStatus.FAILED && this.retryCount < 3;
  }

  calculateNetAmount(): number {
    return this.amount - this.fee - this.tax;
  }
}
