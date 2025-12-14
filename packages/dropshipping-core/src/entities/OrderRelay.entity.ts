/**
 * OrderRelay Entity
 *
 * 주문 → 공급자 전달 및 상태 추적
 *
 * 판매자의 채널에서 발생한 주문을 공급자에게 relay하고,
 * 전체 주문 lifecycle을 추적합니다.
 *
 * NOTE: Phase 2 - E-commerce Core Integration
 * - ecommerceOrderId: E-commerce Core의 EcommerceOrder에 대한 FK 참조
 * - EcommerceOrder가 판매 원장(Source of Truth)으로서 주문/결제를 통합 관리
 * - OrderRelay는 Dropshipping 특화 Relay 정보만 담당
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { SellerListing } from './SellerListing.entity.js';
import { CommissionTransaction } from './CommissionTransaction.entity.js';

export enum OrderRelayStatus {
  PENDING = 'pending',               // 주문 접수
  RELAYED = 'relayed',              // 공급자 전달 완료
  CONFIRMED = 'confirmed',          // 공급자 확인
  SHIPPED = 'shipped',              // 출고 완료
  DELIVERED = 'delivered',          // 배송 완료
  CANCELLED = 'cancelled',          // 취소
  REFUNDED = 'refunded',            // 환불
}

@Entity('dropshipping_order_relays')
export class OrderRelay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * E-commerce Core의 EcommerceOrder에 대한 FK 참조
   * - EcommerceOrder가 판매 원장(Source of Truth)
   * - nullable: 기존 데이터 호환성 및 점진적 마이그레이션 지원
   */
  @Column({ type: 'uuid', nullable: true })
  ecommerceOrderId?: string;

  @Column({ type: 'uuid' })
  listingId!: string;

  /**
   * E-commerce Core 주문 ID (Phase 4)
   *
   * E-commerce Core의 EcommerceOrder와 연결됩니다.
   * null인 경우 레거시 주문 또는 직접 API 호출 주문입니다.
   */
  @Column({ type: 'uuid', nullable: true })
  ecommerceOrderId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalOrderId?: string; // 외부 채널의 주문 ID

  @Column({ type: 'varchar', length: 255 })
  orderNumber!: string; // 내부 주문 번호

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({
    type: 'enum',
    enum: OrderRelayStatus,
    default: OrderRelayStatus.PENDING,
  })
  status!: OrderRelayStatus;

  @Column({ type: 'jsonb', nullable: true })
  shippingInfo?: Record<string, any>; // 배송 정보

  @Column({ type: 'jsonb', nullable: true })
  customerInfo?: Record<string, any>; // 고객 정보 (암호화 권장)

  @Column({ type: 'timestamp', nullable: true })
  relayedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => SellerListing, (listing) => listing.orders)
  @JoinColumn({ name: 'listingId' })
  listing?: SellerListing;

  @OneToMany(() => CommissionTransaction, (transaction) => transaction.orderRelay)
  commissionTransactions?: CommissionTransaction[];
}
