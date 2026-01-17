import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * SignageAiGenerationLog Entity
 *
 * Tracks AI-generated content history.
 * - Generation request details
 * - Output tracking
 * - Usage statistics for billing/limits
 */
@Entity('signage_ai_generation_logs')
@Index(['serviceKey', 'organizationId'])
@Index(['generationType'])
@Index(['status'])
@Index(['createdAt'])
export class SignageAiGenerationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Multi-tenant Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;

  // ========== User ==========
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  // ========== Generation Type ==========
  @Column({
    type: 'varchar',
    length: 50,
  })
  generationType!: 'banner' | 'promotion' | 'thumbnail' | 'text' | 'recommendation' | 'custom';

  // ========== Request ==========
  @Column({ type: 'jsonb' })
  request!: {
    prompt?: string;
    templateId?: string;
    parameters?: Record<string, any>;
  };

  // ========== Output ==========
  @Column({ type: 'uuid', nullable: true })
  outputMediaId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  outputPlaylistId!: string | null;

  @Column({ type: 'text', nullable: true })
  outputUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  outputData!: Record<string, any> | null;

  // ========== Status ==========
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  // ========== Metrics ==========
  @Column({ type: 'int', nullable: true })
  processingTimeMs!: number | null;

  @Column({ type: 'int', nullable: true })
  tokensUsed!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  costUsd!: number | null;

  // ========== AI Model Info ==========
  @Column({ type: 'varchar', length: 100, nullable: true })
  modelName!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelProvider!: string | null; // 'openai', 'anthropic', etc.

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;
}
