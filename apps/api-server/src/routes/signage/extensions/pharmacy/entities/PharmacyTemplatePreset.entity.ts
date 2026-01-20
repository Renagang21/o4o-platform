/**
 * PharmacyTemplatePreset Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-PHARMACY
 *
 * 약국 전용 템플릿 프리셋
 * Schema: signage_pharmacy
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
 * Template preset type
 */
export type PharmacyTemplateType =
  | 'medication_guide'
  | 'health_tip'
  | 'product_promo'
  | 'event'
  | 'notice';

/**
 * Template config interface
 */
export interface PharmacyTemplateConfig {
  layout: 'horizontal' | 'vertical' | 'grid';
  colorScheme: 'default' | 'health' | 'promo' | 'alert';
  fontFamily: string;
  placeholders: {
    title?: string;
    description?: string;
    productName?: string;
    price?: string;
    warning?: string;
  };
}

@Entity({ name: 'pharmacy_template_presets', schema: 'signage_pharmacy' })
@Index(['organizationId'])
@Index(['type'])
@Index(['coreTemplateId'])
export class PharmacyTemplatePreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * Template type
   * Examples: 'medication_guide', 'health_tip', 'product_promo', 'event', 'notice'
   */
  @Column({ type: 'varchar', length: 50 })
  type!: PharmacyTemplateType;

  /**
   * Core SignageTemplate 참조 (ID만)
   * 직접 관계 금지 (ESM 규칙)
   */
  @Column({ type: 'uuid', nullable: true })
  coreTemplateId!: string | null;

  /**
   * Template configuration
   */
  @Column({ type: 'jsonb' })
  config!: PharmacyTemplateConfig;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
