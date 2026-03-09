/**
 * PayoutBatch Entity
 *
 * WO-O4O-PAYOUT-ENGINE-V1
 *
 * 지급 배치. Supplier 정산 또는 Partner 커미션을 묶어서 일괄 지급 처리.
 * 수동 은행 송금 후 markPaid로 완료 처리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PayoutType = 'supplier' | 'partner';
export type PayoutBatchStatus = 'created' | 'processing' | 'paid' | 'failed';

@Entity({ name: 'payout_batches' })
export class PayoutBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payout_type', type: 'varchar', length: 30 })
  @Index('IDX_payout_batches_type')
  payoutType!: PayoutType;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount!: number;

  @Column({ name: 'item_count', type: 'int', default: 0 })
  itemCount!: number;

  @Column({ type: 'varchar', length: 30, default: 'created' })
  @Index('IDX_payout_batches_status')
  status!: PayoutBatchStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;
}
