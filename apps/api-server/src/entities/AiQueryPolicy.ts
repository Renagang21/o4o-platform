/**
 * AI Query Policy Entity
 * Phase 1 - AI 일 사용량 정책 관리
 * WO-AI-ADMIN-CONTROL-PLANE-V1 - 관리자 제어 기능 추가
 *
 * 원칙:
 * - Gemini Flash 단일 모델
 * - 무료/유료 차이는 일 사용 상한선만
 * - 토큰 단위 X, 질문 횟수 기준
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_query_policy')
export class AiQueryPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  /** 무료 사용자 일 사용 상한 (질문 횟수) */
  @Column({ name: 'free_daily_limit', type: 'int', default: 10 })
  freeDailyLimit!: number;

  /** 유료 사용자 일 사용 상한 (질문 횟수) */
  @Column({ name: 'paid_daily_limit', type: 'int', default: 100 })
  paidDailyLimit!: number;

  /** AI 기능 전체 활성화 여부 */
  @Column({ name: 'ai_enabled', type: 'boolean', default: true })
  aiEnabled!: boolean;

  /** 사용할 AI 모델 (기본: gemini-3.0-flash) */
  @Column({ name: 'default_model', type: 'varchar', length: 100, default: 'gemini-3.0-flash' })
  defaultModel!: string;

  /** 시스템 프롬프트 - 서비스 맥락 유도 */
  @Column({ name: 'system_prompt', type: 'text', nullable: true })
  systemPrompt!: string | null;

  /** 경고 임계치 (%) - WO-AI-ADMIN-CONTROL-PLANE-V1 */
  @Column({ name: 'warning_threshold', type: 'int', default: 80 })
  warningThreshold!: number;

  /** 전체 일 최대 질문 수 (모든 사용자 합산) - WO-AI-ADMIN-CONTROL-PLANE-V1 */
  @Column({ name: 'global_daily_limit', type: 'int', default: 1000 })
  globalDailyLimit!: number;

  /** 현재 활성 엔진 ID - WO-AI-ADMIN-CONTROL-PLANE-V1 */
  @Column({ name: 'active_engine_id', type: 'int', nullable: true })
  activeEngineId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
