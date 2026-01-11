/**
 * GlucoseView Connection Entity
 *
 * Phase C-1: GlucoseView API Implementation
 * Pharmacy-Vendor connection status metadata (NOT patient data or CGM readings)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GlucoseViewVendor } from './glucoseview-vendor.entity.js';

export type ConnectionStatus = 'pending' | 'active' | 'suspended' | 'disconnected';

@Entity({ name: 'glucoseview_connections', schema: 'public' })
export class GlucoseViewConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to Glycopharm pharmacy (soft FK, no actual constraint)
   */
  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string;

  /**
   * Pharmacy name (denormalized for display)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  pharmacy_name?: string;

  /**
   * CGM vendor reference
   */
  @Column({ type: 'uuid' })
  vendor_id!: string;

  @ManyToOne(() => GlucoseViewVendor, (vendor) => vendor.connections)
  @JoinColumn({ name: 'vendor_id' })
  vendor?: GlucoseViewVendor;

  /**
   * Connection status
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ConnectionStatus;

  /**
   * Date when connection was established
   */
  @Column({ type: 'timestamp', nullable: true })
  connected_at?: Date;

  /**
   * Date when connection was last verified
   */
  @Column({ type: 'timestamp', nullable: true })
  last_verified_at?: Date;

  /**
   * Internal notes about the connection
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Connection configuration (JSON, vendor-specific settings)
   * NOTE: This does NOT store credentials or sensitive data
   */
  @Column({ type: 'jsonb', default: '{}' })
  config!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
