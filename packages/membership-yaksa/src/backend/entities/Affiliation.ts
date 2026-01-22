import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Member } from './Member.js';

/**
 * Affiliation Entity
 *
 * 회원의 조직 소속 정보 (지부/분회 다중 소속 지원)
 * Member는 여러 조직에 소속될 수 있으며, 각 조직에서 다른 직책을 가질 수 있습니다.
 *
 * @example
 * ```typescript
 * // 김약사는 강남분회의 총무이자 서울지부의 이사
 * {
 *   memberId: "member-kim",
 *   organizationId: "org-seoul-gangnam",
 *   position: "총무",
 *   isPrimary: true
 * }
 * {
 *   memberId: "member-kim",
 *   organizationId: "org-seoul",
 *   position: "이사",
 *   isPrimary: false
 * }
 * ```
 */
@Entity('yaksa_member_affiliations')
@Index(['memberId'])
@Index(['organizationId'])
@Index(['memberId', 'organizationId'], { unique: true })
@Index(['isPrimary'])
export class Affiliation {
  /**
   * 소속 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 회원 관계
   */
  @ManyToOne('Member', (member: Member) => member.affiliations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  /**
   * 조직 ID (FK → organizations.id)
   *
   * organization-core의 Organization과 연동
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 조직 내 직책/역할
   *
   * 예: 회장, 부회장, 총무, 이사, 평회원, 분회장, 감사
   */
  @Column({ type: 'varchar', length: 100 })
  position!: string;

  /**
   * 주 소속 여부
   *
   * 한 회원당 하나의 주 소속만 가능
   * Member.organizationId와 일치해야 함
   */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 소속 시작일
   */
  @Column({ type: 'date' })
  startDate!: string;

  /**
   * 소속 종료일 (null = 현재 활동 중)
   */
  @Column({ type: 'date', nullable: true })
  endDate?: string;

  /**
   * 확장 메타데이터 (JSON)
   *
   * @example
   * ```typescript
   * {
   *   "department": "교육위원회",
   *   "responsibilities": ["신입회원 교육", "보수교육 기획"],
   *   "term": "2024-2025"
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

  // Helper Methods

  /**
   * 현재 활동 중인지 확인
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) return false;
    if (!this.endDate) return true;
    const now = new Date();
    const end = new Date(this.endDate);
    return now <= end;
  }
}
