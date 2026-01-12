/**
 * P3: RoleApplication Entity
 *
 * Manages user role application workflow (seller, supplier, partner, etc.)
 * - Users submit applications via /apply/* pages
 * - Admins review and approve/reject
 * - Approved applications create RoleAssignments
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import type { User } from '../modules/auth/entities/User.js';

export enum RoleApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('role_applications')
export class RoleApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 50 })
  role!: string; // 'seller' | 'supplier' | 'partner' | 'admin' etc.

  @Column({
    type: 'enum',
    enum: RoleApplicationStatus,
    default: RoleApplicationStatus.PENDING,
  })
  status!: RoleApplicationStatus;

  @Column({ name: 'business_name', type: 'varchar', length: 100, nullable: true })
  businessName?: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100, nullable: true })
  businessNumber?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'applied_at', type: 'timestamp with time zone' })
  appliedAt!: Date;

  @Column({ name: 'decided_at', type: 'timestamp with time zone', nullable: true })
  decidedAt?: Date;

  @Column({ name: 'decided_by', type: 'varchar', length: 50, nullable: true })
  decidedBy?: string; // Admin userId or email

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
