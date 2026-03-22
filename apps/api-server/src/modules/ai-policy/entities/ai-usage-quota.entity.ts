import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * AiUsageQuota — WO-O4O-AI-COST-LIMIT-QUOTA-V1
 *
 * AI 사용량 제한 정의. layer × layerKey × limitType × period 조합으로
 * Global / Service / Scope / User 레벨의 요청수·토큰·비용 제한.
 */
@Entity({ name: 'ai_usage_quota' })
@Unique(['layer', 'layerKey', 'limitType', 'period'])
@Index(['layer', 'layerKey', 'isEnabled'])
export class AiUsageQuota {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20 })
  layer!: string; // global | service | scope | user

  @Column({ name: 'layer_key', type: 'varchar', length: 100 })
  layerKey!: string; // '*', 'care', 'CARE_CHAT', userId

  @Column({ name: 'limit_type', type: 'varchar', length: 20 })
  limitType!: string; // requests | tokens | cost

  @Column({ type: 'varchar', length: 10 })
  period!: string; // daily | monthly

  @Column({ name: 'limit_value', type: 'numeric', precision: 15, scale: 4 })
  limitValue!: number;

  @Column({ name: 'warning_threshold', type: 'int', default: 80 })
  warningThreshold!: number; // percentage

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
