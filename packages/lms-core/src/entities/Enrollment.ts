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
import { Course } from './Course.js';

/**
 * Enrollment Entity
 *
 * Represents a user's enrollment in a course.
 */

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',      // WO-LMS-INSTRUCTOR-ROLE-V1: 강사 승인됨
  REJECTED = 'rejected',      // WO-LMS-INSTRUCTOR-ROLE-V1: 강사 거절됨
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('lms_enrollments')
@Unique(['userId', 'courseId'])
@Index(['userId', 'status'])
@Index(['courseId', 'status'])
@Index(['organizationId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // User relationship
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user?: any;

  // Course relationship
  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  // Organization relationship (inherited from course or user's organization)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: any;

  // Enrollment Status
  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  status!: EnrollmentStatus;

  // Progress Tracking
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage!: number; // 0-100

  @Column({ type: 'integer', default: 0 })
  completedLessons!: number;

  @Column({ type: 'integer', default: 0 })
  totalLessons!: number;

  @Column({ type: 'integer', default: 0 })
  timeSpent!: number; // Total time spent in minutes

  // Scores (for courses with quizzes)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore?: number; // 0-100

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageQuizScore?: number;

  // Completion
  @Column({ type: 'timestamp', nullable: true })
  enrolledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  // Certificate
  @Column({ type: 'uuid', nullable: true })
  certificateId?: string;

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
   * Check if enrollment is active
   */
  isActive(): boolean {
    return this.status === EnrollmentStatus.IN_PROGRESS;
  }

  /**
   * Check if enrollment is completed
   */
  isCompleted(): boolean {
    return this.status === EnrollmentStatus.COMPLETED;
  }

  /**
   * Start the enrollment
   */
  start(): void {
    this.status = EnrollmentStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }

  /**
   * Complete the enrollment
   */
  complete(finalScore?: number): void {
    this.status = EnrollmentStatus.COMPLETED;
    this.completedAt = new Date();
    this.progressPercentage = 100;
    if (finalScore !== undefined) {
      this.finalScore = finalScore;
    }
  }

  /**
   * Cancel the enrollment
   */
  cancel(): void {
    this.status = EnrollmentStatus.CANCELLED;
  }

  /**
   * Update progress percentage
   */
  updateProgress(completedLessons: number, totalLessons: number): void {
    this.completedLessons = completedLessons;
    this.totalLessons = totalLessons;
    this.progressPercentage = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;
  }

  /**
   * Add time spent
   */
  addTimeSpent(minutes: number): void {
    this.timeSpent += minutes;
  }

  /**
   * Check if expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}
