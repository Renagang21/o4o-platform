import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * StoreAiInsight — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * LLM이 생성한 매장 운영 요약/이슈/액션.
 * snapshot_id 기준 1:1 (관계 데코레이터 없이 UUID 컬럼만 사용).
 */
@Entity({ name: 'store_ai_insights' })
export class StoreAiInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'snapshot_id', type: 'uuid', unique: true })
  @Index()
  snapshotId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'jsonb', default: '[]' })
  issues!: Array<{ type: string; severity: string; message: string; metric?: string }>;

  @Column({ type: 'jsonb', default: '[]' })
  actions!: Array<{ label: string; priority: string; reason: string }>;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
