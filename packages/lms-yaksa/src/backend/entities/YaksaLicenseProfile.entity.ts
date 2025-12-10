import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * YaksaLicenseProfile Entity
 *
 * Manages pharmacist license information and training requirements.
 * Tracks license numbers, expiration dates, and accumulated credits.
 */
@Entity('lms_yaksa_license_profiles')
@Index(['userId'], { unique: true })
@Index(['organizationId'])
@Index(['licenseNumber'])
export class YaksaLicenseProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID reference (from auth system)
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * Organization ID reference (from organization-core)
   * Represents the pharmacist association branch/chapter
   */
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  /**
   * Pharmacist license number
   */
  @Column({ type: 'varchar', length: 50 })
  licenseNumber!: string;

  /**
   * License issued date
   */
  @Column({ type: 'date' })
  licenseIssuedAt!: Date;

  /**
   * License expiration date (if applicable)
   */
  @Column({ type: 'date', nullable: true })
  licenseExpiresAt?: Date;

  /**
   * Total accumulated credits from completed courses
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  totalCredits!: number;

  /**
   * Credits earned in the current year
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  currentYearCredits!: number;

  /**
   * Whether license renewal is required based on credit requirements
   */
  @Column({ type: 'boolean', default: false })
  isRenewalRequired!: boolean;

  /**
   * Last verification date of the license
   */
  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt?: Date;

  /**
   * Additional profile metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods

  /**
   * Check if license is valid (not expired)
   */
  isLicenseValid(): boolean {
    if (!this.licenseExpiresAt) return true;
    return new Date() < this.licenseExpiresAt;
  }

  /**
   * Check if annual credit requirement is met
   * @param requiredCredits - Required credits per year
   */
  hasMetCreditRequirement(requiredCredits: number): boolean {
    return Number(this.currentYearCredits) >= requiredCredits;
  }

  /**
   * Add credits to the profile
   * @param credits - Credits to add
   */
  addCredits(credits: number): void {
    this.totalCredits = Number(this.totalCredits) + credits;
    this.currentYearCredits = Number(this.currentYearCredits) + credits;
  }

  /**
   * Reset yearly credits (typically called at year start)
   */
  resetYearlyCredits(): void {
    this.currentYearCredits = 0;
  }
}
