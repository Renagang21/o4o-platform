/**
 * NetureProduct Entity
 *
 * Phase D-1: Neture API Server 골격 구축
 * Schema: neture (isolated from Core)
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
import { NeturePartner } from './neture-partner.entity.js';

/**
 * Product Status Enum
 * - draft: 초안 (비공개)
 * - visible: 공개
 * - hidden: 숨김
 * - sold_out: 품절
 */
export enum NetureProductStatus {
  DRAFT = 'draft',
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  SOLD_OUT = 'sold_out',
}

/**
 * Product Category Enum
 */
export enum NetureProductCategory {
  HEALTHCARE = 'healthcare',
  BEAUTY = 'beauty',
  FOOD = 'food',
  LIFESTYLE = 'lifestyle',
  OTHER = 'other',
}

/**
 * Currency Enum
 */
export enum NetureCurrency {
  KRW = 'KRW',
  USD = 'USD',
}

/**
 * Product Image Interface
 */
export interface NetureProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

@Entity({ name: 'neture_products', schema: 'neture' })
export class NetureProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'partner_id', type: 'uuid', nullable: true })
  @Index()
  partnerId?: string | null;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subtitle?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: NetureProductCategory.OTHER,
  })
  @Index()
  category!: NetureProductCategory;

  @Column({
    type: 'varchar',
    length: 20,
    default: NetureProductStatus.DRAFT,
  })
  @Index()
  status!: NetureProductStatus;

  @Column({ name: 'base_price', type: 'int', default: 0 })
  basePrice!: number;

  @Column({ name: 'sale_price', type: 'int', nullable: true })
  salePrice?: number | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: NetureCurrency.KRW,
  })
  currency!: NetureCurrency;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  images?: NetureProductImage[] | null;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations (no FK constraints to other schemas)
  @ManyToOne(() => NeturePartner, (partner) => partner.products)
  @JoinColumn({ name: 'partner_id' })
  partner?: NeturePartner;
}
