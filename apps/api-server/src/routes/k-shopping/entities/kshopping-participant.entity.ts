/**
 * K-Shopping Participant Entity
 *
 * K-Shopping (여행자 서비스) 참여자 엔티티
 * - Application 승인 시 자동 생성
 * - enabledServices: 활성화된 서비스 목록 (Source of Truth)
 * - participantType: 'store' | 'guide' | 'partner'
 *
 * 🔒 FROZEN (H1-0): 이 엔티티는 동결 상태입니다.
 *
 * ## 동결 사유
 * Cosmetics Core 도메인으로의 향후 통합을 위해 현재 구조를 유지합니다.
 * 통합 시 cosmetics_participants로 이전될 예정입니다.
 *
 * ## 확장 금지
 * - 신규 컬럼 추가 ❌
 * - status 값 추가 ❌ (active/inactive/suspended 고정)
 * - Cosmetics 엔티티와 FK 관계 설정 ❌
 *
 * ## 데이터 관계 (참조만 허용)
 * - userId → auth-core User (UUID 참조)
 * - applicationId → KShoppingApplication (동일 도메인 내 참조)
 * - Cosmetics 상품 ID 참조 시 → metadata JSONB에 저장 (FK 금지)
 *
 * @frozen H1-0 (2025-01-02)
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
