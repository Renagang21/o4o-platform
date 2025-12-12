/**
 * EcommercePayment Entity
 *
 * 결제 기록
 *
 * 주문에 대한 결제 시도 및 결과를 기록합니다.
 * 하나의 주문에 여러 결제 시도가 있을 수 있습니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EcommerceOrder } from './EcommerceOrder.entity.js';

/**
 * 결제 트랜잭션 상태
 */
export enum PaymentTransactionStatus {
  PENDING = 'pending',           // 결제 대기
  PROCESSING = 'processing',     // 처리 중
  COMPLETED = 'completed',       // 결제 완료
  FAILED = 'failed',             // 결제 실패
  CANCELLED = 'cancelled',       // 결제 취소
  REFUNDED = 'refunded',         // 환불 완료
  PARTIAL_REFUND = 'partial_refund', // 부분 환불
}

/**
 * 결제 수단
 */
export enum PaymentMethod {
  CARD = 'card',                 // 신용/체크카드
  BANK_TRANSFER = 'bank_transfer', // 계좌이체
  VIRTUAL_ACCOUNT = 'virtual_account', // 가상계좌
  PHONE = 'phone',               // 휴대폰 결제
  POINT = 'point',               // 포인트 결제
  COUPON = 'coupon',             // 쿠폰
  CASH = 'cash',                 // 현금
  OTHER = 'other',               // 기타
}

@Entity('ecommerce_payments')
export class EcommercePayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * 결제 트랜잭션 ID (내부)
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  transactionId!: string;

  /**
   * 외부 결제 ID (PG사 등)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalPaymentId?: string;

  /**
   * 결제 수단
   */
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  paymentMethod!: PaymentMethod;

  /**
   * 결제 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status!: PaymentTransactionStatus;

  /**
   * 결제 요청 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  requestedAmount!: number;

  /**
   * 실제 결제 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  /**
   * 환불 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundedAmount!: number;

  /**
   * 통화
   */
  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  /**
   * PG사 정보
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  pgProvider?: string;

  /**
   * 카드사 정보 (카드 결제 시)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  cardCompany?: string;

  /**
   * 카드 번호 (마스킹)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  cardNumber?: string;

  /**
   * 할부 개월
   */
  @Column({ type: 'int', default: 0 })
  installmentMonths!: number;

  /**
   * 결제 실패 사유
   */
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /**
   * 환불 사유
   */
  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  /**
   * 메타데이터 (PG사 응답 등)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 결제 요청 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  requestedAt?: Date;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 결제 실패 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  /**
   * 환불 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ===== Relations =====

  @ManyToOne(() => EcommerceOrder, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: EcommerceOrder;
}
