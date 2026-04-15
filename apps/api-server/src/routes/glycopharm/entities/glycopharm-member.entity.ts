/**
 * GlycopharmMember Entity
 *
 * WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
 * GlycoPharm 약사 회원 전용 테이블 — 약국 경영자/근무약사 구분
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
import type { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';

export type GlycopharmMembershipType = 'pharmacist';
export type GlycopharmMemberSubRole = 'pharmacy_owner' | 'staff_pharmacist';
export type GlycopharmMemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';

@Entity('glycopharm_members')
export class GlycopharmMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'membership_type', type: 'varchar', length: 50, default: 'pharmacist' })
  membershipType!: GlycopharmMembershipType;

  @Column({ name: 'sub_role', type: 'varchar', length: 50, nullable: true })
  subRole?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @ManyToOne('OrganizationStore', { eager: false })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationStore;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: GlycopharmMemberStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_at', type: 'timestamp with time zone', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;
}
