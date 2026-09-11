/**
 * BranchMembership Entity
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §3
 *
 * 회원의 분회 소속 원장. append-only 이력이다.
 *   - 전출 = 기존 행을 status='left' + left_at 로 마감 (삭제/덮어쓰기 금지)
 *   - 전입 = 항상 새 행 INSERT (동일 분회 재전입도 새 행)
 *   - active 행은 회원당 최대 1개 (부분 UNIQUE UQ_branch_memberships_active_user)
 *
 * role 컬럼을 두지 않는다 — 4축 분리(WO §4). 분회 운영자 여부는
 * role_assignments('kpa-branch:operator') 로, 대상 분회는 이 원장의 active 행으로 정해진다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type BranchMembershipStatus = 'active' | 'left';

@Entity('branch_memberships')
export class BranchMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** users.id — Identity 축 */
  @Column({ type: 'uuid' })
  user_id: string;

  /** kpa_organizations.id (type='group' 분회) */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: BranchMembershipStatus;

  @Column({ type: 'timestamptz' })
  joined_at: Date;

  /** status='left' 일 때만 값이 있다 (CHK_branch_memberships_left_at) */
  @Column({ type: 'timestamptz', nullable: true })
  left_at: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  transfer_reason: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /**
   * 분회별 회원 속성 (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1).
   * 면허번호·직역은 여기 두지 않는다 — `kpa_pharmacist_profiles` 가 canonical 이다.
   * `kpa_members` 의 같은 이름 컬럼은 read fallback 전용이다.
   */
  /** 회비구분 — branch_fee_policies.fee_category 와 같은 코드계 (A1_pharmacy_owner …) */
  @Column({ type: 'varchar', length: 50, nullable: true })
  fee_category: string | null;

  /** 근무처명 — 신상신고 employment.workplaceName sync 대상 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  workplace_name: string | null;

  /** 근무처 주소 — 신상신고 employment.workplaceRoadAddress sync 대상 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  workplace_address: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
