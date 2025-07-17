import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { BetaUser } from './BetaUser';
import { User } from './User';
import { FeedbackConversation } from './FeedbackConversation';

export enum FeedbackType {
  BUG_REPORT = 'bug_report',           // 버그 신고
  FEATURE_REQUEST = 'feature_request', // 기능 요청
  GENERAL_FEEDBACK = 'general_feedback', // 일반 피드백
  USABILITY = 'usability',             // 사용성 피드백
  PERFORMANCE = 'performance',         // 성능 피드백
  SUGGESTION = 'suggestion',           // 제안사항
  COMPLAINT = 'complaint'              // 불만사항
}

export enum FeedbackStatus {
  PENDING = 'pending',       // 대기 중
  REVIEWED = 'reviewed',     // 검토됨
  IN_PROGRESS = 'in_progress', // 진행 중
  RESOLVED = 'resolved',     // 해결됨
  REJECTED = 'rejected',     // 거절됨
  ARCHIVED = 'archived'      // 보관됨
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SignageFeature {
  CONTENT_MANAGEMENT = 'content_management',
  PLAYLIST_MANAGEMENT = 'playlist_management',
  SCHEDULING = 'scheduling',
  TEMPLATES = 'templates',
  ANALYTICS = 'analytics',
  STORE_MANAGEMENT = 'store_management',
  USER_INTERFACE = 'user_interface',
  MOBILE_APP = 'mobile_app',
  API = 'api',
  INTEGRATION = 'integration'
}

@Entity('beta_feedback')
@Index(['betaUserId', 'status', 'createdAt'])
@Index(['type', 'status'])
@Index(['feature', 'priority'])
@Index(['status', 'priority', 'createdAt'])
export class BetaFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 피드백 기본 정보
  @Column({ type: 'enum', enum: FeedbackType })
  type!: FeedbackType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  reproductionSteps?: string; // 재현 단계 (버그 리포트용)

  @Column({ type: 'text', nullable: true })
  expectedBehavior?: string; // 예상 동작

  @Column({ type: 'text', nullable: true })
  actualBehavior?: string; // 실제 동작

