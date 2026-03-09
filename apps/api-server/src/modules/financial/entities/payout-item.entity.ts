/**
 * PayoutItem Entity
 *
 * WO-O4O-PAYOUT-ENGINE-V1
 *
 * 지급 배치 내 개별 항목.
 * entity_type + entity_id → 지급 대상 (supplier or partner)
 * reference_id → 원본 settlement_id or commission_id
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type PayoutEntityType = 'supplier' | 'partner';
export type PayoutItemStatus = 'pending' | 'paid' | 'failed';

@Entity({ name: 'payout_items' })
@Index('IDX_payout_items_batch', ['batchId'])
@Index('IDX_payout_items_reference', ['referenceId'], { unique: true })
export class PayoutItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  batchId!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 30 })
  entityType!: PayoutEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId!: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: PayoutItemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
