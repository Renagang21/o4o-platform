import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { User } from './User';
import { GatewayResponse, PaymentWebhookData, PaymentDetailsData, PaymentMetadata } from '../types/payment';

export enum PaymentType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund'
}

export enum PaymentProvider {
  IAMPORT = 'iamport',
  TOSS_PAYMENTS = 'toss_payments',
  KAKAO_PAY = 'kakao_pay',
  NAVER_PAY = 'naver_pay',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  MANUAL = 'manual'
}

export enum PaymentGatewayStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orderId!: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  @Column()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  // 결제 타입 및 방법
  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.PAYMENT
  })
  type!: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentProvider
  })
  provider!: PaymentProvider;

  @Column()
  method!: string; // 'card', 'bank_transfer', 'virtual_account', etc.

  // 결제 상태
  @Column({
    type: 'enum',
    enum: PaymentGatewayStatus,
    default: PaymentGatewayStatus.PENDING
  })
  status!: PaymentGatewayStatus;

  // 금액 정보
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'KRW' })
  currency!: string;

  // 게이트웨이 정보
  @Column({ unique: true })
  transactionId!: string; // 내부 거래 ID

  @Column({ nullable: true })
  gatewayTransactionId?: string; // 외부 게이트웨이 거래 ID

  @Column({ nullable: true })
  gatewayPaymentId?: string; // 게이트웨이별 결제 ID

  // 결제 세부 정보
  @Column({ type: 'json', nullable: true })
  paymentDetails?: PaymentDetailsData;

  // 게이트웨이 응답 데이터
  @Column({ type: 'json', nullable: true })
  gatewayResponse?: GatewayResponse;

  @Column({ type: 'json', nullable: true })
  webhookData?: PaymentWebhookData;

  // 실패/취소 정보
  @Column({ nullable: true })
  failureReason?: string;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ nullable: true })
  cancelledBy?: string;

  @Column({ nullable: true })
  cancelledAt?: Date;

  // 환불 정보 (환불의 경우)
  @Column({ nullable: true })
  originalPaymentId?: string; // 원결제 ID

  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  @Column({ nullable: true })
  refundRequestedBy?: string;

  @Column({ nullable: true })
  refundRequestedAt?: Date;

  @Column({ nullable: true })
  refundProcessedAt?: Date;

  // 메타데이터
  @Column({ type: 'json', nullable: true })
  metadata?: PaymentMetadata;

  // Additional properties for compatibility
  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  refundedAmount?: number;

  @Column({ nullable: true })
  failureCode?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 비즈니스 로직 메서드
  generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${timestamp}${random}`;
  }

  isSuccessful(): boolean {
    return this.status === PaymentGatewayStatus.COMPLETED;
  }

  isFailed(): boolean {
    return [
      PaymentGatewayStatus.FAILED,
      PaymentGatewayStatus.CANCELLED,
      PaymentGatewayStatus.EXPIRED
    ].includes(this.status);
  }

  canRefund(): boolean {
    return this.type === PaymentType.PAYMENT && 
           this.status === PaymentGatewayStatus.COMPLETED;
  }

  getMaskedCardNumber(): string | null {
    if (!this.paymentDetails?.cardNumber) return null;
    const card = this.paymentDetails.cardNumber;
    return card.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
  }

  getMaskedAccountNumber(): string | null {
    if (!this.paymentDetails?.accountNumber) return null;
    const account = this.paymentDetails.accountNumber;
    return account.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
  }
}