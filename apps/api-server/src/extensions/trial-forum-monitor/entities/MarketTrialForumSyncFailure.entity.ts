/**
 * MarketTrialForumSyncFailure Entity
 *
 * WO-MONITOR-1: 포럼 연계 모니터링 강화
 *
 * Market Trial 운영자 승인 시 KPA 포럼 자동 연계 실패를 기록.
 * 승인 주 흐름(Trial → RECRUITING)과 독립적으로 운영 가시성을 확보.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ForumSyncStage =
  | 'category_check'
  | 'forum_post_create'
  | 'forum_mapping_save';

export type ForumSyncSeverity = 'critical' | 'warning';

@Entity('market_trial_forum_sync_failures')
@Index('IDX_mtfsf_trial', ['trialId'])
@Index('IDX_mtfsf_resolved', ['resolvedAt'])
export class MarketTrialForumSyncFailure {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trial_id', type: 'uuid' })
  trialId!: string;

  @Column({ name: 'trial_title', type: 'varchar', length: 500 })
  trialTitle!: string;

  /**
   * 실패가 발생한 단계
   * - category_check: 포럼 카테고리 존재 확인 실패
   * - forum_post_create: 포럼 게시글 INSERT 실패
   * - forum_mapping_save: MarketTrialForum 매핑 레코드 저장 실패
   */
  @Column({ type: 'varchar', length: 50 })
  stage!: ForumSyncStage;

  /**
   * severity
   * - critical: 게시글 또는 매핑 저장 실패 (포럼 노출 누락 확정)
   * - warning: 카테고리 미존재 등 환경 문제
   */
  @Column({ type: 'varchar', length: 20, default: 'critical' })
  severity!: ForumSyncSeverity;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage!: string;

  /** 내부 저장용 stack — API 응답에는 노출하지 않음 */
  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack!: string | null;

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;
}
