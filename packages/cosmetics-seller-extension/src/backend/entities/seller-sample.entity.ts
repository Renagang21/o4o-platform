/**
 * SellerSample Entity
 *
 * 매장 샘플 관리
 * - 제품별 샘플 수량
 * - 보충 기록
 * - 사용 로그
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SampleUsageType = 'demo' | 'giveaway' | 'tester';

export interface SampleUsageLog {
  date: string;
  quantity: number;
  purpose: SampleUsageType;
  notes?: string;
}

@Entity('cosmetics_seller_samples')
@Index(['sellerId', 'productId'], { unique: true })
@Index(['sellerId'])
@Index(['lastRefilledAt'])
export class SellerSample {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  sellerId!: string;

  @Column({ type: 'varchar', length: 255 })
  productId!: string;

  @Column({ type: 'int', default: 0 })
  sampleCount!: number;

  @Column({ type: 'int', default: 0 })
  minStockLevel!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRefilledAt?: Date;

  @Column({ type: 'int', nullable: true })
  lastRefillQuantity?: number;

  @Column({ type: 'jsonb', default: [] })
  usageLogs!: SampleUsageLog[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
