/**
 * CommissionTransaction Entity
 *
 * 수수료 트랜잭션
 *
 * 각 주문에 대해 적용된 수수료를 기록합니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderRelay } from './OrderRelay.entity.js';
import { CommissionRule } from './CommissionRule.entity.js';
import { SettlementBatch } from './SettlementBatch.entity.js';

@Entity('dropshipping_commission_transactions')
export class CommissionTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderRelayId!: string;

  @Column({ type: 'uuid', nullable: true })
  commissionRuleId?: string;

  @Column({ type: 'uuid', nullable: true })
  settlementBatchId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  orderAmount!: number; // 주문 금액

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number; // 수수료 금액

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  appliedRate?: number; // 적용된 수수료율

  @Column({ type: 'jsonb', nullable: true })
  calculationDetails?: Record<string, any>; // 계산 상세 내역

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => OrderRelay, (order) => order.commissionTransactions)
  @JoinColumn({ name: 'orderRelayId' })
  orderRelay?: OrderRelay;

  @ManyToOne(() => CommissionRule)
  @JoinColumn({ name: 'commissionRuleId' })
  commissionRule?: CommissionRule;

  @ManyToOne(() => SettlementBatch, (batch) => batch.commissionTransactions)
  @JoinColumn({ name: 'settlementBatchId' })
  settlementBatch?: SettlementBatch;
}
