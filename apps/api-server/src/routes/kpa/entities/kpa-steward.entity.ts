/**
 * KPA Steward Entity
 * 조직/공간 단위 운영 책임 배정
 *
 * WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1
 *
 * Steward는 RBAC role이 아님 - 서비스 내부 배정(assignment)
 * 배정 단위: organization, forum, education, content
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Steward 배정 범위 유형
 * - organization: 조직 전체 운영
 * - forum: 포럼 공간 운영
 * - education: 교육 과정 운영
 * - content: 콘텐츠 공간 운영
 */
export type StewardScopeType = 'organization' | 'forum' | 'education' | 'content';

@Entity('kpa_stewards')
@Index(['organization_id', 'scope_type', 'is_active'])
@Index(['member_id', 'is_active'])
export class KpaSteward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 대상 조직 ID (kpa_organizations)
   */
  @Column({ type: 'uuid' })
  organization_id: string;

  /**
   * 배정된 회원 ID (kpa_members)
   */
  @Column({ type: 'uuid' })
  member_id: string;

  /**
   * 배정 범위 유형
   */
  @Column({ type: 'varchar', length: 50 })
  scope_type: StewardScopeType;

  /**
   * 배정 범위 ID (scope_type에 따라 다름)
   * - organization: organization_id와 동일
   * - forum: category_id 또는 null (전체)
   * - education: course_id 또는 null (전체)
   * - content: content_group_id 또는 null (전체)
   */
  @Column({ type: 'uuid', nullable: true })
  scope_id: string | null;

  /**
   * 활성 상태
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * 배정 메모 (운영자 기록용)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  /**
   * 배정자 ID (auth-core User)
   */
  @Column({ type: 'uuid' })
  assigned_by: string;

  /**
   * 해제자 ID (auth-core User)
   */
  @Column({ type: 'uuid', nullable: true })
  revoked_by: string | null;

  /**
   * 해제 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md ESM rules)
  // Type annotations use 'any' to avoid tsup/SWC decorator type issues
  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization: any;

  @ManyToOne('KpaMember')
  @JoinColumn({ name: 'member_id' })
  member: any;
}
