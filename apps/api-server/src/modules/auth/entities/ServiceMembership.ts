/**
 * @core O4O_PLATFORM_CORE — Membership
 * Core Entity: ServiceMembership
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *
 * ServiceMembership Entity
 * WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1
 *
 * Global User + Service Membership 모델.
 * 한 사용자(users)가 여러 서비스에 독립적으로 가입/승인될 수 있는 구조.
 * kpa_member_services 패턴을 플랫폼 전체로 확장.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import type { User } from './User.js';

export type ServiceMembershipStatus = 'pending' | 'active' | 'suspended' | 'rejected';

@Entity('service_memberships')
@Unique(['userId', 'serviceKey'])
@Index(['serviceKey', 'status'])
export class ServiceMembership {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'service_key' })
  serviceKey!: string; // 'neture' | 'glycopharm' | 'kpa-society' | 'glucoseview' | 'k-cosmetics' | 'platform'

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: ServiceMembershipStatus;

  @Column({ type: 'varchar', length: 50, default: 'customer' })
  role!: string; // 가입 시 역할 ('customer', 'user', 'supplier', 'partner', etc.)

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations — ESM Entity 규칙: import type + 문자열 관계명
  @ManyToOne('User', 'serviceMemberships')
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
