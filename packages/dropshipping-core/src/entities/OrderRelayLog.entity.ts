/**
 * OrderRelayLog Entity
 *
 * 주문 상태 변경 및 감사 로그
 *
 * DS-4.1/DS-4.3 준수:
 * - 모든 상태 변경은 반드시 로그에 기록
 * - 로그에는 actor, 이전/이후 상태, timestamp, reason 포함
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrderRelay, OrderRelayStatus } from './OrderRelay.entity.js';

export enum OrderRelayLogAction {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  DATA_UPDATED = 'data_updated',
  RELAY_DISPATCHED = 'relay_dispatched',
  EXTERNAL_SYNC = 'external_sync',
}

@Entity('dropshipping_order_relay_logs')
@Index(['orderRelayId', 'createdAt'])
export class OrderRelayLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderRelayId!: string;

  @Column({
    type: 'enum',
    enum: OrderRelayLogAction,
  })
  action!: OrderRelayLogAction;

  /**
   * 이전 상태 (상태 변경 시)
   */
  @Column({
    type: 'enum',
    enum: OrderRelayStatus,
    nullable: true,
  })
  previousStatus?: OrderRelayStatus;

  /**
   * 새 상태 (상태 변경 시)
   */
  @Column({
    type: 'enum',
    enum: OrderRelayStatus,
    nullable: true,
  })
  newStatus?: OrderRelayStatus;

  /**
   * 변경 수행자
   * - user_id (UUID) 또는 'system'
   */
  @Column({ type: 'varchar', length: 100 })
  actor!: string;

  /**
   * 변경 수행자 유형
   */
  @Column({ type: 'varchar', length: 50, default: 'admin' })
  actorType!: string; // 'admin', 'system', 'seller', 'supplier'

  /**
   * 변경 사유
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * 변경 전 데이터 스냅샷 (선택)
   */
  @Column({ type: 'jsonb', nullable: true })
  previousData?: Record<string, any>;

  /**
   * 변경 후 데이터 스냅샷 (선택)
   */
  @Column({ type: 'jsonb', nullable: true })
  newData?: Record<string, any>;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => OrderRelay, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderRelayId' })
  orderRelay?: OrderRelay;
}
