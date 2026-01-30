/**
 * Glycopharm Featured Product Entity
 *
 * WO-FEATURED-CURATION-API-V1:
 * 운영자가 지정한 Featured 상품 큐레이션 데이터
 *
 * 핵심 원칙:
 * - Featured는 상품 속성이 아니라 별도 큐레이션 엔티티
 * - 상품 데이터는 읽기 전용으로 참조만 함
 * - 노출 여부/순서는 큐레이션이 소유
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
import type { GlycopharmProduct } from './glycopharm-product.entity.js';

@Entity({ name: 'glycopharm_featured_products', schema: 'public' })
@Index(['service', 'context', 'product_id'], { unique: true })
@Index(['service', 'context', 'position'])
export class GlycopharmFeaturedProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, default: 'glycopharm' })
  service!: string;

  @Column({ type: 'varchar', length: 100, default: 'store-home' })
  context!: string;

  @Column({ type: 'uuid' })
  product_id!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  created_by_user_name?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne('GlycopharmProduct')
  @JoinColumn({ name: 'product_id' })
  product?: GlycopharmProduct;
}
