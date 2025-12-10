import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ReportFieldTemplate } from './ReportFieldTemplate.js';
import { ReportLog } from './ReportLog.js';
import { ReportAssignment } from './ReportAssignment.js';

/**
 * 신상신고 상태
 */
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';

/**
 * AnnualReport Entity
 *
 * 약사 회원의 연간 신상신고서
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-123",
 *   organizationId: "org-seoul-gangnam",
 *   year: 2025,
 *   status: "submitted",
 *   fields: {
 *     licenseNumber: "12345-67890",
 *     workplaceType: "pharmacy_owner",
 *     pharmacyName: "행복약국",
 *     pharmacyAddress: "서울시 강남구...",
 *     categoryChange: null,
 *     organizationChange: null
 *   },
 *   submittedAt: "2025-01-15T09:00:00Z"
 * }
 * ```
 */
@Entity('yaksa_annual_reports')
@Index(['memberId', 'year'], { unique: true })
@Index(['organizationId'])
@Index(['status'])
@Index(['year'])
@Index(['submittedAt'])
export class AnnualReport {
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
   * 제출 시점의 소속 조직 ID (FK → organizations.id)
   *
   * 신고서 제출 당시의 소속을 기록 (이력 보존)
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 신고 연도
   */
  @Column({ type: 'int' })
  year!: number;

  /**
   * 사용된 템플릿 ID (FK → yaksa_report_field_templates.id)
   */
  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  /**
   * 템플릿 관계
   */
  @ManyToOne(() => ReportFieldTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: ReportFieldTemplate;

  /**
   * 신고서 상태
   *
   * - draft: 임시 저장 (미제출)
   * - submitted: 제출됨 (검토 대기)
   * - approved: 승인됨
   * - rejected: 반려됨
   * - revision_requested: 수정 요청됨
   */
  @Column({
    type: 'varchar',
    length: 30,
    default: 'draft',
  })
  status!: ReportStatus;

  /**
   * 신고서 필드 데이터 (JSON)
   *
   * 템플릿의 fields 정의에 따라 저장된 실제 값
   */
  @Column({ type: 'jsonb' })
  fields!: Record<string, any>;

  /**
   * 제출일시
   */
  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  /**
   * 승인일시
   */
  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  /**
   * 승인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  /**
   * 반려일시
   */
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  /**
   * 반려자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  rejectedBy?: string;

  /**
   * 반려 사유
   */
  @Column({ type: 'text', nullable: true })
  rejectedReason?: string;

  /**
   * 수정 요청 사유 (revision_requested 상태일 때)
   */
  @Column({ type: 'text', nullable: true })
  revisionReason?: string;

  /**
   * 관리자 메모 (내부용)
   */
  @Column({ type: 'text', nullable: true })
  adminNotes?: string;

  /**
   * Membership-Yaksa 동기화 완료 여부
   *
   * 승인 후 회원 정보 업데이트가 완료되었는지 표시
   */
  @Column({ type: 'boolean', default: false })
  syncedToMembership!: boolean;

  /**
   * 동기화 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  syncedAt?: Date;

  /**
   * 동기화된 변경 사항 (로그용)
   */
  @Column({ type: 'jsonb', nullable: true })
  syncedChanges?: Record<string, { from: any; to: any }>;

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
   * 감사 로그
   */
  @OneToMany(() => ReportLog, (log) => log.report)
  logs?: ReportLog[];

  /**
   * 승인 담당자 배정
   */
  @OneToMany(() => ReportAssignment, (assignment) => assignment.report)
  assignments?: ReportAssignment[];

  // Helper methods

  /**
   * 제출 가능 여부 확인
   */
  canSubmit(): boolean {
    return this.status === 'draft' || this.status === 'revision_requested';
  }

  /**
   * 수정 가능 여부 확인
   */
  canEdit(): boolean {
    return this.status === 'draft' || this.status === 'revision_requested';
  }

  /**
   * 승인/반려 가능 여부 확인
   */
  canReview(): boolean {
    return this.status === 'submitted';
  }
}
