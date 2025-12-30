/**
 * GlucoseView Vendor Entity
 *
 * Phase C-1: GlucoseView API Implementation
 * CGM device manufacturer/vendor metadata (NOT raw CGM data)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { GlucoseViewConnection } from './glucoseview-connection.entity.js';

export type GlucoseViewVendorStatus = 'active' | 'inactive' | 'planned';

@Entity({ name: 'glucoseview_vendors', schema: 'public' })
export class GlucoseViewVendor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Vendor name (e.g., Abbott, Dexcom, Medtronic)
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Unique vendor code for system reference
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  /**
   * Description of the vendor and supported devices
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Vendor logo URL (optional)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url?: string;

  /**
   * Vendor website URL (optional)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  website_url?: string;

  /**
   * Supported device models (JSON array of strings)
   */
  @Column({ type: 'jsonb', default: '[]' })
  supported_devices!: string[];

  /**
   * Integration method: api, manual, file_import
   */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  integration_type!: string;

  /**
   * Vendor status: active (supported), inactive (discontinued), planned (future support)
   */
  @Column({ type: 'varchar', length: 20, default: 'planned' })
  status!: GlucoseViewVendorStatus;

  /**
   * Display order
   */
  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  // Relations
  @OneToMany('GlucoseViewConnection', 'vendor')
  connections?: GlucoseViewConnection[];
}
