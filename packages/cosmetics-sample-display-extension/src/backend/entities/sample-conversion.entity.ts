/**
 * Sample Conversion Entity
 *
 * 샘플→구매 전환율 추적
 * - 매장별/제품별 전환 통계
 * - 기간별 집계
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PeriodType = 'daily' | 'weekly' | 'monthly';

@Entity('cosmetics_sample_conversion')
@Index(['storeId', 'productId', 'periodType', 'periodStart'], { unique: true })
export class SampleConversion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  storeName?: string;

  @Column({ type: 'varchar', length: 20, default: 'daily' })
  periodType!: PeriodType;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'int', default: 0 })
  sampleUsed!: number;

  @Column({ type: 'int', default: 0 })
  purchases!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  averageOrderValue!: number;

  @Column({ type: 'int', default: 0 })
  positiveReactions!: number;

  @Column({ type: 'int', default: 0 })
  negativeReactions!: number;

  @Column({ type: 'int', default: 0 })
  neutralReactions!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  previousConversionRate?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  conversionRateChange?: number;

  @Column({ type: 'jsonb', nullable: true })
  demographicBreakdown?: {
    byAgeGroup?: Record<string, { samples: number; purchases: number }>;
    byGender?: Record<string, { samples: number; purchases: number }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
