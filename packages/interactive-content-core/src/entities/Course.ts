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

/**
 * WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1
 * 같은 lms_courses 테이블에 들어가는 두 종류의 코스를 구분하는 분류 축.
 *
 *   LECTURE          : /instructor/courses/new 에서 만든 LMS 일반 강의 (기본값)
 *   CONTENT_RESOURCE : /content/courses/new 에서 만든 콘텐츠 허브의 "코스형 자료"
 */
export enum ContentKind {
  LECTURE = 'lecture',
  CONTENT_RESOURCE = 'content_resource',
}

/**
 * WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
 * 강의 공개 범위.
 *
 *   PUBLIC  : 공개 강의 (목록/상세 노출. 비로그인 접근 정책은 별도 WO에서 처리)
 *   MEMBERS : 회원제 강의 (기본값. 로그인 회원만)
 */
export enum CourseVisibility {
  PUBLIC = 'public',
  MEMBERS = 'members',
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

  // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 코스형 자료 vs 일반 강의 분류
  @Column({ name: 'content_kind', type: 'varchar', length: 30, default: ContentKind.LECTURE })
  contentKind!: ContentKind;

  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개 강의 vs 회원제 강의
  @Column({ name: 'visibility', type: 'varchar', length: 20, default: CourseVisibility.MEMBERS })
  visibility!: CourseVisibility;

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

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

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
