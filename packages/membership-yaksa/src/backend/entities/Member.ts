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
import { MemberCategory } from './MemberCategory.js';
import { Affiliation } from './Affiliation.js';
import { MembershipYear } from './MembershipYear.js';
import { Verification } from './Verification.js';

/**
 * Member Entity
 *
 * 약사회 회원 정보를 관리하는 핵심 엔티티
 * User와 Organization을 연결하며 약사 자격 정보를 포함
 *
 * @example
 * ```typescript
 * {
 *   userId: "user-123",
 *   organizationId: "org-seoul-gangnam",
 *   licenseNumber: "12345-67890",
 *   name: "김약사",
 *   birthdate: "1985-03-15",
 *   isVerified: true
 * }
 * ```
 */
@Entity('yaksa_members')
@Index(['userId'], { unique: true })
@Index(['organizationId'])
@Index(['licenseNumber'], { unique: true })
@Index(['isVerified'])
export class Member {
  /**
   * 회원 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * User ID (FK → users.id)
   *
   * User 엔티티와 1:1 연결
   */
  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  /**
   * 주 소속 조직 ID (FK → organizations.id)
   *
   * organization-core의 Organization과 연동
   * 회원의 기본 지부/분회
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 약사 면허번호
   *
   * 형식: XXXXX-XXXXX (한국 약사 면허)
   * 자격 검증의 핵심 식별자
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  licenseNumber!: string;

  /**
   * 회원 이름
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * 생년월일 (YYYY-MM-DD)
   */
  @Column({ type: 'date' })
  birthdate!: string;

  /**
   * 자격 검증 완료 여부
   *
   * Verification 엔티티를 통해 검증된 경우 true
   */
  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  /**
   * 회원 분류 ID (FK → yaksa_member_categories.id)
   */
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  /**
   * 회원 분류 (정회원, 준회원, 휴업약사 등)
   */
  @ManyToOne(() => MemberCategory, { nullable: true, eager: true })
  @JoinColumn({ name: 'categoryId' })
  category?: MemberCategory;

  /**
   * 연락처
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  /**
   * 이메일 (User와 별개로 저장 가능)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /**
   * 약국명
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  pharmacyName?: string;

  /**
   * 약국 주소
   */
  @Column({ type: 'text', nullable: true })
  pharmacyAddress?: string;

  /**
   * 활성 상태
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 확장 메타데이터 (JSON)
   *
   * @example
   * ```typescript
   * {
   *   "specialization": "임상약학",
   *   "yearsOfExperience": 15,
   *   "certifications": ["노인약료전문", "당뇨병약료전문"]
   * }
   * ```
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

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

  // Relations

  /**
   * 소속 정보 (여러 지부/분회에 소속 가능)
   */
  @OneToMany(() => Affiliation, (affiliation) => affiliation.member)
  affiliations?: Affiliation[];

  /**
   * 연회비 납부 이력
   */
  @OneToMany(() => MembershipYear, (year) => year.member)
  membershipYears?: MembershipYear[];

  /**
   * 자격 검증 이력
   */
  @OneToMany(() => Verification, (verification) => verification.member)
  verifications?: Verification[];

  // Helper Methods

  /**
   * 현재 연도 회비 납부 여부 확인
   */
  isPaidForYear(year: number): boolean {
    if (!this.membershipYears) return false;
    return this.membershipYears.some((my) => my.year === year && my.paid);
  }

  /**
   * 최근 검증 상태 확인
   */
  getLatestVerification(): Verification | null {
    if (!this.verifications || this.verifications.length === 0) return null;
    return this.verifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }
}
