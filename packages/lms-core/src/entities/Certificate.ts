import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Course } from './Course.js';

/**
 * Certificate Entity
 *
 * Represents a certificate issued to a user upon course completion.
 */

@Entity('lms_certificates')
@Unique(['userId', 'courseId'])
@Index(['userId'])
@Index(['courseId'])
@Index(['certificateNumber'], { unique: true })
export class Certificate {
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

  // Certificate Information
  @Column({ type: 'varchar', length: 100, unique: true })
  certificateNumber!: string; // Unique certificate number

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificateUrl?: string; // URL to PDF certificate

  @Column({ type: 'varchar', length: 500, nullable: true })
  badgeUrl?: string; // Digital badge URL

  // Completion Details
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  credits!: number; // Educational credits earned

  @Column({ type: 'timestamp' })
  completedAt!: Date;

  // Validity
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'boolean', default: true })
  isValid!: boolean;

  // Issuer Information
  @Column({ type: 'uuid', nullable: true })
  issuedBy?: string; // User ID of issuer (instructor/admin)

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuerName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuerTitle?: string;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    courseDuration?: number;
    totalLessons?: number;
    enrollmentDate?: Date;
    completionDate?: Date;
    instructor?: string;
    organization?: string;
  };

  // Verification
  @Column({ type: 'varchar', length: 255, nullable: true })
  verificationCode?: string; // For third-party verification

  @Column({ type: 'varchar', length: 500, nullable: true })
  verificationUrl?: string;

  // Timestamps
  @CreateDateColumn()
  issuedAt!: Date;

  // Helper Methods

  /**
   * Generate certificate number
   */
  static generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  /**
   * Generate verification code
   */
  static generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }

  /**
   * Check if certificate is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Revoke certificate
   */
  revoke(): void {
    this.isValid = false;
  }

  /**
   * Renew certificate (extend expiration)
   */
  renew(months: number = 12): void {
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + months);
    this.expiresAt = expirationDate;
    this.isValid = true;
  }
}
