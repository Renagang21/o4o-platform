/**
 * GlucoseView View Profile Entity
 *
 * Phase C-1: GlucoseView API Implementation
 * Display/summary configuration for CGM data visualization (NOT raw data storage)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ViewProfileStatus = 'active' | 'inactive' | 'draft';
export type SummaryLevel = 'simple' | 'standard' | 'detailed';
export type ChartType = 'daily' | 'weekly' | 'trend' | 'agp';

@Entity({ name: 'glucoseview_view_profiles', schema: 'public' })
export class GlucoseViewViewProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Profile name (e.g., "Basic Daily View", "Pharmacist Standard")
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Unique profile code for system reference
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  /**
   * Description of the view profile
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Summary detail level: simple, standard, detailed
   */
  @Column({ type: 'varchar', length: 20, default: 'standard' })
  summary_level!: SummaryLevel;

  /**
   * Chart visualization type: daily, weekly, trend, agp (Ambulatory Glucose Profile)
   */
  @Column({ type: 'varchar', length: 20, default: 'daily' })
  chart_type!: ChartType;

  /**
   * Time range in days for data display (e.g., 7, 14, 30, 90)
   */
  @Column({ type: 'int', default: 14 })
  time_range_days!: number;

  /**
   * Show time-in-range metrics (TIR)
   */
  @Column({ type: 'boolean', default: true })
  show_tir!: boolean;

  /**
   * Show average glucose value
   */
  @Column({ type: 'boolean', default: true })
  show_average!: boolean;

  /**
   * Show glucose variability metrics (CV, SD)
   */
  @Column({ type: 'boolean', default: false })
  show_variability!: boolean;

  /**
   * Target glucose range - lower bound (mg/dL)
   */
  @Column({ type: 'int', default: 70 })
  target_low!: number;

  /**
   * Target glucose range - upper bound (mg/dL)
   */
  @Column({ type: 'int', default: 180 })
  target_high!: number;

  /**
   * Profile status
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: ViewProfileStatus;

  /**
   * Is this the default profile?
   */
  @Column({ type: 'boolean', default: false })
  is_default!: boolean;

  /**
   * Display order
   */
  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
