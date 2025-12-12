/**
 * Supplier Campaign Entity
 *
 * 공급사 주도 캠페인 관리
 * - Partner에게 자동 배포
 * - 성과 분석
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CampaignType = 'product_launch' | 'seasonal' | 'flash_sale' | 'collaboration' | 'event';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignTargetType = 'all' | 'sellers' | 'partners' | 'selected';

@Entity('cosmetics_supplier_campaigns')
export class SupplierCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_id' })
  @Index()
  supplierId!: string;

  @Column({ name: 'campaign_name' })
  campaignName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'product_launch',
  })
  type!: CampaignType;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  @Index()
  status!: CampaignStatus;

  @Column({
    name: 'target_type',
    type: 'varchar',
    length: 20,
    default: 'all',
  })
  targetType!: CampaignTargetType;

  @Column({ name: 'target_seller_ids', type: 'jsonb', nullable: true })
  targetSellerIds?: string[];

  @Column({ name: 'target_partner_ids', type: 'jsonb', nullable: true })
  targetPartnerIds?: string[];

  @Column({ name: 'product_ids', type: 'jsonb', nullable: true })
  productIds?: string[];

  @Column({ name: 'category_ids', type: 'jsonb', nullable: true })
  categoryIds?: string[];

  @Column({ name: 'discount_type', nullable: true })
  discountType?: 'percentage' | 'fixed';

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountValue?: number;

  @Column({ name: 'commission_bonus', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionBonus?: number;

  @Column({ name: 'budget', type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget?: number;

  @Column({ name: 'spent_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  spentAmount!: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'banner_image_url', nullable: true })
  bannerImageUrl?: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl?: string;

  @Column({ name: 'content', type: 'jsonb', nullable: true })
  content?: {
    headline?: string;
    body?: string;
    hashtags?: string[];
    callToAction?: string;
  };

  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions?: string;

  // Analytics
  @Column({ name: 'total_views', type: 'int', default: 0 })
  totalViews!: number;

  @Column({ name: 'total_clicks', type: 'int', default: 0 })
  totalClicks!: number;

  @Column({ name: 'total_conversions', type: 'int', default: 0 })
  totalConversions!: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ name: 'participant_count', type: 'int', default: 0 })
  participantCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
