import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * EngagementLog Entity
 *
 * 모든 콘텐츠 소비/참여 이벤트를 기록하는 공통 로깅 Layer
 *
 * 사용 사례:
 * - 마케팅 캠페인 반응 추적
 * - 교육 콘텐츠 소비 분석
 * - 설문/퀴즈 참여 기록
 * - AI-Service 데이터 분석용 표준 데이터셋
 */

export enum EngagementEventType {
  VIEW = 'view',
  CLICK = 'click',
  REACTION = 'reaction',
  QUIZ_SUBMIT = 'quiz-submit',
  SURVEY_SUBMIT = 'survey-submit',
  ACKNOWLEDGE = 'acknowledge',
  COMPLETE = 'complete',
}

export interface EngagementMetadata {
  // Common
  timeSpent?: number;
  source?: string;
  deviceType?: string;

  // Reaction specific
  reactionType?: string;

  // Quiz specific
  quizId?: string;
  score?: number;
  passed?: boolean;
  answers?: any[];

  // Survey specific
  surveyId?: string;
  responseId?: string;

  // Click specific
  targetType?: string;
  targetId?: string;

  // Additional custom data
  [key: string]: any;
}

@Entity('lms_engagement_logs')
@Index(['userId', 'createdAt'])
@Index(['bundleId', 'createdAt'])
@Index(['event', 'createdAt'])
@Index(['userId', 'bundleId', 'event'])
export class EngagementLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  bundleId?: string;

  @Column({ type: 'uuid', nullable: true })
  lessonId?: string;

  @Column({
    type: 'enum',
    enum: EngagementEventType,
  })
  event!: EngagementEventType;

  @Column({ type: 'jsonb', default: {} })
  metadata!: EngagementMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper Methods

  /**
   * Check if this is a view event
   */
  isView(): boolean {
    return this.event === EngagementEventType.VIEW;
  }

  /**
   * Check if this is a completion event
   */
  isComplete(): boolean {
    return this.event === EngagementEventType.COMPLETE;
  }

  /**
   * Check if this is a quiz submission
   */
  isQuizSubmit(): boolean {
    return this.event === EngagementEventType.QUIZ_SUBMIT;
  }

  /**
   * Check if this is a survey submission
   */
  isSurveySubmit(): boolean {
    return this.event === EngagementEventType.SURVEY_SUBMIT;
  }

  /**
   * Get time spent from metadata
   */
  getTimeSpent(): number {
    return this.metadata?.timeSpent || 0;
  }

  /**
   * Get score from metadata (for quiz submissions)
   */
  getScore(): number | undefined {
    return this.metadata?.score;
  }
}
