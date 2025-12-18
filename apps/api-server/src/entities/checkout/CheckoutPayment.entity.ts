/**
 * CheckoutPayment Entity
 *
 * Phase N-2: 운영 안정화
 *
 * 결제 기록 엔티티
 */

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

/**
 * 결제 트랜잭션 상태
 */
export enum CheckoutPaymentTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('checkout_payments')
export class CheckoutPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * PG사 결제 키 (Toss paymentKey)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentKey?: string;

  /**
   * PG사
   */
  @Column({ type: 'varchar', length: 50, default: 'toss' })
  pgProvider!: string;

  /**
   * 결제 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  /**
   * 환불 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundedAmount!: number;

  /**
   * 결제 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: CheckoutPaymentTransactionStatus,
    default: CheckoutPaymentTransactionStatus.PENDING,
  })
  status!: CheckoutPaymentTransactionStatus;

  /**
   * 결제 수단
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  method?: string;

  /**
   * 카드사
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
   * 실패 사유
   */
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /**
   * 환불 사유
   */
  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  /**
   * PG사 응답 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 결제 승인 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  /**
   * 실패 시점
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

  // Relations
  @ManyToOne('CheckoutOrder', 'payments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: unknown;
}
