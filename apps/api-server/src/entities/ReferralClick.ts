import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import type { Partner } from './Partner.js';
import type { Product } from './Product.js';

/**
 * ReferralClick Entity
 *
 * Tracks all clicks on referral links with filtering for duplicates, bots, and internal traffic.
 * Implements rate limiting and privacy-first data collection.
 */

export enum ClickSource {
  WEB = 'web',
  MOBILE = 'mobile',
  APP = 'app',
  EMAIL = 'email',
  SOCIAL = 'social',
  UNKNOWN = 'unknown'
}

export enum ClickStatus {
  VALID = 'valid',           // Legitimate click
  DUPLICATE = 'duplicate',   // Same user clicked multiple times (within window)
  BOT = 'bot',               // Detected as bot traffic
  INTERNAL = 'internal',     // Internal company traffic
  RATE_LIMITED = 'rate_limited', // Exceeded rate limit
  INVALID = 'invalid'        // Other invalid reasons
}

@Entity('referral_clicks')
@Index(['partnerId', 'createdAt'])
@Index(['referralCode', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['sessionId'])
@Index(['fingerprint'])
export class ReferralClick {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Partner relationship
  @Column({ type: 'uuid' })
  partnerId!: string;

  @ManyToOne('Partner', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partnerId' })
  partner!: Partner;

  // Optional product relationship (if click is on specific product)
  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne('Product', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  // Referral identification
  @Column({ type: 'varchar', length: 20 })
  referralCode!: string;

  @Column({ type: 'text', nullable: true })
  referralLink?: string;

  // Campaign tracking
  @Column({ type: 'varchar', length: 100, nullable: true })
  campaign?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  medium?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string;

  // Click metadata
  @Column({ type: 'enum', enum: ClickStatus, default: ClickStatus.VALID })
  status!: ClickStatus;

  @Column({ type: 'enum', enum: ClickSource, default: ClickSource.UNKNOWN })
  clickSource!: ClickSource;

  // Privacy-conscious tracking
  @Column({ type: 'varchar', length: 64, nullable: true })
  sessionId?: string; // Hashed session identifier

  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint?: string; // Browser fingerprint hash (for duplicate detection)

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string; // Will be anonymized after retention period

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string; // For bot detection

  @Column({ type: 'varchar', length: 500, nullable: true })
  referer?: string; // Where the click came from

  // Geolocation (optional, anonymized to city level)
  @Column({ type: 'varchar', length: 2, nullable: true })
  country?: string; // ISO 3166-1 alpha-2

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  // Device information
  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType?: string; // desktop, mobile, tablet

  @Column({ type: 'varchar', length: 50, nullable: true })
  osName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browserName?: string;

  // Duplicate detection
  @Column({ type: 'boolean', default: false })
  isDuplicate!: boolean;

  @Column({ type: 'uuid', nullable: true })
  originalClickId?: string; // Reference to first click if duplicate

  @Column({ type: 'integer', default: 1 })
  clickCount!: number; // Number of times this session clicked

  // Bot detection
  @Column({ type: 'boolean', default: false })
  isSuspiciousBot!: boolean;

  @Column({ type: 'text', nullable: true })
  botDetectionReason?: string;

  // Rate limiting
  @Column({ type: 'boolean', default: false })
  isRateLimited!: boolean;

  // Conversion tracking
  @Column({ type: 'boolean', default: false })
  hasConverted!: boolean;

  @Column({ type: 'uuid', nullable: true })
  conversionId?: string; // Link to ConversionEvent if converted

  @Column({ type: 'timestamp', nullable: true })
  convertedAt?: Date;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Audit fields
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Soft delete (for data retention compliance)
  @Column({ type: 'timestamp', nullable: true })
  anonymizedAt?: Date;

  // Helper methods
  isValid(): boolean {
    return this.status === ClickStatus.VALID && !this.isDuplicate && !this.isSuspiciousBot && !this.isRateLimited;
  }

  markAsConverted(conversionId: string): void {
    this.hasConverted = true;
    this.conversionId = conversionId;
    this.convertedAt = new Date();
  }

  markAsDuplicate(originalClickId: string): void {
    this.isDuplicate = true;
    this.originalClickId = originalClickId;
    this.status = ClickStatus.DUPLICATE;
  }

  markAsBot(reason: string): void {
    this.isSuspiciousBot = true;
    this.botDetectionReason = reason;
    this.status = ClickStatus.BOT;
  }

  markAsRateLimited(): void {
    this.isRateLimited = true;
    this.status = ClickStatus.RATE_LIMITED;
  }

  anonymize(): void {
    // Remove/hash PII for GDPR compliance
    this.ipAddress = null;
    this.userAgent = null;
    this.sessionId = null;
    this.fingerprint = null;
    this.referer = null;
    this.anonymizedAt = new Date();
  }
}
