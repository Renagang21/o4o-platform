/**
 * SettlementBatch Entity
 *
 * 정산 배치 관리
 *
 * 특정 기간 동안의 주문/수수료를 묶어서 정산하는 단위입니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CommissionTransaction } from './CommissionTransaction.entity.js';

export enum SettlementStatus {
  PENDING = 'pending',       // 정산 대기
  PROCESSING = 'processing', // 처리 중
  COMPLETED = 'completed',   // 정산 완료
  FAILED = 'failed',         // 정산 실패
}

@Entity('dropshipping_settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  batchNumber!: string; // 정산 배치 번호

  @Column({ type: 'date' })
  periodStart!: Date; // 정산 기간 시작

  @Column({ type: 'date' })
  periodEnd!: Date; // 정산 기간 종료

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalOrderAmount!: number; // 총 주문 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCommissionAmount!: number; // 총 수수료

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSettlementAmount!: number; // 총 정산 금액

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status!: SettlementStatus;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => CommissionTransaction, (transaction) => transaction.settlementBatch)
  commissionTransactions?: CommissionTransaction[];
}
