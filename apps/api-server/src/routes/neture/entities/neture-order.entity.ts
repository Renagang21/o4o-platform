/**
 * NetureOrder Entity
 *
 * Phase G-3: 주문/결제 플로우 구현
 * Schema: neture (isolated from Core)
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
import type { NetureOrderItem } from './neture-order-item.entity.js';
import { NetureCurrency } from './neture-product.entity.js';

/**
 * Order Status Enum
 */
export enum NetureOrderStatus {
  CREATED = 'created',           // 주문 생성됨
  PENDING_PAYMENT = 'pending_payment', // 결제 대기
  PAID = 'paid',                 // 결제 완료
  PREPARING = 'preparing',       // 상품 준비중
  SHIPPED = 'shipped',           // 배송중
  DELIVERED = 'delivered',       // 배송 완료
  CANCELLED = 'cancelled',       // 취소됨
  REFUNDED = 'refunded',         // 환불됨
}

/**
 * Order Type Enum
 *
 * IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 Phase 1
 *
 * STORE_RESTOCK       — 매장 입고용 주문 (기존 동작, 기본값)
 *                       shipping = 매장 주소
 * DIRECT_TO_CUSTOMER  — 고객 직배송 주문
 *                       shipping = 최종 고객 주소
 *                       customer_info에 고객 PII + consent_at 저장
 */
export enum NetureOrderType {
  STORE_RESTOCK = 'STORE_RESTOCK',
  DIRECT_TO_CUSTOMER = 'DIRECT_TO_CUSTOMER',
}

/**
 * Customer Info Interface (DIRECT_TO_CUSTOMER 전용)
 *
 * IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 Phase 1
 *
 * 직배송 시 매장이 입력한 최종 고객 정보. PII이므로 consent_at 필수.
 */
export interface NetureCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  consent_at: string; // ISO datetime, 매장이 동의 체크한 시점
}

/**
 * Payment Method Enum
 */
export enum NeturePaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  VIRTUAL_ACCOUNT = 'virtual_account',
  MOBILE = 'mobile',
}

/**
 * Shipping Address Interface
 */
export interface NetureShippingAddress {
  recipient_name: string;
  phone: string;
  postal_code: string;
  address: string;
  address_detail?: string;
  delivery_note?: string;
}

@Entity({ name: 'neture_orders' })
export class NetureOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_number', type: 'varchar', length: 50, unique: true })
  @Index()
  orderNumber!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: NetureOrderStatus.CREATED,
  })
  @Index()
  status!: NetureOrderStatus;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount!: number;

  @Column({ name: 'discount_amount', type: 'int', default: 0 })
  discountAmount!: number;

  @Column({ name: 'shipping_fee', type: 'int', default: 0 })
  shippingFee!: number;

  @Column({ name: 'final_amount', type: 'int', default: 0 })
  finalAmount!: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: NetureCurrency.KRW,
  })
  currency!: NetureCurrency;

  @Column({ name: 'payment_method', type: 'varchar', length: 30, nullable: true })
  paymentMethod?: NeturePaymentMethod | null;

  @Column({ name: 'payment_key', type: 'varchar', length: 200, nullable: true })
  paymentKey?: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  shipping?: NetureShippingAddress | null;

  @Column({ name: 'orderer_name', type: 'varchar', length: 100, nullable: true })
  ordererName?: string | null;

  @Column({ name: 'orderer_phone', type: 'varchar', length: 30, nullable: true })
  ordererPhone?: string | null;

  @Column({ name: 'orderer_email', type: 'varchar', length: 200, nullable: true })
  ordererEmail?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // IR-NETURE-B2B-DIRECT-SHIPPING-ORDER-FLOW-AUDIT-V1 Phase 1: 매장 입고 vs 고객 직배송 구분
  @Column({
    name: 'order_type',
    type: 'varchar',
    length: 30,
    default: NetureOrderType.STORE_RESTOCK,
  })
  @Index()
  orderType!: NetureOrderType;

  // 직배송 전용 고객 PII (STORE_RESTOCK은 NULL)
  @Column({ name: 'customer_info', type: 'jsonb', nullable: true })
  customerInfo?: NetureCustomerInfo | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany('NetureOrderItem', 'order')
  items?: NetureOrderItem[];
}
