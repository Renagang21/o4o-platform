import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';

/**
 * AiUsageAggregate — WO-O4O-AI-COST-LIMIT-QUOTA-V1
 *
 * AI 사용량 집계 카운터. UPSERT로 원자적 증가.
 * periodKey: 'YYYY-MM-DD' (daily) 또는 'YYYY-MM' (monthly).
 */
@Entity({ name: 'ai_usage_aggregate' })
@Unique(['layer', 'layerKey', 'limitType', 'periodKey'])
@Index(['layer', 'layerKey', 'periodKey'])
export class AiUsageAggregate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  layer!: string;

  @Column({ name: 'layer_key', type: 'varchar', length: 100 })
  layerKey!: string;

  @Column({ name: 'limit_type', type: 'varchar', length: 20 })
  limitType!: string;

  @Column({ name: 'period_key', type: 'varchar', length: 10 })
  periodKey!: string;

  @Column({ name: 'current_value', type: 'numeric', precision: 15, scale: 4, default: 0 })
  currentValue!: number;

  @Column({ name: 'last_updated_at', type: 'timestamptz', default: () => 'NOW()' })
  lastUpdatedAt!: Date;
}
