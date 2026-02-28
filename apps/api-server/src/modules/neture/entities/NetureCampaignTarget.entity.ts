/**
 * NetureCampaignTarget Entity
 *
 * WO-NETURE-TIME-LIMITED-PRICE-CAMPAIGN-V1
 * 캠페인 대상 상품 + 가격 오버라이드.
 * (campaign_id, product_id, organization_id) 조합으로 특정 조직에 대한 캠페인 가격을 정의.
 * organization_id가 null이면 모든 조직에 적용.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { NetureTimeLimitedPriceCampaign } from './NetureTimeLimitedPriceCampaign.entity.js';

@Entity('neture_campaign_targets')
@Index(['campaignId'])
@Index(['productId'])
@Index(['organizationId'])
@Unique(['campaignId', 'productId', 'organizationId'])
export class NetureCampaignTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'campaign_price', type: 'int' })
  campaignPrice: number;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne('NetureTimeLimitedPriceCampaign', 'targets', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: NetureTimeLimitedPriceCampaign;
}
