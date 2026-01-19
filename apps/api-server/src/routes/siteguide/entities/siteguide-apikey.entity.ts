/**
 * SiteGuideApiKey Entity
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * API Key 발급 및 검증 구조
 *
 * Schema: siteguide (독립 스키마)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { SiteGuideBusiness } from './siteguide-business.entity.js';

export enum SiteGuideApiKeyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

@Entity({ name: 'siteguide_api_keys', schema: 'siteguide' })
export class SiteGuideApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  @Index()
  businessId!: string;

  /**
   * API Key (해시 저장)
   * 실제 키는 발급 시에만 1회 반환
   */
  @Column({ name: 'key_hash', type: 'varchar', length: 64 })
  @Index({ unique: true })
  keyHash!: string;

  /**
   * API Key 상태
   */
  @Column({
    type: 'enum',
    enum: SiteGuideApiKeyStatus,
    default: SiteGuideApiKeyStatus.ACTIVE,
  })
  @Index()
  status!: SiteGuideApiKeyStatus;

  /**
   * Key 이름/설명 (관리용)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  label?: string | null;

  /**
   * 마지막 사용 시간
   */
  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * 취소/폐기 시간
   */
  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('SiteGuideBusiness', 'apiKeys')
  @JoinColumn({ name: 'business_id' })
  business?: SiteGuideBusiness;
}
