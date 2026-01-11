/**
 * Glycopharm Pharmacy Entity
 *
 * ============================================================================
 * ⚠️ ACTIVE TABLE - GlycoPharm Domain (Phase 9-A Reviewed)
 * ============================================================================
 *
 * This table remains ACTIVE for pharmacy/store management.
 * Unlike glycopharm_orders, this is NOT deprecated.
 *
 * The pharmacy entity is used for:
 * - Store registration and management
 * - Product catalog organization
 * - GlucoseView integration
 *
 * Orders for pharmacies now go through E-commerce Core with:
 * - OrderType.GLYCOPHARM
 * - metadata.pharmacyId reference
 *
 * @see CLAUDE.md §7 for E-commerce Core rules
 * ============================================================================
 *
 * Original: Phase B-1 Glycopharm API Implementation
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { GlycopharmProduct } from './glycopharm-product.entity.js';
import type { GlycopharmServiceType } from './glycopharm-application.entity.js';

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  business_number?: string;

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

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @OneToMany('GlycopharmProduct', 'pharmacy')
  products?: GlycopharmProduct[];
}
