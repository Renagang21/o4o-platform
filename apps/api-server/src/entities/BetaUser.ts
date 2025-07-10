import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { BetaFeedback } from './BetaFeedback';
import { FeedbackConversation } from './FeedbackConversation';

export enum BetaUserStatus {
  PENDING = 'pending',      // 등록 대기
  APPROVED = 'approved',    // 승인됨
  ACTIVE = 'active',        // 활성 사용자
  INACTIVE = 'inactive',    // 비활성 사용자
  SUSPENDED = 'suspended'   // 정지된 사용자
}

export enum BetaUserType {
  INDIVIDUAL = 'individual',   // 개인 사용자
  BUSINESS = 'business',       // 비즈니스 사용자
  DEVELOPER = 'developer',     // 개발자
  PARTNER = 'partner'          // 파트너
}

export enum InterestArea {
  RETAIL = 'retail',           // 소매업
  HEALTHCARE = 'healthcare',   // 헬스케어
  FOOD_SERVICE = 'food_service', // 음식점
  CORPORATE = 'corporate',     // 기업
  EDUCATION = 'education',     // 교육
  GOVERNMENT = 'government',   // 정부/공공기관
  OTHER = 'other'              // 기타
}

@Entity('beta_users')
@Index(['email'], { unique: true })
@Index(['status', 'createdAt'])
@Index(['type', 'status'])
export class BetaUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 기본 정보
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobTitle?: string;

  // 베타 관련 정보
  @Column({ type: 'enum', enum: BetaUserStatus, default: BetaUserStatus.PENDING })
  status!: BetaUserStatus;

  @Column({ type: 'enum', enum: BetaUserType, default: BetaUserType.INDIVIDUAL })
  type!: BetaUserType;

  @Column({ type: 'enum', enum: InterestArea, default: InterestArea.OTHER })
  interestArea!: InterestArea;

  @Column({ type: 'text', nullable: true })
  useCase?: string; // 사용 목적/계획

  @Column({ type: 'text', nullable: true })
  expectations?: string; // 기대사항

  @Column({ type: 'simple-array', nullable: true })
  interestedFeatures?: string[]; // 관심 있는 기능들

  // 승인 관련
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'text', nullable: true })
  approvalNotes?: string;

  // 활동 추적
  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  @Column({ type: 'int', default: 0 })
  feedbackCount!: number;

  @Column({ type: 'int', default: 0 })
  loginCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  firstLoginAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  // 추가 메타데이터
  @Column({ type: 'json', nullable: true })
  metadata?: {
    referralSource?: string;
    browserInfo?: string;
    ipAddress?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => BetaFeedback, feedback => feedback.betaUser)
  feedback?: BetaFeedback[];

  @OneToMany(() => FeedbackConversation, conversation => conversation.betaUser)
  conversations?: FeedbackConversation[];

  // Methods
  canProvideFeedback(): boolean {
    return this.status === BetaUserStatus.ACTIVE || this.status === BetaUserStatus.APPROVED;
  }

  approve(approvedBy: string, notes?: string): void {
    this.status = BetaUserStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
    this.approvalNotes = notes;
  }

  activate(): void {
    if (this.status === BetaUserStatus.APPROVED) {
      this.status = BetaUserStatus.ACTIVE;
      this.lastActiveAt = new Date();
    }
  }

  updateActivity(): void {
    this.lastActiveAt = new Date();
  }

  recordLogin(): void {
    this.loginCount++;
    this.lastLoginAt = new Date();
    
    if (!this.firstLoginAt) {
      this.firstLoginAt = new Date();
    }
    
    this.updateActivity();
  }

  incrementFeedbackCount(): void {
    this.feedbackCount++;
    this.updateActivity();
  }

  getEngagementLevel(): 'low' | 'medium' | 'high' {
    if (this.feedbackCount >= 10 && this.loginCount >= 20) {
      return 'high';
    } else if (this.feedbackCount >= 3 && this.loginCount >= 5) {
      return 'medium';
    }
    return 'low';
  }

  getDaysSinceRegistration(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  getDaysSinceLastActive(): number {
    if (!this.lastActiveAt) return -1;
    return Math.floor((Date.now() - this.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}