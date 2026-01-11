/**
 * GlucoseView Application Entity
 *
 * Phase C-4: GlucoseView Application Workflow
 * Manages CGM View service application workflow
 * - Pharmacies submit applications via /apply page
 * - Operators review and approve/reject
 * - Approved applications create GlucoseView Pharmacy with enabled services
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
import type { User } from '../../../modules/auth/entities/User.js';

export type GlucoseViewApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type GlucoseViewServiceType = 'cgm_view';

@Entity({ name: 'glucoseview_applications', schema: 'public' })
export class GlucoseViewApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /**
   * 연결된 glycopharm pharmacy ID (optional)
   */
  @Column({ name: 'pharmacy_id', type: 'uuid', nullable: true })
  pharmacyId?: string;

  /**
   * 약국명 (glycopharm과 별개로 저장)
   */
  @Column({ name: 'pharmacy_name', type: 'varchar', length: 255 })
  pharmacyName!: string;

  /**
   * 사업자번호
   */
  @Column({ name: 'business_number', type: 'varchar', length: 100, nullable: true })
  businessNumber?: string;

  @Column({ name: 'service_types', type: 'jsonb', default: '["cgm_view"]' })
  serviceTypes!: GlucoseViewServiceType[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'submitted',
  })
  status!: GlucoseViewApplicationStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone' })
  submittedAt!: Date;

  @Column({ name: 'decided_at', type: 'timestamp with time zone', nullable: true })
  decidedAt?: Date;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
