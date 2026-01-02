/**
 * Glycopharm Application Entity
 *
 * Phase B-1: Glycopharm API Implementation
 * Manages pharmacy participation/service application workflow
 * - Pharmacies submit applications via /apply page
 * - Operators review and approve/reject
 * - Approved applications update pharmacy status
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
import { User } from '../../../modules/auth/entities/User.js';

export type GlycopharmApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type GlycopharmServiceType = 'dropshipping' | 'sample_sales' | 'digital_signage';
export type GlycopharmOrganizationType = 'pharmacy' | 'pharmacy_chain';

@Entity({ name: 'glycopharm_applications', schema: 'public' })
export class GlycopharmApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'organization_type', type: 'varchar', length: 50 })
  organizationType!: GlycopharmOrganizationType;

  @Column({ name: 'organization_name', type: 'varchar', length: 255 })
  organizationName!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100, nullable: true })
  businessNumber?: string;

  @Column({ name: 'service_types', type: 'jsonb' })
  serviceTypes!: GlycopharmServiceType[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'submitted',
  })
  status!: GlycopharmApplicationStatus;

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
