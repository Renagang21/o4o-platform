/**
 * Sample Usage Log Entity
 *
 * 샘플 사용 로그
 * - 개별 샘플 사용 기록
 * - 고객 반응 추적
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type CustomerReaction = 'positive' | 'neutral' | 'negative' | 'purchased' | 'no_feedback';

@Entity('cosmetics_sample_usage_logs')
export class SampleUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ type: 'uuid', nullable: true })
  inventoryId?: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'int', default: 1 })
  quantityUsed!: number;

  @Column({ type: 'timestamp' })
  usedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  staffId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  staffName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerReaction?: CustomerReaction;

  @Column({ type: 'boolean', default: false })
  resultedInPurchase!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchaseAmount?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerAgeGroup?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerGender?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
