/**
 * StoreMultilingualProductContentPage Entity
 *
 * WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1
 *
 * Locale-specific free marketing content page for a store-scoped product
 * content group. Pages are independent versions, not guaranteed literal
 * translations of each other.
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
import { StoreMultilingualProductContentGroup } from './store-multilingual-product-content-group.entity.js';

export type StoreMultilingualProductLocale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
export type StoreMultilingualProductContentPageStatus = 'draft' | 'published' | 'archived';
export type StoreMultilingualProductContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';

@Entity({ name: 'store_multilingual_product_content_pages' })
@Index('IDX_store_multilingual_product_content_pages_group_status', ['groupId', 'status'])
@Index('IDX_store_multilingual_product_content_pages_locale', ['locale'])
@Index('UQ_store_multilingual_product_content_page_locale', ['groupId', 'locale'], { unique: true })
export class StoreMultilingualProductContentPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => StoreMultilingualProductContentGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: StoreMultilingualProductContentGroup;

  @Column({ type: 'varchar', length: 10 })
  locale!: StoreMultilingualProductLocale;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'content_format', type: 'varchar', length: 30, default: 'blocks' })
  contentFormat!: StoreMultilingualProductContentFormat;

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
  status!: StoreMultilingualProductContentPageStatus;

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
