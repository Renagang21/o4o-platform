/**
 * SiteGuideUsageSummary Entity
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * 영속적 사용량 추적 (일별 요약)
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

@Entity({ name: 'siteguide_usage_summaries', schema: 'siteguide' })
@Index(['businessId', 'date'], { unique: true })
export class SiteGuideUsageSummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  @Index()
  businessId!: string;

  /**
   * 집계 날짜 (YYYY-MM-DD)
   */
  @Column({ type: 'date' })
  @Index()
  date!: string;

  /**
   * 총 요청 수
   */
  @Column({ name: 'request_count', type: 'int', default: 0 })
  requestCount!: number;

  /**
   * 성공 요청 수
   */
  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount!: number;

  /**
   * 차단된 요청 수 (rate limit, 도메인 불일치 등)
   */
  @Column({ name: 'blocked_count', type: 'int', default: 0 })
  blockedCount!: number;

  /**
   * 에러 요청 수
   */
  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('SiteGuideBusiness', 'usageSummaries')
  @JoinColumn({ name: 'business_id' })
  business?: SiteGuideBusiness;
}
