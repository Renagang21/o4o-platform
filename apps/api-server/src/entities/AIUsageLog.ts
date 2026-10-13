import { loadAiPriceCatalog, resolveAiPrice, estimateAiCost } from '../modules/ai-policy/ai-pricing.js';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { User } from './User.js';

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  CLAUDE = 'claude'
}

export enum AIUsageStatus {
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * AI Usage Log Entity
 *
 * Tracks all AI API calls for usage monitoring, cost estimation, and analytics.
 *
 * Features:
 * - Token usage tracking (prompt, completion, total)
 * - Provider and model information
 * - Request duration and status
 * - Error tracking
 * - User association for per-user analytics
 */
@Entity('ai_usage_logs')
@Index(['userId', 'createdAt'])
@Index(['provider', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['scope', 'createdAt'])
export class AIUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  scope?: string;

  @Column({ type: 'numeric', precision: 20, scale: 8, nullable: true })
  costEstimated?: number;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({
    type: 'enum',
    enum: AIProvider
  })
  provider!: AIProvider;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ type: 'uuid', nullable: true })
  requestId?: string;

  @Column({ type: 'int', nullable: true })
  promptTokens?: number;

  @Column({ type: 'int', nullable: true })
  completionTokens?: number;

  @Column({ type: 'int', nullable: true })
  totalTokens?: number;

  @Column({ type: 'int', nullable: true })
  durationMs?: number;

  @Column({
    type: 'enum',
    enum: AIUsageStatus
  })
  status!: AIUsageStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorType?: string;

  @CreateDateColumn()
  createdAt!: Date;

  /** Same versioned model price resolver used by policy accounting; estimate only. */
  estimateCost(): number {
    return estimateAiCost(resolveAiPrice(loadAiPriceCatalog(), this.provider, this.model), this.promptTokens ?? 0, this.completionTokens ?? 0);
  }

  /**
   * Static helper to create a success log
   */
  static createSuccessLog(
    userId: string,
    provider: AIProvider,
    model: string,
    requestId: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    durationMs: number
  ): Partial<AIUsageLog> {
    return {
      userId,
      provider,
      model,
      requestId,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      status: AIUsageStatus.SUCCESS,
    };
  }

  /**
   * Static helper to create an error log
   */
  static createErrorLog(
    userId: string,
    provider: AIProvider,
    model: string,
    requestId: string,
    errorMessage: string,
    errorType: string,
    durationMs: number
  ): Partial<AIUsageLog> {
    return {
      userId,
      provider,
      model,
      requestId,
      errorMessage,
      errorType,
      durationMs,
      status: AIUsageStatus.ERROR,
    };
  }
}
