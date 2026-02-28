/**
 * @deprecated WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1
 * 이 엔티티는 더 이상 신규 데이터 기록에 사용되지 않습니다.
 * 신규 요청은 KpaApprovalRequest (entity_type='instructor_qualification')로 기록됩니다.
 * 기존 데이터 읽기 전용으로 유지. 후속 cleanup WO에서 삭제 예정.
 *
 * KPA Instructor Qualification Entity (LEGACY)
 *
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
 *
 * KPA 조직 내 강사 자격 신청 및 승인 추적.
 * 기존 lms_instructor_applications와 별도 — KPA 조직 컨텍스트 + branch admin 승인.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type InstructorQualificationType = 'pharmacist_instructor' | 'student_instructor';
export type InstructorQualificationStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

@Entity('kpa_instructor_qualifications')
@Index(['organization_id', 'status'])
@Index(['member_id'])
export class KpaInstructorQualification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  member_id: string;

  // ── 신청 정보 ──

  @Column({ type: 'varchar', length: 30 })
  qualification_type: InstructorQualificationType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  license_number: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialty_area: string | null;

  @Column({ type: 'int', default: 0 })
  teaching_experience_years: number;

  @Column({ type: 'jsonb', default: '[]' })
  supporting_documents: Array<{ name: string; url: string; type: string; uploadedAt?: string }>;

  @Column({ type: 'text', nullable: true })
  applicant_note: string | null;

  // ── 상태 머신 ──

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: InstructorQualificationStatus;

  // ── 심사 정보 ──

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_comment: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // ── 해지 정보 ──

  @Column({ type: 'uuid', nullable: true })
  revoked_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'text', nullable: true })
  revoke_reason: string | null;

  // ── Audit ──

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
