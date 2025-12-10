import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AnnualReport } from './AnnualReport.js';

/**
 * 로그 액션 타입
 */
export type ReportLogAction =
  | 'created'
  | 'updated'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'synced'
  | 'assigned'
  | 'unassigned'
  | 'commented';

/**
 * ReportLog Entity
 *
 * 신상신고서의 모든 변경 이력을 기록하는 감사 로그
 *
 * @example
 * ```typescript
 * {
 *   reportId: "report-123",
 *   action: "submitted",
 *   actorId: "user-456",
 *   actorName: "김약사",
 *   data: {
 *     previousStatus: "draft",
 *     newStatus: "submitted"
 *   },
 *   createdAt: "2025-01-15T09:00:00Z"
 * }
 * ```
 */
@Entity('yaksa_report_logs')
@Index(['reportId'])
@Index(['actorId'])
@Index(['action'])
@Index(['createdAt'])
export class ReportLog {
  /**
   * 로그 ID (PK)
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
  @ManyToOne(() => AnnualReport, (report) => report.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportId' })
  report!: AnnualReport;

  /**
   * 액션 타입
   */
  @Column({ type: 'varchar', length: 50 })
  action!: ReportLogAction;

  /**
   * 액션 수행자 ID (FK → users.id)
   *
   * 시스템 자동 작업의 경우 null
   */
  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  /**
   * 액션 수행자 이름 (스냅샷)
   *
   * 사용자 정보가 변경되어도 로그에는 당시 이름 유지
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  actorName?: string;

  /**
   * 액션 수행자 역할 (스냅샷)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole?: string;

  /**
   * 액션 관련 데이터 (JSON)
   *
   * @example
   * ```typescript
   * // 상태 변경 시
   * {
   *   previousStatus: "draft",
   *   newStatus: "submitted"
   * }
   *
   * // 필드 수정 시
   * {
   *   changedFields: {
   *     pharmacyName: { from: "행복약국", to: "새행복약국" },
   *     pharmacyAddress: { from: "...", to: "..." }
   *   }
   * }
   *
   * // 반려 시
   * {
   *   previousStatus: "submitted",
   *   newStatus: "rejected",
   *   reason: "면허번호 확인 필요"
   * }
   *
   * // 동기화 시
   * {
   *   syncedFields: ["categoryId", "organizationId"],
   *   changes: {
   *     categoryId: { from: "cat-1", to: "cat-2" }
   *   }
   * }
   * ```
   */
  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  /**
   * 코멘트/메모
   */
  @Column({ type: 'text', nullable: true })
  comment?: string;

  /**
   * IP 주소 (보안 감사용)
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  /**
   * User Agent (보안 감사용)
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * 로그 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;
}

/**
 * 로그 생성 헬퍼 함수
 */
export function createReportLog(
  reportId: string,
  action: ReportLogAction,
  options?: {
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    data?: Record<string, any>;
    comment?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Partial<ReportLog> {
  return {
    reportId,
    action,
    actorId: options?.actorId,
    actorName: options?.actorName,
    actorRole: options?.actorRole,
    data: options?.data,
    comment: options?.comment,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  };
}
