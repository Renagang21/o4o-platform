/**
 * AutomationJob Entity — WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1
 *
 * 동영상 제작 등 장기 자동화 작업의 "임시 작업 슬롯". O4O 는 상태·지시·asset 연결만 관리하고
 * 실제 생성/편집/렌더링은 외부(Codex / Computer Use / 전문 AI 서비스)가 담당한다.
 * asset 연결은 media_entity_links(entity_type='video-production-job') 재사용 — 별도 테이블 없음.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const AUTOMATION_JOB_TYPES = ['VIDEO'] as const;
export const AUTOMATION_JOB_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'WAITING',
  'COMPLETED',
  'CANCELLED',
] as const;
export const AUTOMATION_JOB_CLEANUP_DECISIONS = [
  'KEEP_ALL',
  'KEEP_OUTPUTS',
  'KEEP_SELECTED',
  'DECIDE_LATER',
] as const;
/**
 * 완성본 임시 output 정리 상태 (WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1).
 * AVAILABLE=보관 중 · EXPIRED=만료돼 object 삭제 완료 · DELETE_FAILED=만료됐지만 storage 삭제 실패(재시도 대상).
 * null 이면 등록된 완성본이 없다.
 */
export const AUTOMATION_JOB_TEMP_OUTPUT_STATUSES = ['AVAILABLE', 'EXPIRED', 'DELETE_FAILED'] as const;
export type AutomationJobType = (typeof AUTOMATION_JOB_TYPES)[number];
export type AutomationJobStatus = (typeof AUTOMATION_JOB_STATUSES)[number];
export type AutomationJobCleanupDecision =
  (typeof AUTOMATION_JOB_CLEANUP_DECISIONS)[number];
export type AutomationJobTempOutputStatus = (typeof AUTOMATION_JOB_TEMP_OUTPUT_STATUSES)[number];

@Entity({ name: 'automation_jobs' })
@Index('automation_jobs_type_status_idx', ['type', 'status', 'updatedAt'])
export class AutomationJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: AutomationJobType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status!: AutomationJobStatus;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  /** 세부 제작 단계("내레이션 검수" 등)는 enum 이 아니라 여기 자유 텍스트로 둔다. */
  @Column({ name: 'status_note', type: 'varchar', length: 500, nullable: true })
  statusNote!: string | null;

  /** Media Library 제작 자료(INTERMEDIATE) 정리 방침. 완성본 보관 정책이 아니다 — 완성본은 항상 임시 TTL 을 따른다. */
  @Column({ name: 'cleanup_decision', type: 'varchar', length: 20, nullable: true })
  cleanupDecision!: AutomationJobCleanupDecision | null;

  // ── 완성본 임시 output (비공개 bucket object 참조만. URL·로컬 경로 저장 금지) ──
  @Column({ name: 'temp_output_object_key', type: 'varchar', length: 500, nullable: true })
  tempOutputObjectKey!: string | null;

  @Column({ name: 'temp_output_file_name', type: 'varchar', length: 255, nullable: true })
  tempOutputFileName!: string | null;

  @Column({ name: 'temp_output_mime_type', type: 'varchar', length: 100, nullable: true })
  tempOutputMimeType!: string | null;

  @Column({ name: 'temp_output_size', type: 'bigint', nullable: true })
  tempOutputSize!: string | null;

  @Column({ name: 'temp_output_uploaded_at', type: 'timestamptz', nullable: true })
  tempOutputUploadedAt!: Date | null;

  @Column({ name: 'temp_output_expires_at', type: 'timestamptz', nullable: true })
  tempOutputExpiresAt!: Date | null;

  @Column({ name: 'temp_output_cleanup_status', type: 'varchar', length: 20, nullable: true })
  tempOutputCleanupStatus!: AutomationJobTempOutputStatus | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
