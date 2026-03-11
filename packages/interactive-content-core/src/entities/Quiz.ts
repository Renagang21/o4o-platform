import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Quiz Entity
 *
 * 단일형/객관식 퀴즈 엔진
 *
 * 사용 사례:
 * - 교육용 Quiz (Yaksa 정책 교육)
 * - 마케팅용 퀴즈 (캠페인 참여)
 * - 제품 지식 테스트
 */

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  answer?: string | string[];
  points?: number;
  order: number;
}

@Entity('lms_quizzes')
@Index(['isPublished', 'createdAt'])
@Index(['bundleId'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', default: [] })
  questions!: QuizQuestion[];

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // ContentBundle 연결 (optional)
  @Column({ type: 'uuid', nullable: true })
  bundleId?: string;

  // Course 연결 (optional)
  @Column({ type: 'uuid', nullable: true })
  courseId?: string;

  // 합격 점수 (백분율)
  @Column({ type: 'integer', default: 70 })
  passingScore!: number;

  // 시간 제한 (분, null이면 무제한)
  @Column({ type: 'integer', nullable: true })
  timeLimit?: number;

  // 최대 시도 횟수 (null이면 무제한)
  @Column({ type: 'integer', nullable: true })
  maxAttempts?: number;

  // 결과 즉시 표시 여부
  @Column({ type: 'boolean', default: true })
  showResultsImmediately!: boolean;

  // 정답 표시 여부
  @Column({ type: 'boolean', default: false })
  showCorrectAnswers!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Publish the quiz
   */
  publish(): void {
    this.isPublished = true;
    this.publishedAt = new Date();
  }

  /**
   * Unpublish the quiz
   */
  unpublish(): void {
    this.isPublished = false;
  }

  /**
   * Calculate total points
   */
  getTotalPoints(): number {
    return this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  }

  /**
   * Add a question
   */
  addQuestion(question: Omit<QuizQuestion, 'order'>): void {
    const order = this.questions.length;
    this.questions.push({ ...question, order });
  }

  /**
   * Remove a question by id
   */
  removeQuestion(questionId: string): void {
    this.questions = this.questions.filter((q) => q.id !== questionId);
    this.questions.forEach((q, index) => {
      q.order = index;
    });
  }
}
