import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * CreditRecord Entity
 *
 * Records individual credit acquisitions from course completions.
 * Links to lms-core Certificate and Course for tracking.
 */

export enum CreditType {
  COURSE_COMPLETION = 'course_completion',
  ATTENDANCE = 'attendance',
  EXTERNAL = 'external',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

@Entity('lms_yaksa_credit_records')
@Index(['userId'])
@Index(['courseId'])
@Index(['earnedAt'])
@Index(['userId', 'courseId'])
export class CreditRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID reference (from auth system)
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * Course ID reference (from lms-core)
   */
  @Column({ type: 'uuid', nullable: true })
  courseId?: string;

  /**
   * Type of credit earned
   */
  @Column({
    type: 'enum',
    enum: CreditType,
    default: CreditType.COURSE_COMPLETION,
  })
  creditType!: CreditType;

  /**
   * Credits earned from this record
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  creditsEarned!: number;

  /**
   * Date when the credits were earned
   */
  @Column({ type: 'date' })
  earnedAt!: Date;

  /**
   * Reference year for annual tracking
   */
  @Column({ type: 'integer' })
  creditYear!: number;

  /**
   * Certificate ID reference (from lms-core Certificate)
   */
  @Column({ type: 'uuid', nullable: true })
  certificateId?: string;

  /**
   * Enrollment ID reference (from lms-core Enrollment)
   */
  @Column({ type: 'uuid', nullable: true })
  enrollmentId?: string;

  /**
   * Course title snapshot (for historical reference)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  courseTitle?: string;

  /**
   * Whether this credit has been verified
   */
  @Column({ type: 'boolean', default: true })
  isVerified!: boolean;

  /**
   * Verified by user ID (admin who verified)
   */
  @Column({ type: 'uuid', nullable: true })
  verifiedBy?: string;

  /**
   * Notes or description for this credit
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

  // Helper methods

  /**
   * Check if credit was earned in a specific year
   * @param year - Year to check
   */
  isFromYear(year: number): boolean {
    return this.creditYear === year;
  }

  /**
   * Check if credit is from external source
   */
  isExternal(): boolean {
    return this.creditType === CreditType.EXTERNAL;
  }

  /**
   * Check if credit requires verification
   */
  needsVerification(): boolean {
    return !this.isVerified && this.creditType === CreditType.EXTERNAL;
  }
}
