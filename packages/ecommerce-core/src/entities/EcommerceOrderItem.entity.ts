/**
 * EcommerceOrderItem Entity
 *
 * 주문 상품 항목
 *
 * EcommerceOrder에 포함된 개별 상품 정보를 관리합니다.
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
import type { EcommerceOrder } from './EcommerceOrder.entity.js';

/**
 * 주문 항목 상태
 */
export enum OrderItemStatus {
  PENDING = 'pending',           // 대기
  CONFIRMED = 'confirmed',       // 확정
  PROCESSING = 'processing',     // 처리 중
  SHIPPED = 'shipped',           // 배송 중
  DELIVERED = 'delivered',       // 배송 완료
  CANCELLED = 'cancelled',       // 취소
  REFUNDED = 'refunded',         // 환불
}

@Entity('ecommerce_order_items')
export class EcommerceOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * 상품 ID (외부 참조)
   * - ProductMaster ID
   * - 또는 외부 상품 시스템의 ID
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  /**
   * 외부 상품 ID (채널별)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalProductId?: string;

  /**
   * 상품명 (스냅샷)
   */
  @Column({ type: 'varchar', length: 500 })
  productName!: string;

  /**
   * SKU
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  /**
   * 옵션 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  options?: Record<string, any>;

  /**
   * 수량
   */
  @Column({ type: 'int' })
  quantity!: number;

  /**
   * 단가 (할인 전)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  /**
   * 할인 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  /**
   * 소계 (quantity * unitPrice - discount)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  /**
   * 항목 상태
   */
  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  status!: OrderItemStatus;

  /**
   * 메타데이터
   * - Dropshipping: listingId, offerId
   * - Retail: stockLocation
   * - 기타 확장 데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ===== Relations =====

  @ManyToOne('EcommerceOrder', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: EcommerceOrder;
}
