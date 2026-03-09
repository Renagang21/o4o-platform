import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * StoreAiProductInsight — WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * LLM이 생성한 상품별 성과 분석 인사이트.
 * organization + date 기준 1:1 (일별 1회 배치).
 */
@Entity({ name: 'store_ai_product_insights' })
@Unique(['organizationId', 'snapshotDate'])
export class StoreAiProductInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  @Index()
  snapshotDate!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'product_highlights', type: 'jsonb', default: '[]' })
  productHighlights!: Array<{
    productId: string;
    productName: string;
    highlight: string;
    metric?: string;
  }>;

  @Column({ type: 'jsonb', default: '[]' })
  issues!: Array<{
    type: string;
    severity: string;
    message: string;
    productId?: string;
    productName?: string;
  }>;

  @Column({ type: 'jsonb', default: '[]' })
  actions!: Array<{
    label: string;
    priority: string;
    reason: string;
    productId?: string;
  }>;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
