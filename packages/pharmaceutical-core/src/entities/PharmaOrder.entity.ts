/**
 * PharmaOrder Entity
 *
 * 약국의 의약품 B2B 주문
 *
 * Dropshipping의 OrderRelay와 달리, Listing을 경유하지 않고
 * 직접 Offer에서 주문이 생성됩니다.
 *
 * Flow: 약국 → PharmaOffer → PharmaOrder → 도매상/제조사
 *
 * @package @o4o/pharmaceutical-core
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
import { PharmaOffer } from './PharmaOffer.entity.js';

/**
 * 주문 상태
 */
export enum PharmaOrderStatus {
  PENDING = 'pending',             // 주문 접수
  CONFIRMED = 'confirmed',         // 공급자 확인
  PREPARING = 'preparing',         // 출고 준비중
  SHIPPED = 'shipped',             // 출고 완료
  IN_TRANSIT = 'in_transit',       // 배송중
  DELIVERED = 'delivered',         // 배송 완료
  CANCELLED = 'cancelled',         // 취소
  RETURNED = 'returned',           // 반품
  REFUNDED = 'refunded',           // 환불 완료
}

/**
 * 결제 상태
 */
export enum PharmaPaymentStatus {
  PENDING = 'pending',             // 결제 대기
  PAID = 'paid',                   // 결제 완료
  CREDIT = 'credit',               // 외상 (정산 대기)
  REFUNDED = 'refunded',           // 환불
}

@Entity('pharma_orders')
export class PharmaOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Offer ID
   */
  @Index()
  @Column({ type: 'uuid' })
  offerId!: string;

  /**
   * E-commerce Core 주문 ID (Phase 5)
   *
   * E-commerce Core의 EcommerceOrder와 연결됩니다.
   * null인 경우 레거시 주문 또는 직접 API 호출 주문입니다.
   *
   * OrderType: 'b2b' (의약품 B2B 거래)
   */
  @Column({ type: 'uuid', nullable: true })
  ecommerceOrderId?: string;

  /**
   * 약국 ID (구매자)
   */
  @Index()
  @Column({ type: 'uuid' })
  pharmacyId!: string;

  /**
   * 주문 번호 (자동 생성)
   */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  orderNumber!: string;

  /**
   * 주문 수량
   */
  @Column({ type: 'int' })
  quantity!: number;

  /**
   * 단가 (주문 시점 기준)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  /**
   * 할인 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  /**
   * 총 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  /**
   * 주문 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaOrderStatus,
    default: PharmaOrderStatus.PENDING,
  })
  status!: PharmaOrderStatus;

  /**
   * 결제 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaPaymentStatus,
    default: PharmaPaymentStatus.PENDING,
  })
  paymentStatus!: PharmaPaymentStatus;

  /**
   * 희망 배송일
   */
  @Column({ type: 'date', nullable: true })
  requestedDeliveryDate?: Date;

  /**
   * 배송 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingInfo?: {
    address: string;
    zipCode: string;
    contactName: string;
    contactPhone: string;
    specialInstructions?: string;
  };

  /**
   * 배송 추적 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  trackingInfo?: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };

  /**
   * 주문 메모
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * 취소/반품 사유
   */
  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  /**
   * 공급자 확인 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  /**
   * 출고 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  shippedAt?: Date;

  /**
   * 배송 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 정산 배치 ID (정산 완료 시)
   */
  @Column({ type: 'uuid', nullable: true })
  settlementBatchId?: string;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => PharmaOffer, (offer) => offer.orders)
  @JoinColumn({ name: 'offerId' })
  offer?: PharmaOffer;
}
