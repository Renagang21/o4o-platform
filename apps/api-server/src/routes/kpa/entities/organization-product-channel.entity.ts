/**
 * OrganizationProductChannel Entity
 * 채널별 상품 진열 매핑
 *
 * WO-PHARMACY-HUB-OWNERSHIP-RESTRUCTURE-PHASE1-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import type { OrganizationChannel } from './organization-channel.entity.js';
import type { OrganizationProductListing } from './organization-product-listing.entity.js';

@Entity('organization_product_channels')
@Index('IDX_product_channel_channel_id', ['channel_id'])
@Index('IDX_product_channel_listing_id', ['product_listing_id'])
export class OrganizationProductChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  channel_id: string;

  @Column({ type: 'uuid' })
  product_listing_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'int', nullable: true })
  channel_price: number | null;

  @Column({ type: 'int', nullable: true })
  sales_limit: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md Section 4)
  @ManyToOne('OrganizationChannel', 'productChannels')
  @JoinColumn({ name: 'channel_id' })
  channel?: OrganizationChannel;

  @ManyToOne('OrganizationProductListing')
  @JoinColumn({ name: 'product_listing_id' })
  productListing?: OrganizationProductListing;
}
