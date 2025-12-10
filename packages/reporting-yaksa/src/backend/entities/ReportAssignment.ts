import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AnnualReport } from './AnnualReport.js';

/**
 * 담당자 역할 타입
 */
export type AssignmentRole = 'branch_admin' | 'district_admin' | 'national_admin' | 'reviewer';

/**
 * 배정 상태
 */
export type AssignmentStatus = 'pending' | 'in_review' | 'completed' | 'transferred';

/**
 * ReportAssignment Entity
 *
 * 신상신고서의 승인 담당자 배정
 * 분회 → 지부 → 본부 순으로 승인 체계를 구성할 수 있음
 *
 * @example
 * ```typescript
 * {
 *   reportId: "report-123",
 *   assignedTo: "admin-456",
 *   role: "branch_admin",
 *   status: "pending",
 *   assignedAt: "2025-01-15T09:00:00Z"
 * }
 * ```
 */
@Entity('yaksa_report_assignments')
@Index(['reportId'])
@Index(['assignedTo'])
@Index(['status'])
@Index(['role'])
export class ReportAssignment {
  /**
   * 배정 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 신고서 ID (FK → yaksa_annual_reports.id)
   */
  @Column({ type: 'uuid' })
  reportId!: string;

  /**
   * 신고서 관계
   */
  @ManyToOne(() => AnnualReport, (report) => report.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report!: AnnualReport;

  /**
   * 담당자 ID (FK → users.id)
   */
  @Column({ type: 'uuid' })
  assignedTo!: string;

  /**
   * 담당자 역할
   *
   * - branch_admin: 분회 관리자
   * - district_admin: 지부 관리자
   * - national_admin: 본부 관리자
   * - reviewer: 일반 검토자
   */
  @Column({ type: 'varchar', length: 30 })
  role!: AssignmentRole;

  /**
   * 배정 상태
   *
   * - pending: 검토 대기
   * - in_review: 검토 중
   * - completed: 검토 완료
   * - transferred: 상위 조직으로 이관
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: AssignmentStatus;

  /**
   * 배정 조직 ID (FK → organizations.id)
   *
   * 어느 조직 레벨에서 배정되었는지 기록
   */
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  /**
   * 배정 순서 (다단계 승인 시)
   *
   * 1: 1차 검토 (분회)
   * 2: 2차 검토 (지부)
   * 3: 최종 승인 (본부)
   */
  @Column({ type: 'int', default: 1 })
  order!: number;

  /**
   * 배정자 ID (누가 배정했는지)
   */
  @Column({ type: 'uuid', nullable: true })
  assignedBy?: string;

  /**
   * 배정일시
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  /**
   * 검토 시작일시
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewStartedAt?: Date;

  /**
   * 완료일시
   */
  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  /**
   * 검토 결과
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  result?: 'approved' | 'rejected' | 'transferred';

  /**
   * 검토 코멘트
   */
  @Column({ type: 'text', nullable: true })
  comment?: string;

  /**
   * 이관 대상 (transferred 시)
   */
  @Column({ type: 'uuid', nullable: true })
  transferredTo?: string;

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

  // Helper methods

  /**
   * 검토 가능 여부
   */
  canReview(): boolean {
    return this.status === 'pending' || this.status === 'in_review';
  }

  /**
   * 검토 시작
   */
  startReview(): void {
    if (this.status === 'pending') {
      this.status = 'in_review';
      this.reviewStartedAt = new Date();
    }
  }

  /**
   * 검토 완료
   */
  completeReview(result: 'approved' | 'rejected' | 'transferred', comment?: string): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.result = result;
    if (comment) {
      this.comment = comment;
    }
  }
}
