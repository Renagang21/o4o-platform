/**
 * GlucoseView Customer Entity
 *
 * Phase C-2: GlucoseView Customer Management
 * Customer records managed by pharmacists
 *
 * Key Design:
 * - Each customer record is tied to a specific pharmacist (pharmacist_id)
 * - A patient can have multiple records across different pharmacies
 * - Data sharing between pharmacies requires explicit consent
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CustomerGender = 'male' | 'female';
export type CustomerSyncStatus = 'pending' | 'synced' | 'error';

@Entity({ name: 'glucoseview_customers', schema: 'public' })
@Index(['pharmacist_id', 'phone'])
@Index(['pharmacist_id', 'email'])
export class GlucoseViewCustomer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The pharmacist (user) who registered this customer
   * This is the owner of this customer record
   */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  pharmacist_id!: string;

  /**
   * Customer name
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * Customer phone number (for identification)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  /**
   * Customer email (for identification)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  /**
   * Customer birth year (출생연도)
   */
  @Column({ type: 'int', nullable: true })
  birth_year?: number;

  /**
   * Customer gender
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: CustomerGender;

  /**
   * KakaoTalk ID for sharing reports
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  kakao_id?: string;

  /**
   * Last visit date
   */
  @Column({ type: 'timestamp', nullable: true })
  last_visit?: Date;

  /**
   * Total visit count
   */
  @Column({ type: 'int', default: 1 })
  visit_count!: number;

  /**
   * CGM data sync status
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  sync_status!: CustomerSyncStatus;

  /**
   * Last CGM data sync timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  last_sync_at?: Date;

  /**
   * Additional notes by the pharmacist
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Consent for data sharing with other pharmacies
   * Future use: when customer app is available
   */
  @Column({ type: 'boolean', default: false })
  data_sharing_consent!: boolean;

  /**
   * Date when data sharing consent was given
   */
  @Column({ type: 'timestamp', nullable: true })
  consent_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
