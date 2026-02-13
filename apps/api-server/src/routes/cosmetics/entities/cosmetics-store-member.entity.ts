/**
 * CosmeticsStoreMember Entity
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * WO-K-COSMETICS-OPERATOR-SOFT-DEACTIVATE-V1: Soft delete 전환
 * Schema: cosmetics (isolated from Core)
 *
 * N:M junction table:
 * - One user can own/manage multiple stores
 * - One store can have multiple members (owner/manager/staff)
 * - Hard delete 금지 — isActive=false 로 비활성화
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
  Unique,
} from 'typeorm';
import type { CosmeticsStore } from './cosmetics-store.entity.js';

export enum CosmeticsStoreMemberRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
}

@Entity({ name: 'cosmetics_store_members', schema: 'cosmetics' })
@Unique(['storeId', 'userId'])
export class CosmeticsStoreMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: CosmeticsStoreMemberRole.STAFF,
  })
  role!: CosmeticsStoreMemberRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt!: Date | null;

  @Column({ name: 'deactivated_by', type: 'uuid', nullable: true })
  deactivatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('CosmeticsStore', 'members')
  @JoinColumn({ name: 'store_id' })
  store?: CosmeticsStore;
}
