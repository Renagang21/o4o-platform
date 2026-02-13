/**
 * GlucoseView Pharmacy Entity
 *
 * Phase C-4: GlucoseView Application Workflow
 * Stores pharmacy-level service activation for GlucoseView
 * Created when application is approved
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { GlucoseViewServiceType } from './glucoseview-application.entity.js';

export type GlucoseViewPharmacyStatus = 'active' | 'inactive' | 'suspended';

@Entity({ name: 'glucoseview_pharmacies', schema: 'public' })
export class GlucoseViewPharmacy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 연결된 glycopharm pharmacy ID (optional)
   */
  @Column({ name: 'glycopharm_pharmacy_id', type: 'uuid', nullable: true })
  glycopharmPharmacyId?: string;

  /**
   * 소유자 user ID
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /**
   * 약국명
   */
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  /**
   * 사업자번호
   */
  @Column({ name: 'business_number', type: 'varchar', length: 20, unique: true })
  @Index()
  businessNumber!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  @Index()
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  logo?: string;

  @Column({ name: 'hero_image', type: 'varchar', length: 2000, nullable: true })
  heroImage?: string;

  /**
   * 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: GlucoseViewPharmacyStatus;

  /**
   * 활성화된 서비스 목록 (cgm_view)
   */
  @Column({ name: 'enabled_services', type: 'jsonb', default: '[]' })
  enabledServices!: GlucoseViewServiceType[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
