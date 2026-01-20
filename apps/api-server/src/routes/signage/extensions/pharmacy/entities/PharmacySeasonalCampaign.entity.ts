/**
 * PharmacySeasonalCampaign Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * 계절별 건강 캠페인 관리
 * Schema: signage_pharmacy
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Season type
 */
export type PharmacySeasonType = 'spring' | 'summer' | 'fall' | 'winter' | 'year_round';

/**
 * Content scope
 */
export type PharmacyContentScope = 'global' | 'store';

@Entity({ name: 'pharmacy_seasonal_campaigns', schema: 'signage_pharmacy' })
@Index(['organizationId'])
@Index(['season'])
@Index(['startDate', 'endDate'])
@Index(['scope'])
export class PharmacySeasonalCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * Season
   * Examples: 'spring', 'summer', 'fall', 'winter', 'year_round'
   */
  @Column({ type: 'varchar', length: 50 })
  season!: PharmacySeasonType;

  /**
   * Health condition
   * Examples: '감기', '알레르기', '피부건조', '탈수', '관절'
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  healthCondition!: string | null;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'jsonb', default: [] })
  productKeywords!: string[];

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope!: PharmacyContentScope;

  /**
   * Force flag
   * Only pharmacy-hq can set isForced = true (FROZEN rule)
   */
  @Column({ type: 'boolean', default: false })
  isForced!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
