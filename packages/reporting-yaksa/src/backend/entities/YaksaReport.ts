import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { YaksaReportHistory } from './YaksaReportHistory.js';

/**
 * 신고서 유형 (RPA 트리거 기반)
 */
export type YaksaReportType = 'PROFILE_UPDATE' | 'LICENSE_CHANGE' | 'WORKPLACE_CHANGE' | 'AFFILIATION_CHANGE';

/**
 * 신고서 상태
 */
export type YaksaReportStatus = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

/**
 * YaksaReport Entity
 *
 * forum-yaksa RPA 트리거 기반으로 자동 생성되는 신고서 초안
 *
 * 워크플로우:
 * 1. forum-yaksa에서 RPA 트리거 감지
 * 2. YaksaReport DRAFT 자동 생성
 * 3. 운영자 검토 (REVIEWED)
 * 4. 승인(APPROVED) 또는 반려(REJECTED)
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-123",
 *   reportType: "PROFILE_UPDATE",
 *   sourcePostId: "forum-post-456",
 *   status: "DRAFT",
 *   payload: {
 *     phoneNumber: "010-1234-5678",
 *     email: "new@email.com"
 *   },
 *   confidence: 0.85
 * }
 * ```
 */
@Entity('yaksa_rpa_reports')
@Index(['memberId'])
@Index(['status'])
@Index(['reportType'])
@Index(['sourcePostId'])
@Index(['createdAt'])
export class YaksaReport {
  /**
   * 신고서 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 신고서 유형
   *
   * - PROFILE_UPDATE: 개인정보 변경
   * - LICENSE_CHANGE: 면허 관련 변경
   * - WORKPLACE_CHANGE: 근무지 변경
   * - AFFILIATION_CHANGE: 소속 변경
   */
  @Column({
    type: 'varchar',
    length: 30,
  })
  reportType!: YaksaReportType;

  /**
   * 원본 게시글 ID (FK → forum_post.id)
   *
   * RPA 트리거를 발생시킨 포럼 게시글
   */
  @Column({ type: 'uuid' })
  sourcePostId!: string;

  /**
   * 신고서 상태
   *
   * - DRAFT: 자동 생성된 초안
   * - REVIEWED: 운영자 검토 완료 (수정됨)
   * - APPROVED: 승인됨
   * - REJECTED: 반려됨
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'DRAFT',
  })
  status!: YaksaReportStatus;

  /**
   * 신고서 페이로드 (JSON)
   *
   * RPA가 추출한 변경 정보
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  /**
   * RPA 신뢰도 (0.0 ~ 1.0)
   *
   * AI/패턴 매칭 결과의 신뢰도
   */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  confidence!: number;

  /**
   * 원본 트리거 정보 (JSON)
   *
   * forum_post.metadata.yaksa.rpaTrigger 스냅샷
   */
  @Column({ type: 'jsonb', nullable: true })
  triggerSnapshot?: Record<string, any>;

  /**
   * 회원 정보 스냅샷 (JSON)
   *
   * 신고서 생성 시점의 회원 정보 스냅샷
   */
  @Column({ type: 'jsonb', nullable: true })
  memberSnapshot?: Record<string, any>;

  /**
   * 운영자 메모
   */
  @Column({ type: 'text', nullable: true })
  operatorNotes?: string;

  /**
   * 반려 사유
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  /**
   * 검토자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string;

  /**
   * 검토일시
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  /**
   * 승인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  /**
   * 승인일시
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations

  /**
   * 상태 변경 이력
   */
  @OneToMany('YaksaReportHistory', 'report')
  history?: YaksaReportHistory[];

  // Helper methods

  /**
   * 검토 가능 여부 확인
   */
  canReview(): boolean {
    return this.status === 'DRAFT';
  }

  /**
   * 승인/반려 가능 여부 확인
   */
  canApproveOrReject(): boolean {
    return this.status === 'DRAFT' || this.status === 'REVIEWED';
  }

  /**
   * 수정 가능 여부 확인
   */
  canEdit(): boolean {
    return this.status === 'DRAFT' || this.status === 'REVIEWED';
  }
}
