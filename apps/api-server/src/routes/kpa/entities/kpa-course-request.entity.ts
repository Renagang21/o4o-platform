/**
 * @deprecated WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1
 * 이 엔티티는 더 이상 신규 데이터 기록에 사용되지 않습니다.
 * 신규 요청은 KpaApprovalRequest (entity_type='course')로 기록됩니다.
 * 기존 데이터 읽기 전용으로 유지. 후속 cleanup WO에서 삭제 예정.
 *
 * KPA Course Request Entity (LEGACY)
 *
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
 *
 * 강사가 강좌를 생성하기 전 분회 admin의 사전 승인 요청 테이블.
 * LMS Core Course 엔티티와 독립 — 승인 후 Core API로 Course 생성.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CourseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled';

@Entity('kpa_course_requests')
@Index(['instructor_id', 'organization_id'])
@Index(['organization_id', 'status'])
@Index(['qualification_id'])
export class KpaCourseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  instructor_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  qualification_id: string;

  // ── 강좌 기획안 ──

  @Column({ type: 'varchar', length: 255 })
  proposed_title: string;

  @Column({ type: 'text' })
  proposed_description: string;

  @Column({ type: 'varchar', length: 20, default: 'beginner' })
  proposed_level: string;

  @Column({ type: 'int' })
  proposed_duration: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  proposed_credits: number;

  @Column({ type: 'simple-array', nullable: true })
  proposed_tags: string[] | null;

  @Column({ type: 'jsonb', default: '{}' })
  proposed_metadata: Record<string, any>;

  // ── 상태 머신 ──

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: CourseRequestStatus;

  // ── 심사 정보 ──

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_comment: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  revision_note: string | null;

  // ── 연결 ──

  @Column({ type: 'uuid', nullable: true })
  created_course_id: string | null;

  // ── Audit ──

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
