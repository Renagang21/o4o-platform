/**
 * StoreCapability Entity
 * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
 *
 * 매장(Store) 단위 기능 활성화/비활성화 제어
 * organization_id + capability_key 복합 유니크
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

import type { OrganizationStore } from './organization-store.entity.js';
import type { StoreCapabilityKey, CapabilitySource } from '../constants/store-capabilities.js';

@Entity('store_capabilities')
@Unique('UQ_store_capability_org_key', ['organization_id', 'capability_key'])
@Index('IDX_store_capability_org_id', ['organization_id'])
export class StoreCapability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50 })
  capability_key: StoreCapabilityKey;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 20, default: 'system' })
  source: CapabilitySource;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md Section 2)
  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationStore;
}
