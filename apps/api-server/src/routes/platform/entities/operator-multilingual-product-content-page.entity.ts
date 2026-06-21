/**
 * OperatorMultilingualProductContentPage Entity
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1
 *
 * Locale-specific free marketing content page for an operator-authored
 * multilingual product content original. Mirrors StoreMultilingualProductContentPage;
 * pages are independent locale versions, not guaranteed literal translations.
 *
 * On store import, published pages are copied into store_multilingual_product_content_pages.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OperatorMultilingualProductContentGroup } from './operator-multilingual-product-content-group.entity.js';

export type OperatorMultilingualProductLocale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
export type OperatorMultilingualProductContentPageStatus = 'draft' | 'published' | 'archived';
export type OperatorMultilingualProductContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';

@Entity({ name: 'operator_multilingual_product_content_pages' })
@Index('IDX_operator_multilingual_product_content_pages_group_status', ['groupId', 'status'])
@Index('IDX_operator_multilingual_product_content_pages_locale', ['locale'])
@Index('UQ_operator_multilingual_product_content_page_locale', ['groupId', 'locale'], { unique: true })
export class OperatorMultilingualProductContentPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne('OperatorMultilingualProductContentGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: OperatorMultilingualProductContentGroup;

  @Column({ type: 'varchar', length: 10 })
  locale!: OperatorMultilingualProductLocale;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'content_format', type: 'varchar', length: 30, default: 'blocks' })
  contentFormat!: OperatorMultilingualProductContentFormat;

  /**
   * Free-form content payload. V1 expected shapes:
   * - blocks: ordered text/image/button blocks
   * - html: sanitized HTML payload
   * - image_sequence: ordered image refs in assets, optional captions here
   * - json: integration-specific payload
   */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content!: Record<string, unknown>;

  /** Ordered asset references such as image/video/PDF refs. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  assets!: Array<Record<string, unknown>>;

  /** Optional CTA buttons such as SNS, coupon, consultation-card, or link. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  buttons!: Array<Record<string, unknown>>;

  @Column({ type: 'varchar', length: 30, default: 'draft' })
  status!: OperatorMultilingualProductContentPageStatus;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
