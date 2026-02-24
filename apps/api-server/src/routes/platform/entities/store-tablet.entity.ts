/**
 * StoreTablet Entity
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 *
 * 매장에 등록된 태블릿 디바이스.
 * organization_id로 멀티테넌트 격리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { StoreTabletDisplay } from './store-tablet-display.entity.js';

@Entity({ name: 'store_tablets' })
export class StoreTablet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_tablets_org')
  organizationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany('StoreTabletDisplay', 'tablet')
  displays?: StoreTabletDisplay[];
}
