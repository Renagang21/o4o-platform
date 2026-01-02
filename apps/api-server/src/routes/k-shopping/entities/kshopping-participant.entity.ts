/**
 * K-Shopping Participant Entity
 *
 * K-Shopping (여행자 서비스) 참여자 엔티티
 * - Application 승인 시 자동 생성
 * - enabledServices: 활성화된 서비스 목록 (Source of Truth)
 * - participantType: 'store' | 'guide' | 'partner'
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { KShoppingServiceType, KShoppingParticipantType } from './kshopping-application.entity.js';

export type KShoppingParticipantStatus = 'active' | 'inactive' | 'suspended';

@Entity({ name: 'kshopping_participants', schema: 'public' })
export class KShoppingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'participant_type', type: 'varchar', length: 50 })
  participantType!: KShoppingParticipantType;

  @Column({ name: 'organization_name', type: 'varchar', length: 255 })
  organizationName!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100, nullable: true })
  businessNumber?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 100, nullable: true })
  contactName?: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: KShoppingParticipantStatus;

  @Column({ name: 'enabled_services', type: 'jsonb', default: '[]' })
  enabledServices!: KShoppingServiceType[];

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
