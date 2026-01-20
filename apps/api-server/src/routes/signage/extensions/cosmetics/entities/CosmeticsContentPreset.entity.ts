/**
 * CosmeticsContentPreset Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * 화장품 콘텐츠 프리셋
 * Schema: signage_cosmetics
 *
 * Note: Core Template은 ID 참조만 허용 (ESM 규칙)
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
 * Preset type
 */
export type CosmeticsPresetType =
  | 'new_product'
  | 'trend'
  | 'lookbook'
  | 'beauty_tip'
  | 'campaign';

/**
 * Visual config interface
 */
export interface CosmeticsVisualConfig {
  primaryColor: string;
  secondaryColor: string;
  fontStyle: 'modern' | 'elegant' | 'playful';
  imageLayout: 'full' | 'split' | 'mosaic';
}

@Entity({ name: 'cosmetics_content_presets', schema: 'signage_cosmetics' })
@Index(['organizationId'])
@Index(['type'])
@Index(['brandId'])
@Index(['coreTemplateId'])
export class CosmeticsContentPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * Preset type
   * Examples: 'new_product', 'trend', 'lookbook', 'beauty_tip', 'campaign'
   */
  @Column({ type: 'varchar', length: 50 })
  type!: CosmeticsPresetType;

  /**
   * Brand ID reference
   */
  @Column({ type: 'uuid', nullable: true })
  brandId!: string | null;

  /**
   * Core SignageTemplate 참조 (ID만)
   * 직접 관계 금지 (ESM 규칙)
   */
  @Column({ type: 'uuid', nullable: true })
  coreTemplateId!: string | null;

  /**
   * Visual configuration
   */
  @Column({ type: 'jsonb' })
  visualConfig!: CosmeticsVisualConfig;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
