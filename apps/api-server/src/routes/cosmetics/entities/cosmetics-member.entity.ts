/**
 * CosmeticsMember Entity
 *
 * WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
 *   K-Cosmetics 회원 프로필 분류 (sub_role) — 매장 경영자 / 매장 근무자.
 *
 * 핵심 원칙 (IR-O4O-SERVICE-MEMBER-PROFILE-CLASSIFICATION-V1):
 *   - sub_role 은 권한(role)이 아니라 profile classification.
 *   - cosmetics:store_owner role 과 본 sub_role 은 서로 다른 layer.
 *   - role 은 권한 (무엇을 할 수 있는가), sub_role 은 "어떤 사람인가".
 *
 * 패턴: GlycopharmMember entity (apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts) mirror.
 *
 * 매장 내 직급 (CosmeticsStoreMember.role: owner / manager / staff) 과는 별개 layer:
 *   - CosmeticsStoreMember = 특정 매장 내에서의 역할 (N:M 관계)
 *   - CosmeticsMember.sub_role = 사용자 자신의 프로필 분류 (어떤 사람인가)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from '../../../modules/auth/entities/User.js';

export type CosmeticsMembershipType = 'cosmetics_member';
export type CosmeticsMemberSubRole = 'store_owner' | 'store_staff';
export type CosmeticsMemberStatus = 'active' | 'suspended' | 'withdrawn';

@Entity('cosmetics_members')
export class CosmeticsMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'membership_type', type: 'varchar', length: 50, default: 'cosmetics_member' })
  membershipType!: CosmeticsMembershipType;

  @Column({ name: 'sub_role', type: 'varchar', length: 50, nullable: true })
  subRole?: CosmeticsMemberSubRole | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: CosmeticsMemberStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}
