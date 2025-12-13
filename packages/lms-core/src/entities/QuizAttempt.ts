import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * QuizAttempt Entity
 *
 * 퀴즈 응시 기록
 */

export interface QuizAnswer {
  questionId: string;
  answer: any;
  isCorrect?: boolean;
  points?: number;
  answeredAt?: Date;
}

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  TIMED_OUT = 'timed_out',
  ABANDONED = 'abandoned',
}

@Entity('lms_quiz_attempts')
@Index(['quizId', 'createdAt'])
@Index(['userId', 'quizId'])
@Index(['status'])
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  quizId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb', default: [] })
  answers!: QuizAnswer[];

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status!: AttemptStatus;

  // 점수 (백분율)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score?: number;

  // 획득 점수
  @Column({ type: 'integer', default: 0 })
  earnedPoints!: number;

  // 총 점수
  @Column({ type: 'integer', default: 0 })
  totalPoints!: number;

  // 합격 여부
  @Column({ type: 'boolean', nullable: true })
  passed?: boolean;

  // 시작 시간
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  // 완료 시간
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  // 소요 시간 (초)
  @Column({ type: 'integer', nullable: true })
  timeSpent?: number;

  // 시도 번호 (사용자별)
  @Column({ type: 'integer', default: 1 })
  attemptNumber!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper Methods

  /**
   * Submit an answer
   */
  submitAnswer(questionId: string, answer: any, isCorrect?: boolean, points?: number): void {
    const existingIndex = this.answers.findIndex((a) => a.questionId === questionId);
    const quizAnswer: QuizAnswer = {
      questionId,
      answer,
      isCorrect,
      points: points || 0,
      answeredAt: new Date(),
    };

    if (existingIndex >= 0) {
      this.answers[existingIndex] = quizAnswer;
    } else {
      this.answers.push(quizAnswer);
    }
  }

  /**
   * Calculate and finalize the score
   */
  calculateScore(passingScore: number): void {
    this.earnedPoints = this.answers.reduce((sum, a) => sum + (a.isCorrect ? (a.points || 1) : 0), 0);

    if (this.totalPoints > 0) {
      this.score = (this.earnedPoints / this.totalPoints) * 100;
      this.passed = this.score >= passingScore;
    } else {
      this.score = 0;
      this.passed = false;
    }
  }

  /**
   * Complete the attempt
   */
  complete(passingScore: number): void {
    this.status = AttemptStatus.COMPLETED;
    this.completedAt = new Date();
    this.timeSpent = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    this.calculateScore(passingScore);
  }

  /**
   * Mark as timed out
   */
  timeout(passingScore: number): void {
    this.status = AttemptStatus.TIMED_OUT;
    this.completedAt = new Date();
    this.timeSpent = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
    this.calculateScore(passingScore);
  }

  /**
   * Abandon the attempt
   */
  abandon(): void {
    this.status = AttemptStatus.ABANDONED;
  }

  /**
   * Check if attempt is still in progress
   */
  isInProgress(): boolean {
    return this.status === AttemptStatus.IN_PROGRESS;
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(totalQuestions: number): number {
    if (totalQuestions === 0) return 0;
    return Math.round((this.answers.length / totalQuestions) * 100);
  }
}
