import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * AiLlmPolicy — WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * Scope 기반 LLM 정책. ai_model_settings(서비스 단위)를 대체.
 * 각 scope(CARE_CHAT, STORE_INSIGHT 등)에 대해 provider, model,
 * temperature 등을 독립 제어.
 */
@Entity({ name: 'ai_llm_policies' })
export class AiLlmPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  scope!: string;

  @Column({ type: 'varchar', length: 20, default: 'gemini' })
  provider!: string;

  @Column({ type: 'varchar', length: 100, default: 'gemini-3.0-flash' })
  model!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.3 })
  temperature!: number;

  @Column({ name: 'max_tokens', type: 'int', default: 2048 })
  maxTokens!: number;

  @Column({ name: 'top_p', type: 'numeric', precision: 3, scale: 2, nullable: true })
  topP!: number | null;

  @Column({ name: 'top_k', type: 'int', nullable: true })
  topK!: number | null;

  @Column({ name: 'timeout_ms', type: 'int', default: 10000 })
  timeoutMs!: number;

  @Column({ name: 'response_mode', type: 'varchar', length: 10, default: 'json' })
  responseMode!: string;

  @Column({ name: 'fallback_provider', type: 'varchar', length: 20, nullable: true })
  fallbackProvider!: string | null;

  @Column({ name: 'fallback_model', type: 'varchar', length: 100, nullable: true })
  fallbackModel!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'retry_max', type: 'int', default: 2 })
  retryMax!: number;

  @Column({ name: 'retry_delay_ms', type: 'int', default: 2000 })
  retryDelayMs!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
