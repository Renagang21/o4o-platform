import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * RequiredCoursePolicy Entity
 *
 * Defines mandatory course requirements for organization members.
 * Organizations (branches/chapters) can set policies for required
 * courses and minimum credit requirements.
 */
@Entity('lms_yaksa_required_course_policies')
@Index(['organizationId'])
@Index(['isActive'])
export class RequiredCoursePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Organization ID reference (from organization-core)
   * The branch/chapter that owns this policy
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * Policy name for display
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * Policy description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Whether this policy is currently active
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * List of required course IDs from lms-core
   */
  @Column({ type: 'jsonb', default: [] })
  requiredCourseIds!: string[];

  /**
   * Minimum credits required to fulfill this policy
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  requiredCredits!: number;

  /**
   * Target member types this policy applies to
   * e.g., ['new_member', 'renewal', 'all']
   */
  @Column({ type: 'simple-array', nullable: true })
  targetMemberTypes?: string[];

  /**
   * Phase 1: Target pharmacist types this policy applies to
   * Values from membership-yaksa: PharmacistType
   * e.g., ['working', 'owner', 'hospital', 'public', 'industry', 'retired', 'other']
   * If empty, applies to all pharmacist types
   */
  @Column({ type: 'simple-array', nullable: true })
  targetPharmacistTypes?: string[];

  /**
   * Period for which this policy is valid (e.g., year)
   */
  @Column({ type: 'varchar', length: 50, default: 'annual' })
  validityPeriod!: string;

  /**
   * Start date of the policy validity period
   */
  @Column({ type: 'date', nullable: true })
  validFrom?: Date;

  /**
   * End date of the policy validity period
   */
  @Column({ type: 'date', nullable: true })
  validUntil?: Date;

  /**
   * Priority for ordering policies (lower = higher priority)
   */
  @Column({ type: 'integer', default: 100 })
  priority!: number;

  /**
   * Additional notes for administrators
   */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * Additional policy metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods

  /**
   * Check if policy is currently valid based on dates
   */
  isCurrentlyValid(): boolean {
    if (!this.isActive) return false;

    const now = new Date();
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validUntil && now > this.validUntil) return false;

    return true;
  }

  /**
   * Check if a course is required by this policy
   * @param courseId - Course ID to check
   */
  isCourseRequired(courseId: string): boolean {
    return this.requiredCourseIds.includes(courseId);
  }

  /**
   * Get the number of required courses
   */
  getRequiredCourseCount(): number {
    return this.requiredCourseIds.length;
  }

  /**
   * Add a course to the required list
   * @param courseId - Course ID to add
   */
  addRequiredCourse(courseId: string): void {
    if (!this.requiredCourseIds.includes(courseId)) {
      this.requiredCourseIds.push(courseId);
    }
  }

  /**
   * Remove a course from the required list
   * @param courseId - Course ID to remove
   */
  removeRequiredCourse(courseId: string): void {
    this.requiredCourseIds = this.requiredCourseIds.filter(id => id !== courseId);
  }
}
