/**
 * CheckoutOrder Entity
 *
 * Phase N-2: 운영 안정화
 *
 * 실거래 MVP용 주문 엔티티
 * - Phase N-1 In-memory 구조의 DB 영속화 버전
 * - 향후 EcommerceOrder와 통합 가능
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * 주문 상태
 */
export enum CheckoutOrderStatus {
  CREATED = 'created',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * 결제 상태
 */
export enum CheckoutPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * 배송 주소
 */
export interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

@Entity('checkout_orders')
export class CheckoutOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 번호
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;

  /**
   * 구매자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  buyerId!: string;

  /**
   * 판매자 ID (Platform)
   */
  @Column({ type: 'varchar', length: 100 })
  sellerId!: string;

  /**
   * 공급자 ID
   */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  supplierId!: string;

  /**
   * 파트너 ID (Attribution)
   */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  partnerId?: string;

  /**
   * 상품 금액 합계
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  /**
   * 배송비
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee!: number;

  /**
   * 할인 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  /**
   * 총 결제 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  /**
   * 주문 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: CheckoutOrderStatus,
    default: CheckoutOrderStatus.CREATED,
  })
  status!: CheckoutOrderStatus;

  /**
   * 결제 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: CheckoutPaymentStatus,
    default: CheckoutPaymentStatus.PENDING,
  })
  paymentStatus!: CheckoutPaymentStatus;

  /**
   * 결제 수단
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  /**
   * 배송 주소
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingAddress?: ShippingAddress;

  /**
   * 주문 아이템 (JSON)
   */
  @Column({ type: 'jsonb' })
  items!: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 환불 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  /**
   * 취소 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany('CheckoutPayment', 'order')
  payments?: unknown[];

  @OneToMany('OrderLog', 'orderId')
  logs?: unknown[];
}
