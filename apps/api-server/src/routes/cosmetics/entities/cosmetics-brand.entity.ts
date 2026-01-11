/**
 * CosmeticsBrand Entity
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
  OneToMany,
  Index,
} from 'typeorm';
import type { CosmeticsLine } from './cosmetics-line.entity.js';
import type { CosmeticsProduct } from './cosmetics-product.entity.js';

@Entity({ name: 'cosmetics_brands', schema: 'cosmetics' })
export class CosmeticsBrand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  @Index()
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations (using type-only imports to avoid circular dependency in ESM)
  @OneToMany('CosmeticsLine', 'brand')
  lines?: CosmeticsLine[];

  @OneToMany('CosmeticsProduct', 'brand')
  products?: CosmeticsProduct[];
}
