import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { MemberCategory } from './MemberCategory.js';
import type { Affiliation } from './Affiliation.js';
import type { MembershipYear } from './MembershipYear.js';
import type { Verification } from './Verification.js';

/**
 * PharmacistType
 * 약사 유형 (근무/개설/병원/공직/산업)
 */
export type PharmacistType = 'working' | 'owner' | 'hospital' | 'public' | 'industry' | 'retired' | 'other';

/**
 * WorkplaceType
 * 근무지 유형
 */
export type WorkplaceType = 'pharmacy' | 'hospital' | 'public' | 'company' | 'education' | 'research' | 'other';

/**
 * OfficialRole
 * 약사회 공식 직책
 */
export type OfficialRole = 'president' | 'vice_president' | 'general_manager' | 'auditor' | 'director' | 'branch_head' | 'district_head' | 'none';

/**
 * Gender
 * 성별
 */
export type Gender = 'male' | 'female' | 'other';

/**
 * Member Entity
 *
 * 약사회 회원 정보를 관리하는 핵심 엔티티
 * User와 Organization을 연결하며 약사 자격 정보를 포함
 *
 * Phase 1 확장:
 * - 면허 발급/갱신 정보
 * - 약사 유형 (pharmacistType)
 * - 근무지 정보
 * - 공식 직책
 * - 회원등록번호
 */
@Entity('yaksa_members')
@Index(['userId'], { unique: true })
@Index(['organizationId'])
@Index(['licenseNumber'], { unique: true })
@Index(['isVerified'])
@Index(['pharmacistType'])
@Index(['workplaceType'])
@Index(['officialRole'])
@Index(['registrationNumber'], { unique: true })
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  licenseNumber!: string;

  /**
   * @deprecated Phase P0 Task D: Use User.name via userId JOIN instead
   * This field will be removed after migration is complete.
   * Query with: LEFT JOIN users u ON u.id = member.userId
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'date' })
  birthdate!: string;

  // Phase 1: 성별
  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: Gender;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne('MemberCategory', { nullable: true, eager: true })
  @JoinColumn({ name: 'categoryId' })
  category?: MemberCategory;

  /**
   * @deprecated Phase P0 Task D: Use User.phone via userId JOIN instead
   * This field will be removed after migration is complete.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  /**
   * @deprecated Phase P0 Task D: Use User.email via userId JOIN instead
   * This field will be removed after migration is complete.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  // Phase 1: 면허 정보 확장
  @Column({ type: 'date', nullable: true })
  licenseIssuedAt?: string;

  @Column({ type: 'date', nullable: true })
  licenseRenewalAt?: string;

  // Phase 1: 약사 유형
  @Column({ type: 'varchar', length: 50, nullable: true })
  pharmacistType?: PharmacistType;

  // 기존 필드
  @Column({ type: 'varchar', length: 200, nullable: true })
  pharmacyName?: string;

  @Column({ type: 'text', nullable: true })
  pharmacyAddress?: string;

  // Phase 1: 근무지 정보 확장
  @Column({ type: 'varchar', length: 200, nullable: true })
  workplaceName?: string;

  @Column({ type: 'text', nullable: true })
  workplaceAddress?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  workplaceType?: WorkplaceType;

  // Phase 1: 약사회 정보
  @Column({ type: 'date', nullable: true })
  yaksaJoinDate?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'none' })
  officialRole?: OfficialRole;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  registrationNumber?: string;

  @Column({ type: 'text', nullable: true })
  memo?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany('Affiliation', (affiliation: Affiliation) => affiliation.member)
  affiliations?: Affiliation[];

  @OneToMany('MembershipYear', (year: MembershipYear) => year.member)
  membershipYears?: MembershipYear[];

  @OneToMany('Verification', (verification: Verification) => verification.member)
  verifications?: Verification[];

  // Helper Methods
  isPaidForYear(year: number): boolean {
    if (!this.membershipYears) return false;
    return this.membershipYears.some((my) => my.year === year && my.paid);
  }

  getLatestVerification(): Verification | null {
    if (!this.verifications || this.verifications.length === 0) return null;
    return this.verifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }

  /**
   * 임원 여부 확인 (표시용)
   *
   * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
   * - 이 함수는 "표시/상태 확인"용이며 권한 판정용이 아님
   * - 임원이라고 해서 시스템 권한이 있는 것이 아님
   * - 권한은 MembershipRoleAssignment를 통해 별도로 부여됨
   */
  isExecutive(): boolean {
    const executiveRoles: OfficialRole[] = [
      'president', 'vice_president', 'general_manager', 'auditor',
      'director', 'branch_head', 'district_head',
    ];
    return this.officialRole ? executiveRoles.includes(this.officialRole) : false;
  }

  /**
   * 관리자급 직책 여부 확인 (표시용)
   *
   * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1:
   * - 이 함수는 "표시/상태 확인"용이며 권한 판정용이 아님
   * - 관리자 직책이라고 해서 자동으로 admin 권한이 부여되지 않음
   * - 권한은 관리자가 수동으로 MembershipRoleAssignment를 할당해야 함
   */
  isAdminPosition(): boolean {
    const adminPositions: OfficialRole[] = [
      'president', 'vice_president', 'branch_head', 'district_head',
    ];
    return this.officialRole ? adminPositions.includes(this.officialRole) : false;
  }

  /**
   * 직책 표시 라벨 반환
   */
  getOfficialRoleLabel(): string {
    const labels: Record<OfficialRole, string> = {
      president: '회장',
      vice_president: '부회장',
      general_manager: '총무',
      auditor: '감사',
      director: '이사',
      branch_head: '분회장',
      district_head: '지부장',
      none: '일반회원',
    };
    return this.officialRole ? labels[this.officialRole] : '일반회원';
  }

  // Phase 1: 현재 근무지 정보 반환
  getCurrentWorkplace(): { name?: string; address?: string; type?: WorkplaceType } {
    return {
      name: this.workplaceName || this.pharmacyName,
      address: this.workplaceAddress || this.pharmacyAddress,
      type: this.workplaceType,
    };
  }
}
