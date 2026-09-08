/**
 * AnnualReport Entity — 회원별 연도 신상신고 (제출 레코드)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1
 *
 * 양식(annual_report_templates)과 제출(이 테이블)을 분리한다.
 *
 * 스냅샷 원칙:
 *   제출 시점의 template_id / organization_id / year / values 를 그대로 보존한다.
 *   Template 이 나중에 v2 로 교체되어도 **기존 제출 자료를 소급 변경하지 않는다.**
 *   따라서 template_id 는 "이 신고가 어느 양식으로 작성됐는가"의 증거이며
 *   조회 시 현재 active 양식이 아니라 이 값을 따라간다.
 *
 * 경계 (CLAUDE.md §7 Boundary Policy):
 *   Store Ops 성격 → Primary Boundary = organizationId.
 *   user_id 단독 조회를 금지한다. 모든 조회·수정에 organization_id 를 함께 건다.
 *   UNIQUE(user_id, year) 는 "한 해에 한 번"을 보장할 뿐 경계가 아니다.
 *
 * 상태 (W4 확장 — WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1):
 *   draft → submitted → (revision_requested → submitted)* → approved
 *   역전이는 없고 approved 가 종착이다. `rejected` 는 만들지 않았다 —
 *   분회 신상신고에는 "반려 후 종료"가 없고 전부 보완요청 후 재제출로 수렴하므로
 *   보완요청과 의미가 겹친다(WO §1).
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type AnnualReportStatus = 'draft' | 'submitted' | 'revision_requested' | 'approved';

/** 회원이 값을 고칠 수 있는 상태 — 이 목록이 write 게이트의 단일 기준이다 */
export const MEMBER_EDITABLE_STATUSES: readonly AnnualReportStatus[] = ['draft', 'revision_requested'];

/** 운영자가 검수할 수 있는 상태 */
export const REVIEWABLE_STATUSES: readonly AnnualReportStatus[] = ['submitted'];

/** field.key → 값. 키 목록은 Template 이 정하며 여기서 고정하지 않는다. */
export type AnnualReportValues = Record<string, unknown>;

/** 원장에 실제로 반영한 1건 */
export interface AnnualReportSyncChange {
  /** Template field key */
  key: string;
  /** `table.column` — Template 의 syncTarget */
  target: string;
  before: unknown;
  after: unknown;
}

/** 반영하지 않은 1건과 사유 */
export interface AnnualReportSyncSkip {
  key: string;
  target: string;
  reason: 'UNCHANGED' | 'EMPTY_VALUE' | 'TARGET_NOT_ALLOWED';
}

/**
 * 보완요청으로 재작성을 열 때 보존하는 **검수 대상이던 제출 스냅샷** 1건.
 * 회원이 `values` 를 고쳐도 운영자가 봤던 내용은 여기 남는다 (WO §5).
 */
export interface AnnualReportRevisionRound {
  /** 1부터. 몇 번째 보완요청인가 */
  round: number;
  /** 이 스냅샷이 제출된 시각 */
  submittedAt: string | null;
  /** 보완요청 시점에 보존한 제출 값 전체 */
  values: AnnualReportValues;
  /** 그때 적용된 양식 */
  templateId: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
}

/** `annual_reports.synced_changes` 의 구조 */
export interface AnnualReportSyncRecord {
  syncedAt: string;
  /** 반영을 실행한 운영자 user id (회원 본인이 아니다) */
  syncedBy: string;
  /** 반영 기준이 된 제출 스냅샷의 template_id */
  templateId: string;
  changes: AnnualReportSyncChange[];
  skipped: AnnualReportSyncSkip[];
}

@Entity('annual_reports')
@Index('IDX_annual_reports_org_year', ['organization_id', 'year'])
export class AnnualReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 제출 당시의 양식. active 양식이 바뀌어도 이 값은 고정된다 */
  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  /** 제출 당시의 소속 분회 (kpa_organizations.id). 전출해도 과거 신고는 그 분회에 남는다 */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: AnnualReportStatus;

  /**
   * 회원 입력값 + 서버가 주입한 association 값.
   * 클라이언트가 보낸 association/readonly 키는 저장 전에 제거된다 (ownership 필터).
   */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  values: AnnualReportValues;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date | null;

  /**
   * 회원 원장(`kpa_members`) 반영 여부.
   * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1
   *
   * 재실행 멱등성의 기준이다 — true 인 신고서는 다시 반영하지 않는다.
   * DB 가 `status='approved'` 일 때만 true 를 허용한다
   * (CHK_annual_reports_synced_approved — W4 에서 submitted → approved 로 좁혔다).
   * 검수하지 않은 신고서로 회원 원장이 바뀌지 않는다.
   */
  @Column({ type: 'boolean', default: false })
  synced_to_membership: boolean;

  /**
   * 반영 기록 — 변경 전/후 값, 건너뛴 항목과 사유, 실행 주체·시각.
   * 반영된 신고서는 반드시 이 값을 갖는다 (CHK_annual_reports_synced_changes).
   */
  @Column({ type: 'jsonb', nullable: true })
  synced_changes: AnnualReportSyncRecord | null;

  // ── 검수 (WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1) ─────────────────────

  /** 최근 보완요청 사유. 회원 화면에 그대로 보인다 */
  @Column({ type: 'text', nullable: true })
  revision_reason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  revision_requested_at: Date | null;

  /** 보완을 요청한 운영자 */
  @Column({ type: 'uuid', nullable: true })
  revision_requested_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  /** 승인한 운영자. 승인은 원장을 바꾸지 않는다 — 반영은 별도 sync 행위다 */
  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  /**
   * 보완요청으로 폐기되지 않고 보존된 과거 제출 스냅샷들.
   * append 만 한다 — 기존 항목을 고치거나 지우지 않는다.
   */
  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  revision_history: AnnualReportRevisionRound[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
