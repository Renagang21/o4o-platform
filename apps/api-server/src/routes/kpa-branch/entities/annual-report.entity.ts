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
 * 상태는 draft / submitted 2종만 둔다. 검수 상태(revision_requested·approved·rejected)는
 * W4 에서 확장한다 — 쓰지 않을 상태를 미리 만들지 않는다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type AnnualReportStatus = 'draft' | 'submitted';

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
   * DB 가 `status='submitted'` 일 때만 true 를 허용한다
   * (CHK_annual_reports_synced_submitted). draft 는 반영 대상이 아니다.
   */
  @Column({ type: 'boolean', default: false })
  synced_to_membership: boolean;

  /**
   * 반영 기록 — 변경 전/후 값, 건너뛴 항목과 사유, 실행 주체·시각.
   * 반영된 신고서는 반드시 이 값을 갖는다 (CHK_annual_reports_synced_changes).
   */
  @Column({ type: 'jsonb', nullable: true })
  synced_changes: AnnualReportSyncRecord | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
