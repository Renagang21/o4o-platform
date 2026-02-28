/**
 * NetureCampaignAggregation Entity
 *
 * WO-NETURE-TIME-LIMITED-PRICE-CAMPAIGN-V1
 * 캠페인 실적 집계 — 주문 생성 시 atomic increment.
 * (campaign_id, target_id) 쌍으로 집계.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('neture_campaign_aggregations')
@Index(['campaignId'])
@Index(['targetId'])
@Unique(['campaignId', 'targetId'])
export class NetureCampaignAggregation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number;

  @Column({ name: 'total_quantity', type: 'int', default: 0 })
  totalQuantity: number;

  @Column({ name: 'total_amount', type: 'bigint', default: 0 })
  totalAmount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
