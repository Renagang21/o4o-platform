import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * YaksaCourseAssignment Entity
 *
 * Assigns specific courses to members based on organization policies.
 * Tracks whether assigned courses have been completed.
 */

export enum AssignmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('lms_yaksa_course_assignments')
@Index(['userId'])
@Index(['organizationId'])
@Index(['courseId'])
@Index(['status'])
@Index(['userId', 'courseId'], { unique: true })
export class YaksaCourseAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID reference (from auth system)
   * The member who is assigned this course
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * Organization ID reference (from organization-core)
   * The branch/chapter that made this assignment
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * Course ID reference (from lms-core)
   */
  @Column({ type: 'uuid' })
  courseId!: string;

  /**
   * Policy ID reference (from RequiredCoursePolicy)
   * If this assignment was created by a policy
   */
  @Column({ type: 'uuid', nullable: true })
  policyId?: string;

  /**
   * Current status of the assignment
   */
  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING,
  })
  status!: AssignmentStatus;

  /**
   * Whether the assigned course has been completed
   */
  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  /**
   * Date when the course was completed
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  /**
   * Deadline for completing this assignment
   */
  @Column({ type: 'date', nullable: true })
  dueDate?: Date;

  /**
   * Date when the assignment was made
   */
  @Column({ type: 'date' })
  assignedAt!: Date;

  /**
   * User ID who made the assignment (admin)
   */
  @Column({ type: 'uuid', nullable: true })
  assignedBy?: string;

  /**
   * Enrollment ID if user has enrolled (from lms-core)
   */
  @Column({ type: 'uuid', nullable: true })
  enrollmentId?: string;

  /**
   * Progress percentage (0-100)
   */
  @Column({ type: 'integer', default: 0 })
  progressPercent!: number;

  /**
   * Priority level for this assignment
   */
  @Column({ type: 'integer', default: 0 })
  priority!: number;

  /**
   * Whether this is a mandatory assignment
   */
  @Column({ type: 'boolean', default: true })
  isMandatory!: boolean;

  /**
   * Notes about this assignment
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * Additional metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods

  /**
   * Check if assignment is overdue
   */
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    if (this.isCompleted) return false;
    return new Date() > this.dueDate;
  }

  /**
   * Check if assignment is in active status
   */
  isActive(): boolean {
    return [AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS].includes(this.status);
  }

  /**
   * Mark assignment as completed
   */
  markCompleted(): void {
    this.status = AssignmentStatus.COMPLETED;
    this.isCompleted = true;
    this.completedAt = new Date();
    this.progressPercent = 100;
  }

  /**
   * Mark assignment as in progress
   */
  markInProgress(): void {
    this.status = AssignmentStatus.IN_PROGRESS;
  }

  /**
   * Mark assignment as expired
   */
  markExpired(): void {
    this.status = AssignmentStatus.EXPIRED;
  }

  /**
   * Cancel the assignment
   */
  cancel(): void {
    this.status = AssignmentStatus.CANCELLED;
  }

  /**
   * Update progress
   * @param percent - Progress percentage (0-100)
   */
  updateProgress(percent: number): void {
    this.progressPercent = Math.min(100, Math.max(0, percent));
    if (this.progressPercent > 0 && this.status === AssignmentStatus.PENDING) {
      this.status = AssignmentStatus.IN_PROGRESS;
    }
    if (this.progressPercent === 100) {
      this.markCompleted();
    }
  }

  /**
   * Link to enrollment
   * @param enrollmentId - Enrollment ID from lms-core
   */
  linkEnrollment(enrollmentId: string): void {
    this.enrollmentId = enrollmentId;
    if (this.status === AssignmentStatus.PENDING) {
      this.status = AssignmentStatus.IN_PROGRESS;
    }
  }
}
