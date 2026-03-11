import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * SurveyResponse Entity
 *
 * 설문조사 응답 데이터
 */

export interface QuestionAnswer {
  questionId: string;
  value: any;
  answeredAt?: Date;
}

export enum ResponseStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Entity('lms_survey_responses')
@Index(['surveyId', 'createdAt'])
@Index(['userId', 'surveyId'])
@Index(['status'])
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  surveyId!: string;

  // userId는 익명 응답 시 null일 수 있음
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'jsonb', default: [] })
  answers!: QuestionAnswer[];

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.IN_PROGRESS,
  })
  status!: ResponseStatus;

  // 완료 시간
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // 소요 시간 (초)
  @Column({ type: 'integer', nullable: true })
  timeSpent?: number;

  // 익명 응답 여부
  @Column({ type: 'boolean', default: false })
  isAnonymous!: boolean;

  // IP 주소 (익명 응답 추적용)
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  // User Agent
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper Methods

  /**
   * Add or update an answer
   */
  setAnswer(questionId: string, value: any): void {
    const existingIndex = this.answers.findIndex((a) => a.questionId === questionId);
    const answer: QuestionAnswer = {
      questionId,
      value,
      answeredAt: new Date(),
    };

    if (existingIndex >= 0) {
      this.answers[existingIndex] = answer;
    } else {
      this.answers.push(answer);
    }
  }

  /**
   * Get answer for a question
   */
  getAnswer(questionId: string): any {
    const answer = this.answers.find((a) => a.questionId === questionId);
    return answer?.value;
  }

  /**
   * Mark as completed
   */
  complete(): void {
    this.status = ResponseStatus.COMPLETED;
    this.completedAt = new Date();
    if (this.createdAt) {
      this.timeSpent = Math.floor((this.completedAt.getTime() - this.createdAt.getTime()) / 1000);
    }
  }

  /**
   * Mark as abandoned
   */
  abandon(): void {
    this.status = ResponseStatus.ABANDONED;
  }

  /**
   * Check if response is completed
   */
  isCompleted(): boolean {
    return this.status === ResponseStatus.COMPLETED;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(totalQuestions: number): number {
    if (totalQuestions === 0) return 0;
    return Math.round((this.answers.length / totalQuestions) * 100);
  }
}
