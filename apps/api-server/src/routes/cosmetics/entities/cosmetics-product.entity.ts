/**
 * CosmeticsProduct Entity
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * Schema: cosmetics (isolated from Core)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CosmeticsBrand } from './cosmetics-brand.entity.js';
import { CosmeticsLine } from './cosmetics-line.entity.js';
import { CosmeticsPricePolicy } from './cosmetics-price-policy.entity.js';

/**
 * Product Status Enum
 * - draft: 초안 (비공개)
 * - visible: 공개
 * - hidden: 숨김
 * - sold_out: 품절
 */
export enum CosmeticsProductStatus {
  DRAFT = 'draft',
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  SOLD_OUT = 'sold_out',
}

/**
 * Currency Enum
 */
export enum CosmeticsCurrency {
  KRW = 'KRW',
  USD = 'USD',
}

/**
 * Product Image Interface
 */
export interface CosmeticsProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

/**
 * Product Variant Interface
 */
export interface CosmeticsProductVariant {
  id: string;
  name: string;
  sku: string;
  price_modifier?: number;
}

@Entity({ name: 'cosmetics_products', schema: 'cosmetics' })
export class CosmeticsProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  @Index()
  brandId!: string;

  @Column({ name: 'line_id', type: 'uuid', nullable: true })
  @Index()
  lineId?: string | null;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  ingredients?: string[] | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: CosmeticsProductStatus.DRAFT,
  })
  @Index()
  status!: CosmeticsProductStatus;

  @Column({ name: 'base_price', type: 'int', default: 0 })
  basePrice!: number;

  @Column({ name: 'sale_price', type: 'int', nullable: true })
  salePrice?: number | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: CosmeticsCurrency.KRW,
  })
  currency!: CosmeticsCurrency;

  @Column({ type: 'jsonb', nullable: true })
  images?: CosmeticsProductImage[] | null;

  @Column({ type: 'jsonb', nullable: true })
  variants?: CosmeticsProductVariant[] | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations (no FK constraints)
  @ManyToOne(() => CosmeticsBrand, (brand) => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand?: CosmeticsBrand;

  @ManyToOne(() => CosmeticsLine, (line) => line.products)
  @JoinColumn({ name: 'line_id' })
  line?: CosmeticsLine;

  @OneToOne(() => CosmeticsPricePolicy, (policy) => policy.product)
  pricePolicy?: CosmeticsPricePolicy;
}
