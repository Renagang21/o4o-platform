import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { YaksaReport } from './YaksaReport.js';
import type { YaksaReportStatus } from './YaksaReport.js';

/**
 * 히스토리 액션 유형
 */
export type YaksaReportAction =
  | 'CREATED'              // 자동 생성
  | 'EDITED'               // 수정됨
  | 'REVIEWED'             // 검토 완료
  | 'APPROVED'             // 승인
  | 'REJECTED'             // 반려
  | 'SUBMITTED'            // 제출 완료
  | 'SUBMISSION_FAILED'    // 제출 실패
  | 'SUBMISSION_RETRY_FAILED'; // 제출 재시도 실패

/**
 * YaksaReportHistory Entity
 *
 * YaksaReport 상태 변경 이력
 *
 * @example
 * ```typescript
 * {
 *   reportId: "report-123",
 *   action: "APPROVED",
 *   previousStatus: "REVIEWED",
 *   newStatus: "APPROVED",
 *   actorId: "admin-456",
 *   actorName: "홍길동",
 *   details: {
 *     note: "확인 완료"
 *   }
 * }
 * ```
 */
@Entity('yaksa_rpa_report_history')
@Index(['reportId', 'createdAt'])
@Index(['actorId'])
@Index(['action'])
export class YaksaReportHistory {
  /**
   * 이력 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 신고서 ID (FK → yaksa_rpa_reports.id)
   */
  @Column({ type: 'uuid' })
  reportId!: string;

  /**
   * 액션 유형
   */
  @Column({
    type: 'varchar',
    length: 30,
  })
  action!: YaksaReportAction;

  /**
   * 이전 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  previousStatus?: YaksaReportStatus;

  /**
   * 새 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  newStatus?: YaksaReportStatus;

  /**
   * 수행자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  /**
   * 수행자 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  actorName?: string;

  /**
   * 수행자 역할
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole?: string;

  /**
   * 상세 정보 (JSON)
   *
   * 변경 내용, 사유 등 추가 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  /**
   * 이전 페이로드 (변경 전 신고서 내용)
   */
  @Column({ type: 'jsonb', nullable: true })
  previousPayload?: Record<string, any>;

  /**
   * 새 페이로드 (변경 후 신고서 내용)
   */
  @Column({ type: 'jsonb', nullable: true })
  newPayload?: Record<string, any>;

  /**
   * IP 주소
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  // Relations

  /**
   * 신고서
   */
  @ManyToOne('YaksaReport', 'history')
  @JoinColumn({ name: 'reportId' })
  report?: YaksaReport;
}