  // 카테고리화
  @Column({ type: 'enum', enum: SignageFeature, nullable: true })
  feature?: SignageFeature;

  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.PENDING })
  status!: FeedbackStatus;

  @Column({ type: 'enum', enum: FeedbackPriority, default: FeedbackPriority.MEDIUM })
  priority!: FeedbackPriority;

  // 사용자 정보
  @Column({ type: 'uuid' })
  betaUserId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string; // 답변 받을 이메일 (다를 수 있음)

  // 기술 정보
  @Column({ type: 'varchar', length: 100, nullable: true })
  browserInfo?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType?: string; // desktop, mobile, tablet

  @Column({ type: 'varchar', length: 100, nullable: true })
  screenResolution?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  currentUrl?: string; // 피드백 발생 URL

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion?: string;

  // 첨부 파일
  @Column({ type: 'simple-array', nullable: true })
  attachments?: string[]; // 파일 경로들

  @Column({ type: 'simple-array', nullable: true })
  screenshots?: string[]; // 스크린샷 경로들

  // 관리자 응답
  @Column({ type: 'text', nullable: true })
  adminResponse?: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo?: string; // 담당자 ID

  @Column({ type: 'timestamp', nullable: true })
  responseAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  respondedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy?: string;

  // 평가 및 만족도
  @Column({ type: 'int', nullable: true })
  rating?: number; // 1-5 만족도

  @Column({ type: 'text', nullable: true })
  additionalComments?: string;

  // 내부 관리
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'text', nullable: true })
  internalNotes?: string; // 내부 관리용 메모

  @Column({ type: 'json', nullable: true })
  metadata?: {
    relatedFeedbackIds?: string[];
    duplicateOf?: string;
    estimatedEffort?: number;
    businessImpact?: string;
    [key: string]: string | number | string[] | undefined;
  };

  // Real-time fields
  @Column({ type: 'boolean', default: false })
  hasActiveConversation!: boolean;

  @Column({ type: 'boolean', default: false })
  needsImmediateAttention!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  lastViewedBy?: string;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationSent?: Date;

  @Column({ type: 'boolean', default: false })
  isLive!: boolean; // 실시간 지원 요청 여부

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => BetaUser, betaUser => betaUser.feedback)
  @JoinColumn({ name: 'betaUserId' })
  betaUser?: BetaUser;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'respondedBy' })
  responder?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolvedBy' })
  resolver?: User;

  @OneToMany(() => FeedbackConversation, conversation => conversation.feedback)
  conversations!: FeedbackConversation[];

  // Methods
  canBeResponded(): boolean {
    return [FeedbackStatus.PENDING, FeedbackStatus.REVIEWED].includes(this.status);
  }

  canBeResolved(): boolean {
    return [FeedbackStatus.REVIEWED, FeedbackStatus.IN_PROGRESS].includes(this.status);
  }

  assignTo(userId: string): void {
    this.assignedTo = userId;
    if (this.status === FeedbackStatus.PENDING) {
      this.status = FeedbackStatus.REVIEWED;
    }
  }

  respond(response: string, respondedBy: string): void {
    this.adminResponse = response;
    this.responseAt = new Date();
    this.respondedBy = respondedBy;
    
    if (this.status === FeedbackStatus.PENDING) {
      this.status = FeedbackStatus.REVIEWED;
    }
  }

  markInProgress(): void {
    this.status = FeedbackStatus.IN_PROGRESS;
  }

  resolve(resolvedBy: string): void {
    this.status = FeedbackStatus.RESOLVED;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
  }

  reject(rejectedBy: string, reason?: string): void {
    this.status = FeedbackStatus.REJECTED;
    this.resolvedAt = new Date();
    this.resolvedBy = rejectedBy;
    if (reason) {
      this.adminResponse = reason;
    }
  }

  archive(): void {
    this.status = FeedbackStatus.ARCHIVED;
  }

  addTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  getDaysOpen(): number {
    const endDate = this.resolvedAt || new Date();
    return Math.floor((endDate.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  getBusinessImpactScore(): number {
    let score = 0;
    
    // Priority weight
    switch (this.priority) {
      case FeedbackPriority.CRITICAL: score += 10; break;
      case FeedbackPriority.HIGH: score += 7; break;
      case FeedbackPriority.MEDIUM: score += 4; break;
      case FeedbackPriority.LOW: score += 1; break;
    }

    // Type weight
    switch (this.type) {
      case FeedbackType.BUG_REPORT: score += 5; break;
      case FeedbackType.FEATURE_REQUEST: score += 3; break;
      case FeedbackType.PERFORMANCE: score += 4; break;
      case FeedbackType.USABILITY: score += 2; break;
      default: score += 1;
    }

    // Age penalty (older feedback gets higher score)
    const daysOld = this.getDaysOpen();
    if (daysOld > 30) score += 3;
    else if (daysOld > 14) score += 2;
    else if (daysOld > 7) score += 1;

    return score;
  }

  // Real-time support methods
  markAsViewed(viewedBy: string): void {
    this.lastViewedAt = new Date();
    this.lastViewedBy = viewedBy;
    this.viewCount += 1;
  }

  startLiveSupport(): void {
    this.isLive = true;
    this.hasActiveConversation = true;
    this.needsImmediateAttention = true;
  }

  endLiveSupport(): void {
    this.isLive = false;
    this.needsImmediateAttention = false;
  }

  updateNotificationSent(): void {
    this.lastNotificationSent = new Date();
  }

  needsAttention(): boolean {
    return this.needsImmediateAttention || 
           this.priority === FeedbackPriority.CRITICAL ||
           this.isLive;
  }

  getMinutesSinceLastView(): number {
    if (!this.lastViewedAt) return Infinity;
    return Math.floor((Date.now() - this.lastViewedAt.getTime()) / (1000 * 60));
  }

  shouldNotify(): boolean {
    // Notify if critical or high priority and no notification sent in last 30 minutes
    if (this.priority === FeedbackPriority.CRITICAL || this.priority === FeedbackPriority.HIGH) {
      if (!this.lastNotificationSent) return true;
      const minutesSinceLastNotification = Math.floor((Date.now() - this.lastNotificationSent.getTime()) / (1000 * 60));
      return minutesSinceLastNotification >= 30;
    }
    return false;
  }
}