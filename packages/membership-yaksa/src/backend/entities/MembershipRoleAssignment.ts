import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * MembershipRoleAssignment Entity
 *
 * Membership 앱 전용 역할 할당
 * 기존 RoleAssignment와 분리하여 Membership 도메인 권한 관리
 *
 * @example
 * ```typescript
 * // 강남분회 회원 관리자
 * {
 *   memberId: "member-kim",
 *   role: "membership_admin",
 *   scopeType: "organization",
 *   scopeId: "org-seoul-gangnam"
 * }
 * ```
 */
@Entity('yaksa_membership_roles')
@Index(['memberId'])
@Index(['role'])
@Index(['scopeType', 'scopeId'])
@Index(['memberId', 'role', 'scopeType', 'scopeId'], { unique: true })
export class MembershipRoleAssignment {
  /**
   * 역할 할당 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 역할
   *
   * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
   * - membership_super_admin: 전체 운영자 (Global Operator)
   * - membership_district_admin: 지부 관리자
   * - membership_branch_admin: 분회 관리자
   * - membership_verifier: 자격 검증 담당
   * - membership_member: 일반 회원
   *
   * Note: membership_officer는 REMOVED됨 (임원은 직책이며 권한이 아님)
   */
  @Column({ type: 'varchar', length: 100 })
  role!: string;

  /**
   * 권한 스코프 타입
   *
   * - global: 전역 권한 (모든 조직)
   * - organization: 조직 권한 (특정 지부/분회)
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'organization',
  })
  scopeType!: 'global' | 'organization';

  /**
   * 스코프 ID
   *
   * scopeType='organization'인 경우 조직 ID
   * scopeType='global'인 경우 null
   */
  @Column({ type: 'uuid', nullable: true })
  scopeId?: string;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 유효 시작일
   */
  @Column({ type: 'timestamp', default: () => 'NOW()' })
  validFrom!: Date;

  /**
   * 유효 종료일 (null = 무기한)
   */
  @Column({ type: 'timestamp', nullable: true })
  validUntil?: Date;

  /**
   * 할당자 (관리자) ID
   */
  @Column({ type: 'uuid', nullable: true })
  assignedBy?: string;

  /**
   * 생성일시
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * 현재 시점에 유효한 역할인지 확인
   */
  isValidNow(): boolean {
    if (!this.isActive) return false;

    const now = new Date();

    if (this.validFrom > now) return false;

    if (this.validUntil && this.validUntil < now) return false;

    return true;
  }
}
