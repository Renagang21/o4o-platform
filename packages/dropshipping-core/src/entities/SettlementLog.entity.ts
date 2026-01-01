/**
 * SettlementLog Entity
 *
 * 정산 배치 상태 변경 및 감사 로그
 *
 * DS-4.2/DS-4.3 준수:
 * - 모든 상태 변경은 반드시 로그에 기록
 * - 계산 실행, 확정, 조정 등 모든 작업 기록
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
import { SettlementBatch, SettlementBatchStatus } from './SettlementBatch.entity.js';

export enum SettlementLogAction {
  CREATED = 'created',
  STATUS_CHANGED = 'status_changed',
  CALCULATION_EXECUTED = 'calculation_executed',
  CONFIRMED = 'confirmed',
  ADJUSTMENT_ADDED = 'adjustment_added',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
}

@Entity('dropshipping_settlement_logs')
@Index(['settlementBatchId', 'createdAt'])
export class SettlementLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  settlementBatchId!: string;

  @Column({
    type: 'enum',
    enum: SettlementLogAction,
  })
  action!: SettlementLogAction;

  /**
   * 이전 상태 (상태 변경 시)
   */
  @Column({
    type: 'enum',
    enum: SettlementBatchStatus,
    nullable: true,
  })
  previousStatus?: SettlementBatchStatus;

  /**
   * 새 상태 (상태 변경 시)
   */
  @Column({
    type: 'enum',
    enum: SettlementBatchStatus,
    nullable: true,
  })
  newStatus?: SettlementBatchStatus;

  /**
   * 변경 수행자
   */
  @Column({ type: 'varchar', length: 100 })
  actor!: string;

  /**
   * 변경 수행자 유형
   */
  @Column({ type: 'varchar', length: 50, default: 'admin' })
  actorType!: string; // 'admin', 'system', 'finance'

  /**
   * 변경 사유
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * 계산 상세 (계산 실행 시)
   */
  @Column({ type: 'jsonb', nullable: true })
  calculationDetails?: {
    totalAmount: number;
    commissionAmount: number;
    deductionAmount: number;
    netAmount: number;
    transactionCount: number;
    calculatedAt: string;
  };

  /**
   * 조정 상세 (조정 추가 시)
   */
  @Column({ type: 'jsonb', nullable: true })
  adjustmentDetails?: {
    adjustmentType: string;
    amount: number;
    originalTransactionId?: string;
    reason: string;
  };

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => SettlementBatch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlementBatchId' })
  settlementBatch?: SettlementBatch;
}
