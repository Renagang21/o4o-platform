import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Enrollment } from './Enrollment.js';
import { Lesson } from './Lesson.js';

/**
 * Progress Entity
 *
 * Tracks a user's progress through individual lessons.
 */

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('lms_progress')
@Unique(['enrollmentId', 'lessonId'])
@Index(['enrollmentId'])
@Index(['lessonId'])
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Enrollment relationship
  @Column({ type: 'uuid' })
  enrollmentId!: string;

  @ManyToOne(() => Enrollment)
  @JoinColumn({ name: 'enrollmentId' })
  enrollment!: Enrollment;

  // Lesson relationship
  @Column({ type: 'uuid' })
  lessonId!: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson!: Lesson;

  // Progress Status
  @Column({ type: 'enum', enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  status!: ProgressStatus;

  // Time Tracking
  @Column({ type: 'integer', default: 0 })
  timeSpent!: number; // Time spent in seconds

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage!: number; // 0-100 for video progress

  // Quiz/Assignment Results
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score?: number; // For quiz/assignment lessons

  @Column({ type: 'integer', nullable: true })
  attempts!: number; // Number of attempts for quiz

  @Column({ type: 'jsonb', nullable: true })
  quizAnswers?: Record<string, any>;

  // Completion
  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt?: Date;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Start progress
   */
  start(): void {
    if (!this.startedAt) {
      this.startedAt = new Date();
    }
    this.status = ProgressStatus.IN_PROGRESS;
    this.lastAccessedAt = new Date();
  }

  /**
   * Complete progress
   */
  complete(score?: number): void {
    this.status = ProgressStatus.COMPLETED;
    this.completionPercentage = 100;
    this.completedAt = new Date();
    this.lastAccessedAt = new Date();
    if (score !== undefined) {
      this.score = score;
    }
  }

  /**
   * Update video progress
   */
  updateVideoProgress(percentage: number, timeSpent: number): void {
    this.completionPercentage = Math.min(percentage, 100);
    this.timeSpent = timeSpent;
    this.lastAccessedAt = new Date();

    if (this.completionPercentage >= 90 && this.status !== ProgressStatus.COMPLETED) {
      this.complete();
    }
  }

  /**
   * Submit quiz attempt
   */
  submitQuizAttempt(answers: Record<string, any>, score: number): void {
    this.quizAnswers = answers;
    this.score = score;
    this.attempts = (this.attempts || 0) + 1;
    this.lastAccessedAt = new Date();
  }

  /**
   * Check if completed
   */
  isCompleted(): boolean {
    return this.status === ProgressStatus.COMPLETED;
  }

  /**
   * Add time spent
   */
  addTimeSpent(seconds: number): void {
    this.timeSpent += seconds;
    this.lastAccessedAt = new Date();
  }
}
