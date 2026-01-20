/**
 * CosmeticsBrandContent Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * 브랜드 공급자 콘텐츠
 * Schema: signage_cosmetics
 *
 * Global Content 구현 (Force 불허)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';

/**
 * Content type
 */
export type CosmeticsContentType =
  | 'product_launch'
  | 'campaign'
  | 'tutorial'
  | 'promotion';

/**
 * Content status
 */
export type CosmeticsContentStatus = 'draft' | 'published' | 'archived';

/**
 * Content scope
 */
export type CosmeticsContentScope = 'global' | 'store';

/**
 * Media assets interface
 */
export interface CosmeticsMediaAssets {
  mainImage: string;
  subImages?: string[];
  video?: string;
  duration?: number;
}

@Entity({ name: 'cosmetics_brand_contents', schema: 'signage_cosmetics' })
@Index(['organizationId'])
@Index(['brandId'])
@Index(['contentType'])
@Index(['source'])
@Index(['scope'])
@Index(['status'])
@Index(['campaignStart', 'campaignEnd'])
export class CosmeticsBrandContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid' })
  brandId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Content type
   * Examples: 'product_launch', 'campaign', 'tutorial', 'promotion'
   */
  @Column({ type: 'varchar', length: 50 })
  contentType!: CosmeticsContentType;

  /**
   * Media assets
   */
  @Column({ type: 'jsonb' })
  mediaAssets!: CosmeticsMediaAssets;

  @Column({ type: 'varchar', length: 50, nullable: true })
  season!: string | null;

  /**
   * Content source
   * Phase 3 Design FROZEN: cosmetics-brand는 Force 불허
   */
  @Column({ type: 'varchar', length: 20, default: 'cosmetics-brand' })
  source!: 'cosmetics-brand';

  /**
   * Content scope
   */
  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope!: CosmeticsContentScope;

  /**
   * Force flag
   * Cosmetics는 Force 불허 (FROZEN rule)
   * 항상 false
   */
  @Column({ type: 'boolean', default: false })
  isForced!: false;

  /**
   * Parent content ID for cloned content tracking
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentContentId!: string | null;

  @Column({ type: 'date', nullable: true })
  campaignStart!: string | null;

  @Column({ type: 'date', nullable: true })
  campaignEnd!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: CosmeticsContentStatus;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Metadata for extension-specific data
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /**
   * Clone/Download count
   */
  @Column({ type: 'int', default: 0 })
  cloneCount!: number;

  /**
   * View count
   */
  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;

  @VersionColumn()
  version!: number;
}
