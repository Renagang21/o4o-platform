/**
 * PharmacyContent Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * 약국 공급자/HQ 콘텐츠
 * Schema: signage_pharmacy
 *
 * Global Content + Force 모델 구현
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
export type PharmacyContentType =
  | 'product_card'
  | 'health_info'
  | 'medication_guide'
  | 'promo'
  | 'notice';

/**
 * Content source
 * Phase 3 Design FROZEN: pharmacy-hq만 Force 허용
 */
export type PharmacyContentSource = 'pharmacy-hq' | 'pharmacy-supplier';

/**
 * Content scope
 */
export type PharmacyContentScope = 'global' | 'store';

/**
 * Content status
 */
export type PharmacyContentStatus = 'draft' | 'published' | 'archived';

/**
 * Media data interface
 */
export interface PharmacyMediaData {
  imageUrl?: string;
  videoUrl?: string;
  duration?: number;
}

@Entity({ name: 'pharmacy_contents', schema: 'signage_pharmacy' })
@Index(['organizationId'])
@Index(['source'])
@Index(['scope'])
@Index(['status'])
@Index(['categoryId'])
@Index(['campaignId'])
@Index(['validFrom', 'validUntil'])
@Index(['isForced'])
export class PharmacyContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Content type
   * Examples: 'product_card', 'health_info', 'medication_guide', 'promo', 'notice'
   */
  @Column({ type: 'varchar', length: 50 })
  contentType!: PharmacyContentType;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  campaignId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  templatePresetId!: string | null;

  /**
   * Media data
   */
  @Column({ type: 'jsonb', default: {} })
  mediaData!: PharmacyMediaData;

  /**
   * Content source
   * Phase 3 Design FROZEN: pharmacy-hq만 Force 허용
   */
  @Column({ type: 'varchar', length: 20, default: 'pharmacy-hq' })
  source!: PharmacyContentSource;

  /**
   * Content scope
   */
  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope!: PharmacyContentScope;

  /**
   * Force flag
   * Only pharmacy-hq can set isForced = true (FROZEN rule)
   * Forced content: Store에서 삭제 불가, 순서 변경 불가
   */
  @Column({ type: 'boolean', default: false })
  isForced!: boolean;

  /**
   * Parent content ID for cloned content tracking
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentContentId!: string | null;

  @Column({ type: 'date', nullable: true })
  validFrom!: string | null;

  @Column({ type: 'date', nullable: true })
  validUntil!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: PharmacyContentStatus;

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
