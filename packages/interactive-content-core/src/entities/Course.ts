import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Course Entity
 *
 * Represents an educational course/program in the LMS.
 * Can be organization-scoped for organization-specific training.
 */

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('lms_courses')
@Index(['organizationId', 'status'])
@Index(['instructorId'])
@Index(['status', 'createdAt'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Basic Information
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  @Column({ type: 'enum', enum: CourseLevel, default: CourseLevel.BEGINNER })
  level!: CourseLevel;

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status!: CourseStatus;

  // Duration in minutes
  @Column({ type: 'integer', default: 0 })
  duration!: number;

  // Instructor
  @Column({ type: 'uuid' })
  instructorId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'instructorId' })
  instructor?: any;

  // Organization relationship (for organization-scoped courses)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: any;

  @Column({ type: 'boolean', default: false })
  isOrganizationExclusive!: boolean;

  // Course Settings
  @Column({ type: 'boolean', default: false })
  isRequired!: boolean; // 필수 교육 여부

  @Column({ type: 'boolean', default: true })
  isPublished!: boolean;

  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean; // 수강 승인 필요 여부

  @Column({ type: 'integer', nullable: true })
  maxEnrollments?: number; // 최대 수강 인원

  @Column({ type: 'integer', default: 0 })
  currentEnrollments!: number; // 현재 수강 인원

  // Schedule
  @Column({ type: 'timestamp', nullable: true })
  startAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt?: Date;

  // Credits/Points (for accreditation)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  credits!: number; // 연수 평점

  // Paid Course (WO-LMS-PAID-COURSE-V1)
  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // Helper Methods

  /**
   * Check if course is currently active
   */
  isActive(): boolean {
    if (this.status !== CourseStatus.PUBLISHED) return false;
    const now = new Date();
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;
    return true;
  }

  /**
   * Check if course is full
   */
  isFull(): boolean {
    if (!this.maxEnrollments) return false;
    return this.currentEnrollments >= this.maxEnrollments;
  }

  /**
   * Check if user can enroll
   */
  canEnroll(): boolean {
    return this.isActive() && !this.isFull();
  }

  /**
   * Increment enrollment count
   */
  incrementEnrollments(): void {
    this.currentEnrollments++;
  }

  /**
   * Decrement enrollment count
   */
  decrementEnrollments(): void {
    this.currentEnrollments = Math.max(0, this.currentEnrollments - 1);
  }

  /**
   * Publish course
   */
  publish(): void {
    this.status = CourseStatus.PUBLISHED;
    this.isPublished = true;
    this.publishedAt = new Date();
  }

  /**
   * Archive course
   */
  archive(): void {
    this.status = CourseStatus.ARCHIVED;
    this.isPublished = false;
  }
}
