/**
 * SiteGuideBusiness Entity
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * 사업자 단위 실행 컨텍스트
 *
 * Schema: siteguide (독립 스키마)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { SiteGuideApiKey } from './siteguide-apikey.entity.js';
import type { SiteGuideUsageSummary } from './siteguide-usage-summary.entity.js';

export enum SiteGuideBusinessStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

@Entity({ name: 'siteguide_businesses', schema: 'siteguide' })
export class SiteGuideBusiness {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({
    type: 'enum',
    enum: SiteGuideBusinessStatus,
    default: SiteGuideBusinessStatus.ACTIVE,
  })
  @Index()
  status!: SiteGuideBusinessStatus;

  /**
   * 허용된 도메인 목록 (JSON 배열)
   * 이 도메인에서만 API 호출 허용
   */
  @Column({ name: 'allowed_domains', type: 'jsonb', default: [] })
  allowedDomains!: string[];

  /**
   * 일일 요청 제한 (기본 100)
   */
  @Column({ name: 'daily_limit', type: 'int', default: 100 })
  dailyLimit!: number;

  /**
   * 사업자 연락처 (선택)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  /**
   * 메모/설명 (운영용)
   */
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @OneToMany('SiteGuideApiKey', 'business')
  apiKeys?: SiteGuideApiKey[];

  @OneToMany('SiteGuideUsageSummary', 'business')
  usageSummaries?: SiteGuideUsageSummary[];
}
