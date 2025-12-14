/**
 * EcommerceOrder Entity
 *
 * 판매 원장 (Source of Truth)
 *
 * 모든 판매 유형(retail, dropshipping, b2b, subscription)의
 * 주문을 통합 관리하는 원장 엔티티입니다.
 *
 * Dropshipping Core의 OrderRelay, Retail Core의 RetailOrder 등은
 * 이 Entity를 참조하는 파생 구조입니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EcommerceOrderItem } from './EcommerceOrderItem.entity.js';
import { EcommercePayment } from './EcommercePayment.entity.js';

/**
 * 주문 유형
 */
export enum OrderType {
  RETAIL = 'retail',             // 일반 소매
  DROPSHIPPING = 'dropshipping', // 드랍쉬핑
  B2B = 'b2b',                   // B2B 거래
  SUBSCRIPTION = 'subscription', // 정기 구독
}

/**
 * 주문 상태
 */
export enum OrderStatus {
  CREATED = 'created',           // 주문 생성
  PENDING_PAYMENT = 'pending_payment', // 결제 대기
  PAID = 'paid',                 // 결제 완료
  CONFIRMED = 'confirmed',       // 주문 확정
  PROCESSING = 'processing',     // 처리 중
  SHIPPED = 'shipped',           // 배송 시작
  DELIVERED = 'delivered',       // 배송 완료
  COMPLETED = 'completed',       // 주문 완료
  CANCELLED = 'cancelled',       // 주문 취소
  REFUNDED = 'refunded',         // 환불 완료
}

/**
 * 결제 상태
 */
export enum PaymentStatus {
  PENDING = 'pending',           // 결제 대기
  PAID = 'paid',                 // 결제 완료
  FAILED = 'failed',             // 결제 실패
  REFUNDED = 'refunded',         // 환불 완료
  PARTIAL_REFUND = 'partial_refund', // 부분 환불
}

/**
 * 구매자 유형
 */
export enum BuyerType {
  USER = 'user',
  ORGANIZATION = 'organization',
}

/**
 * 판매자 유형
 */
export enum SellerType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
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

@Entity('ecommerce_orders')
export class EcommerceOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 내부 주문 번호
   * 형식: ORD-YYYYMMDD-XXXX
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;

  /**
   * 외부 채널 주문 ID (스마트스토어, 쿠팡 등)
   */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalOrderId?: string;

  // ===== 당사자 정보 =====

  /**
   * 구매자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  buyerId!: string;

  /**
   * 구매자 유형
   */
  @Column({
    type: 'enum',
    enum: BuyerType,
    default: BuyerType.USER,
  })
  buyerType!: BuyerType;

  /**
   * 판매자 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  sellerId!: string;

  /**
   * 판매자 유형
   */
  @Column({
    type: 'enum',
    enum: SellerType,
    default: SellerType.ORGANIZATION,
  })
  sellerType!: SellerType;

  // ===== 금액 정보 =====

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
   * 최종 결제 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  /**
   * 통화
   */
  @Column({ type: 'varchar', length: 3, default: 'KRW' })
  currency!: string;

  // ===== 결제 정보 =====

  /**
   * 결제 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  /**
   * 결제 수단
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // ===== 주문 유형 및 상태 =====

  /**
   * 주문 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.RETAIL,
  })
  orderType!: OrderType;

  /**
   * 주문 상태
   */
  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status!: OrderStatus;

  // ===== 배송 정보 =====

  /**
   * 배송 주소
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingAddress?: ShippingAddress;

  // ===== 메타데이터 =====

  /**
   * 확장 메타데이터
   * - 채널별 특화 데이터
   * - 프로모션 정보
   * - 기타 부가 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ===== 타임스탬프 =====

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ===== Relations =====

  @OneToMany(() => EcommerceOrderItem, (item) => item.order)
  items?: EcommerceOrderItem[];

  @OneToMany(() => EcommercePayment, (payment) => payment.order)
  payments?: EcommercePayment[];
}
