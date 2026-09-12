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
export type AutomationJobType = (typeof AUTOMATION_JOB_TYPES)[number];
export type AutomationJobStatus = (typeof AUTOMATION_JOB_STATUSES)[number];
export type AutomationJobCleanupDecision =
  (typeof AUTOMATION_JOB_CLEANUP_DECISIONS)[number];

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

  @Column({ name: 'cleanup_decision', type: 'varchar', length: 20, nullable: true })
  cleanupDecision!: AutomationJobCleanupDecision | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
