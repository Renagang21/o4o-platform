import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { Order } from './Order.js';
import { PaymentSettlement } from './PaymentSettlement.js';

export enum PaymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_DEPOSIT = 'waiting_for_deposit',
  DONE = 'done',
  CANCELED = 'canceled',
  PARTIAL_CANCELED = 'partial_canceled',
  ABORTED = 'aborted',
  EXPIRED = 'expired'
}

export enum PaymentMethod {
  CARD = 'card',
  VIRTUAL_ACCOUNT = 'virtual_account',
  TRANSFER = 'transfer',
  MOBILE_PHONE = 'mobile_phone',
  KAKAO_PAY = 'kakao_pay',
  NAVER_PAY = 'naver_pay',
  TOSS_PAY = 'toss_pay',
  PAYCO = 'payco',
  EASY_PAY = 'easy_pay'
}

export interface CardDetails {
  company: string;
  number: string;
  installmentPlanMonths: number;
  isInterestFree: boolean;
  approveNo: string;
  useCardPoint: boolean;
  cardType: string;
  ownerType: string;
  acquireStatus: string;
  receiptUrl: string;
}

export interface VirtualAccountDetails {
  accountType: string;
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: string;
  expired: boolean;
  settlementStatus: string;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

export interface EasyPayDetails {
  provider: string;
  amount: number;
  discountAmount: number;
}

@Entity('payments')
@Index(['orderId'])
@Index(['paymentKey'], { unique: true })
@Index(['status'])
@Index(['requestedAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 주문 정보
  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne('Order', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  // 토스페이먼츠 식별자
  @Column({ type: 'varchar', unique: true, nullable: true })
  paymentKey?: string;

  @Column({ type: 'varchar', nullable: true })
  transactionId?: string;

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balanceAmount!: number; // 취소 가능 금액

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  suppliedAmount!: number; // 공급가액

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vat!: number; // 부가세

  @Column({ type: 'varchar', default: 'KRW' })
  currency!: string;

  // 결제 수단
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  method?: PaymentMethod;

  @Column({ type: 'jsonb', nullable: true })
  methodDetails?: CardDetails | VirtualAccountDetails | EasyPayDetails;

  // 상태
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status!: PaymentStatus;

  // 타임스탬프
  @CreateDateColumn()
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 고객 정보
  @Column({ type: 'varchar', nullable: true })
  customerEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  customerName?: string;

  @Column({ type: 'varchar', nullable: true })
  customerMobilePhone?: string;

  // 주문 정보
  @Column({ type: 'varchar' })
  orderName!: string;

  // 웹훅 및 응답 데이터
  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  webhookReceived!: boolean;

  // 환불 정보
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cancelAmount!: number;

  @Column({ type: 'text', nullable: true })
  cancelReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  cancels?: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
    transactionKey: string;
  }>;

  // 실패 정보
  @Column({ type: 'text', nullable: true })
  failureCode?: string;

  @Column({ type: 'text', nullable: true })
  failureMessage?: string;

  // 메타데이터
  @Column({ type: 'varchar', nullable: true })
  customerIp?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  // Redirect URLs
  @Column({ type: 'text', nullable: true })
  successUrl?: string;

  @Column({ type: 'text', nullable: true })
  failUrl?: string;

  // 멱등성 키 (중복 요청 방지)
  @Column({ type: 'varchar', nullable: true })
  @Index()
  confirmIdempotencyKey?: string; // 결제 승인 멱등성 키

  @Column({ type: 'varchar', nullable: true })
  @Index()
  cancelIdempotencyKey?: string; // 결제 취소 멱등성 키

  // Relations
  @OneToMany('PaymentSettlement', 'payment')
  settlements!: PaymentSettlement[];

  // Helper Methods
  isPaid(): boolean {
    return this.status === PaymentStatus.DONE;
  }

  canBeCanceled(): boolean {
    return this.status === PaymentStatus.DONE && this.balanceAmount > 0;
  }

  getTotalCanceledAmount(): number {
    return this.cancelAmount;
  }

  getRemainingAmount(): number {
    return this.amount - this.cancelAmount;
  }
}
