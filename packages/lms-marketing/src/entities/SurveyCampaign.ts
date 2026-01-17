/**
 * SurveyCampaign Entity
 *
 * Core Survey를 캠페인 컨텍스트로 실행
 * 마케팅 목적의 설문 캠페인 관리
 *
 * 원칙:
 * - Core Survey ID만 참조 (설문 재정의 금지)
 * - 캠페인 기간/타겟팅/리워드만 관리
 * - Response는 Core Survey에서 처리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CampaignStatus, CampaignTargeting, CampaignReward } from './QuizCampaign.js';

// Re-export for convenience
export { CampaignStatus, CampaignTargeting, CampaignReward };

@Entity('lms_marketing_survey_campaigns')
@Index(['supplierId'])
@Index(['surveyId'])
@Index(['status'])
@Index(['startAt', 'endAt'])
export class SurveyCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 공급자 ID */
  @Column({ type: 'uuid' })
  supplierId!: string;

  /** Core Survey ID 참조 */
  @Column({ type: 'uuid' })
  surveyId!: string;

  /** 관련 ContentBundle ID (안내 자료) */
  @Column({ type: 'uuid', nullable: true })
  bundleId?: string;

  /** 캠페인 제목 */
  @Column({ type: 'varchar', length: 500 })
  title!: string;

  /** 캠페인 설명 */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /** 캠페인 상태 */
  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status!: CampaignStatus;

  /** 캠페인 시작일 */
  @Column({ type: 'timestamptz', nullable: true })
  startAt?: Date;

  /** 캠페인 종료일 */
  @Column({ type: 'timestamptz', nullable: true })
  endAt?: Date;

  /** 타겟팅 설정 */
  @Column({ type: 'jsonb', default: { targets: ['all'] } })
  targeting!: CampaignTargeting;

  /** 리워드 설정 */
  @Column({ type: 'jsonb', default: [] })
  rewards!: CampaignReward[];

  /** 발행 여부 */
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  /** 발행 일시 */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  /** 최대 응답 수 (null = 무제한) */
  @Column({ type: 'integer', nullable: true })
  maxResponses?: number;

  // 통계 (캐시용, 실시간은 Core에서 조회)
  @Column({ type: 'integer', default: 0 })
  responseCount!: number;

  @Column({ type: 'integer', default: 0 })
  completedCount!: number;

  /** 메타데이터 */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  // Helper Methods

  activate(): void {
    this.status = CampaignStatus.ACTIVE;
    this.isPublished = true;
    this.publishedAt = new Date();
  }

  pause(): void {
    this.status = CampaignStatus.PAUSED;
  }

  complete(): void {
    this.status = CampaignStatus.COMPLETED;
  }

  archive(): void {
    this.status = CampaignStatus.ARCHIVED;
    this.isPublished = false;
  }

  isRunning(): boolean {
    if (this.status !== CampaignStatus.ACTIVE) return false;
    const now = new Date();
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;
    if (this.maxResponses && this.responseCount >= this.maxResponses) return false;
    return true;
  }

  incrementResponse(): void {
    this.responseCount++;
  }

  incrementCompleted(): void {
    this.completedCount++;
  }
}
