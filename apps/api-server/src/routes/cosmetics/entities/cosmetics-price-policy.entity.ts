/**
 * CosmeticsPricePolicy Entity
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
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { CosmeticsProduct } from './cosmetics-product.entity.js';

@Entity({ name: 'cosmetics_price_policies', schema: 'cosmetics' })
export class CosmeticsPricePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid', unique: true })
  @Index()
  productId!: string;

  @Column({ name: 'base_price', type: 'int', default: 0 })
  basePrice!: number;

  @Column({ name: 'sale_price', type: 'int', nullable: true })
  salePrice?: number | null;

  @Column({ name: 'sale_start_at', type: 'timestamptz', nullable: true })
  saleStartAt?: Date | null;

  @Column({ name: 'sale_end_at', type: 'timestamptz', nullable: true })
  saleEndAt?: Date | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToOne('CosmeticsProduct', 'pricePolicy')
  @JoinColumn({ name: 'product_id' })
  product?: CosmeticsProduct;

  /**
   * Check if sale is currently active
   */
  get saleActive(): boolean {
    if (!this.salePrice || this.salePrice <= 0) {
      return false;
    }
    const now = new Date();
    if (this.saleStartAt && now < this.saleStartAt) {
      return false;
    }
    if (this.saleEndAt && now > this.saleEndAt) {
      return false;
    }
    return true;
  }
}
