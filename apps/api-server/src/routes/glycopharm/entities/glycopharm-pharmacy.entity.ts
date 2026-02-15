/**
 * Glycopharm Pharmacy Entity
 *
 * Phase B-1: Glycopharm API Implementation
 * Pharmacy/Store management for blood glucose product sales
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { GlycopharmProduct } from './glycopharm-product.entity.js';
import type { GlycopharmServiceType } from './glycopharm-application.entity.js';
import type { KpaOrganization } from '../../kpa/entities/kpa-organization.entity.js';

export type GlycopharmPharmacyStatus = 'active' | 'inactive' | 'suspended';

@Entity({ name: 'glycopharm_pharmacies', schema: 'public' })
export class GlycopharmPharmacy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  owner_name?: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  business_number!: string;

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  @Index()
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  logo?: string;

  @Column({ name: 'hero_image', type: 'varchar', length: 2000, nullable: true })
  hero_image?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: GlycopharmPharmacyStatus;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by_user_name?: string;

  @Column({ name: 'enabled_services', type: 'jsonb', default: '[]' })
  enabled_services!: GlycopharmServiceType[];

  @Column({ name: 'storefront_config', type: 'jsonb', nullable: true })
  storefront_config?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  /**
   * PK 공유 관계: pharmacy.id ≡ kpa_organization.id
   * WO-PHARMACY-TREE-PHYSICAL-INTEGRITY-FIX-V1 Phase 2
   */
  @OneToOne('KpaOrganization')
  @JoinColumn({ name: 'id' })
  organization?: KpaOrganization;

  @OneToMany('GlycopharmProduct', 'pharmacy')
  products?: GlycopharmProduct[];
}
