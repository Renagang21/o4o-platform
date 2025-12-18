/**
 * OrderLog Entity
 *
 * Phase N-2: 운영 안정화
 *
 * 주문 상태 변경 이력 기록
 * - 생성, 결제, 환불 등 모든 상태 변경 추적
 * - 운영자 감사(Audit) 및 분쟁 대비
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 주문 액션 타입
 */
export enum OrderAction {
  CREATED = 'created',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_REQUESTED = 'refund_requested',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  STATUS_CHANGED = 'status_changed',
}

@Entity('checkout_order_logs')
export class OrderLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * 액션 타입
   */
  @Column({
    type: 'enum',
    enum: OrderAction,
  })
  action!: OrderAction;

  /**
   * 이전 상태
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  previousStatus?: string;

  /**
   * 새로운 상태
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  newStatus?: string;

  /**
   * 수행자 ID (시스템, 사용자, 운영자)
   */
  @Column({ type: 'varchar', length: 100 })
  performedBy!: string;

  /**
   * 수행자 유형
   */
  @Column({ type: 'varchar', length: 50, default: 'system' })
  performerType!: string; // 'system' | 'consumer' | 'operator' | 'admin'

  /**
   * 상세 메시지/사유
   */
  @Column({ type: 'text', nullable: true })
  message?: string;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성 시점
   */
  @CreateDateColumn()
  createdAt!: Date;
}
