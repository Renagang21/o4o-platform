/**
 * K-Shopping Application Entity
 *
 * K-Shopping (여행자 서비스) 참여 신청 엔티티
 * - participantType: 'store' | 'guide' | 'partner'
 * - serviceTypes: 신청한 서비스 목록 (JSONB)
 * - 승인 시 KShoppingParticipant 생성
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

export type KShoppingApplicationStatus = 'submitted' | 'approved' | 'rejected';
export type KShoppingParticipantType = 'store' | 'guide' | 'partner';
export type KShoppingServiceType = 'tax_refund' | 'guide_sales' | 'travel_package';

@Entity({ name: 'kshopping_applications', schema: 'public' })
export class KShoppingApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'participant_type', type: 'varchar', length: 50 })
  participantType!: KShoppingParticipantType;

  @Column({ name: 'organization_name', type: 'varchar', length: 255 })
  organizationName!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100, nullable: true })
  businessNumber?: string;

  @Column({ name: 'service_types', type: 'jsonb' })
  serviceTypes!: KShoppingServiceType[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'submitted',
  })
  status!: KShoppingApplicationStatus;

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
