/**
 * CheckoutOrder Entity
 *
 * Phase N-2: 운영 안정화
 * Phase 5-A′: E-commerce Core 주문 표준화
 *
 * 실거래 MVP용 주문 엔티티
 * - Phase N-1 In-memory 구조의 DB 영속화 버전
 * - Phase 5-A′: 모든 서비스의 주문은 이 엔티티를 통해서만 생성
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
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
 * 주문 유형 (서비스 식별)
 *
 * Phase 5-A′: 모든 주문은 반드시 orderType을 가져야 함
 *
 * @rule orderType 없는 주문 생성 불가
 * @rule orderType은 생성 후 변경 불가 (immutable)
 */
export enum OrderType {
  /** 일반 주문 (기본값) */
  GENERIC = 'GENERIC',
  /** 드롭쉬핑 주문 */
  DROPSHIPPING = 'DROPSHIPPING',
  /** GlycoPharm 약국 주문 */
  GLYCOPHARM = 'GLYCOPHARM',
  /** Cosmetics 화장품 주문 */
  COSMETICS = 'COSMETICS',
  /** Tourism 관광 주문 */
  TOURISM = 'TOURISM',
}

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
   * 주문 유형 (서비스 식별)
   *
   * Phase 5-A′: 모든 주문은 반드시 orderType을 가져야 함
   * - GENERIC: 일반 주문 (기본값, 하위 호환성)
   * - DROPSHIPPING: 드롭쉬핑 주문
   * - GLYCOPHARM: GlycoPharm 약국 주문
   * - COSMETICS: Cosmetics 화장품 주문
   * - TOURISM: Tourism 관광 주문
   *
   * @immutable 생성 후 변경 불가
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.GENERIC,
  })
  orderType!: OrderType;

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
