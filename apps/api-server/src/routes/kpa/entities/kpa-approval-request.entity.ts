/**
 * KPA Approval Request Entity
 *
 * WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1
 * WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1
 *
 * entityType 기반 범용 승인 요청 엔티티.
 *
 * entity_type:
 *   - forum_category           포럼 카테고리 생성 승인
 *   - instructor_qualification 강사 자격 승인
 *   - course                   강좌 기획안 승인
 *   - membership               조직 가입 승인
 *
 * 승인 시 Extension이 Core API를 호출하여 실제 엔티티를 생성한다.
 * Core는 승인 상태를 모른다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ApprovalRequestStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled'
  | 'revoked';

@Entity('kpa_approval_requests')
@Index(['entity_type', 'organization_id', 'status'])
@Index(['requester_id', 'entity_type'])
export class KpaApprovalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entity_type: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ApprovalRequestStatus;

  // ── 신청자 정보 ──

  @Column({ type: 'uuid' })
  requester_id: string;

  @Column({ type: 'varchar', length: 100 })
  requester_name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  requester_email: string | null;

  // ── 심사 정보 ──

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_comment: string | null;

  @Column({ type: 'text', nullable: true })
  revision_note: string | null;

  // ── 결과 연결 ──

  @Column({ type: 'uuid', nullable: true })
  result_entity_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  result_metadata: Record<string, any> | null;

  // ── Audit ──

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
