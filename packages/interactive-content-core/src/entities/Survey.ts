import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * Survey Entity
 *
 * 설문조사 엔진
 *
 * 사용 사례:
 * - 시장조사용 설문조사
 * - 교육 만족도 조사
 * - 사용자 피드백 수집
 * - 마케팅 리서치
 */

export enum SurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/**
 * WO-O4O-SURVEY-CORE-PHASE1-V1 — owner_type 분류
 * 설문 작성 주체. Phase 1에서는 service_operator / community_member 2종 활용.
 */
export enum SurveyOwnerType {
  PLATFORM_OPERATOR = 'platform_operator',
  SERVICE_OPERATOR = 'service_operator',
  SUPPLIER = 'supplier',
  STORE_OWNER = 'store_owner',
  COMMUNITY_MEMBER = 'community_member',
}

/**
 * WO-O4O-SURVEY-CORE-PHASE1-V1 — visibility (응답 자격)
 * Phase 1에서는 public / members_only / organization 3종 활용.
 */
export enum SurveyVisibility {
  PUBLIC = 'public',
  MEMBERS_ONLY = 'members_only',
  PHARMACY_ONLY = 'pharmacy_only',
  STORE_OWNER_ONLY = 'store_owner_only',
  ORGANIZATION = 'organization',
  SUPPLIER_TARGET = 'supplier_target',
  CUSTOM_TARGET = 'custom_target',
}

@Entity('lms_surveys')
@Index(['status', 'createdAt'])
@Index(['bundleId'])
@Index(['serviceKey'])
@Index(['ownerType', 'ownerId'])
@Index(['visibility'])
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: SurveyStatus,
    default: SurveyStatus.DRAFT,
  })
  status!: SurveyStatus;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  // ContentBundle 연결 (optional)
  @Column({ type: 'uuid', nullable: true })
  bundleId?: string;

  // 설문 시작/종료일
  @Column({ type: 'timestamp', nullable: true })
  startAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt?: Date;

  // 익명 응답 허용
  @Column({ type: 'boolean', default: false })
  allowAnonymous!: boolean;

  // 중복 응답 허용
  @Column({ type: 'boolean', default: false })
  allowMultipleResponses!: boolean;

  // 응답 수 제한
  @Column({ type: 'integer', nullable: true })
  maxResponses?: number;

  // 현재 응답 수
  @Column({ type: 'integer', default: 0 })
  responseCount!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  // WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Participation Engine 분류 축
  @Column({ name: 'service_key', type: 'varchar', length: 50, default: 'global' })
  serviceKey!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 30, default: SurveyOwnerType.COMMUNITY_MEMBER })
  ownerType!: SurveyOwnerType;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ name: 'visibility', type: 'varchar', length: 30, default: SurveyVisibility.MEMBERS_ONLY })
  visibility!: SurveyVisibility;

  @Column({ name: 'target_filter', type: 'jsonb', default: {} })
  targetFilter!: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Publish and activate the survey
   */
  publish(): void {
    this.isPublished = true;
    this.status = SurveyStatus.ACTIVE;
    this.publishedAt = new Date();
  }

  /**
   * Close the survey
   */
  close(): void {
    this.status = SurveyStatus.CLOSED;
  }

  /**
   * Archive the survey
   */
  archive(): void {
    this.status = SurveyStatus.ARCHIVED;
    this.isPublished = false;
  }

  /**
   * Check if survey is accepting responses
   */
  isAcceptingResponses(): boolean {
    if (this.status !== SurveyStatus.ACTIVE) return false;
    if (this.maxResponses && this.responseCount >= this.maxResponses) return false;

    const now = new Date();
    if (this.startAt && now < this.startAt) return false;
    if (this.endAt && now > this.endAt) return false;

    return true;
  }

  /**
   * Increment response count
   */
  incrementResponseCount(): void {
    this.responseCount++;
  }
}
