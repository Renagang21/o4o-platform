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
export class AIUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

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

  /**
   * Estimate cost based on provider and token usage
   * Rough estimates (as of 2025):
   * - OpenAI GPT-4: $0.03/1K prompt, $0.06/1K completion
   * - Gemini Pro: $0.0005/1K prompt, $0.0015/1K completion
   * - Claude Opus: $0.015/1K prompt, $0.075/1K completion
   */
  estimateCost(): number {
    if (!this.promptTokens || !this.completionTokens) return 0;

    const costs = {
      [AIProvider.OPENAI]: { prompt: 0.03, completion: 0.06 },
      [AIProvider.GEMINI]: { prompt: 0.0005, completion: 0.0015 },
      [AIProvider.CLAUDE]: { prompt: 0.015, completion: 0.075 },
    };

    const cost = costs[this.provider];
    if (!cost) return 0;

    const promptCost = (this.promptTokens / 1000) * cost.prompt;
    const completionCost = (this.completionTokens / 1000) * cost.completion;

    return promptCost + completionCost;
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
