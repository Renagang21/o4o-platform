/**
 * StoreLocalProduct Entity
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1
 *
 * 매장 자체 상품 (Display Domain).
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 * organization_id로 멀티테넌트 격리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type StoreLocalProductBadgeType = 'none' | 'new' | 'recommend' | 'event';

@Entity({ name: 'store_local_products' })
@Index('IDX_store_local_products_org_active', ['organizationId', 'isActive'])
export class StoreLocalProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_local_products_org')
  organizationId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  images!: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'price_display', type: 'numeric', precision: 12, scale: 2, nullable: true })
  priceDisplay?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  // ── Content Block Fields (WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1) ──

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'detail_html', type: 'text', nullable: true })
  detailHtml?: string | null;

  @Column({ name: 'usage_info', type: 'text', nullable: true })
  usageInfo?: string | null;

  @Column({ name: 'caution_info', type: 'text', nullable: true })
  cautionInfo?: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string | null;

  @Column({ name: 'gallery_images', type: 'jsonb', default: '[]' })
  galleryImages!: string[];

  @Column({
    name: 'badge_type',
    type: 'enum',
    enum: ['none', 'new', 'recommend', 'event'],
    default: "'none'",
  })
  badgeType!: StoreLocalProductBadgeType;

  @Column({ name: 'highlight_flag', type: 'boolean', default: false })
  highlightFlag!: boolean;

  // ── Timestamps ──

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
