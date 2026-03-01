/**
 * StoreProductProfile Entity
 *
 * 매장별 상품 프로필 — 매장이 ProductMaster를 자체 표시명/설명으로 관리
 * (organization_id, master_id) UNIQUE
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
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
import type { ProductMaster } from './ProductMaster.entity.js';

@Entity('store_product_profiles')
@Unique(['organizationId', 'masterId'])
@Index(['organizationId'])
@Index(['masterId'])
export class StoreProductProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  @ManyToOne('ProductMaster', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  /** 매장 표시명 */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /** 매장 설명 */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
