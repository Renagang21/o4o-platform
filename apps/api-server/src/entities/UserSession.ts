import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { BetaUser } from './BetaUser';

export enum SessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired'
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown'
}

@Entity('user_sessions')
@Index(['betaUserId', 'status', 'created_at'])
@Index(['status', 'endedAt'])
@Index(['deviceType', 'created_at'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  betaUserId!: string;

  @ManyToOne(() => BetaUser)
  @JoinColumn({ name: 'betaUserId' })
  betaUser!: BetaUser;

  // Session identification
  @Column({ type: 'varchar', length: 255 })
  sessionId!: string;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'enum', enum: DeviceType, default: DeviceType.UNKNOWN })
  deviceType!: DeviceType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  operatingSystem?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  screenResolution?: string;

  // Session lifecycle
  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int', default: 0 })
  durationMinutes!: number;

  // Activity tracking
  @Column({ type: 'int', default: 0 })
  pageViews!: number;

  @Column({ type: 'int', default: 0 })
  actions!: number;

  @Column({ type: 'int', default: 0 })
  feedbackSubmitted!: number;

  @Column({ type: 'int', default: 0 })
  contentViewed!: number;

  @Column({ type: 'int', default: 0 })
  errorsEncountered!: number;

  // Location data
  @Column({ type: 'varchar', length: 10, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  timezone?: string;

  // Referrer information
  @Column({ type: 'text', nullable: true })
  referrer?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmSource?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmMedium?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  utmCampaign?: string;

  // Performance metrics
  @Column({ type: 'json', nullable: true })
  performanceMetrics?: {
    pageLoadTime?: number;
    apiResponseTime?: number;
    errorRate?: number;
    memoryUsage?: number;
    networkLatency?: number;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Methods
  updateActivity(): void {
    this.lastActivityAt = new Date();
    this.calculateDuration();
  }

  endSession(): void {
    this.status = SessionStatus.INACTIVE;
    this.endedAt = new Date();
    this.calculateDuration();
  }

  markExpired(): void {
    this.status = SessionStatus.EXPIRED;
    this.endedAt = new Date();
    this.calculateDuration();
  }

  incrementPageViews(): void {
    this.pageViews++;
    this.updateActivity();
  }

  incrementActions(): void {
    this.actions++;
    this.updateActivity();
  }

  incrementFeedback(): void {
    this.feedbackSubmitted++;
    this.updateActivity();
  }

  incrementContentViewed(): void {
    this.contentViewed++;
    this.updateActivity();
  }

  incrementErrors(): void {
    this.errorsEncountered++;
    this.updateActivity();
  }

  private calculateDuration(): void {
    if (this.endedAt) {
      this.durationMinutes = Math.floor((this.endedAt.getTime() - this.created_at.getTime()) / (1000 * 60));
    } else if (this.lastActivityAt) {
      this.durationMinutes = Math.floor((this.lastActivityAt.getTime() - this.created_at.getTime()) / (1000 * 60));
    }
  }

  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  getEngagementScore(): number {
    const baseScore = this.pageViews * 1 + this.actions * 2 + this.feedbackSubmitted * 5 + this.contentViewed * 3;
    const timeBonus = Math.min(this.durationMinutes / 10, 10); // Max 10 points for time
    const errorPenalty = this.errorsEncountered * -1;
    
    return Math.max(0, baseScore + timeBonus + errorPenalty);
  }
}