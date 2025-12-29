/**
 * CosmeticsLine Entity
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
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CosmeticsBrand } from './cosmetics-brand.entity.js';
import { CosmeticsProduct } from './cosmetics-product.entity.js';

@Entity({ name: 'cosmetics_lines', schema: 'cosmetics' })
export class CosmeticsLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  @Index()
  brandId!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => CosmeticsBrand, (brand) => brand.lines)
  @JoinColumn({ name: 'brand_id' })
  brand?: CosmeticsBrand;

  @OneToMany(() => CosmeticsProduct, (product) => product.line)
  products?: CosmeticsProduct[];
}
