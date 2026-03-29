/**
 * CategoryMappingRule Entity
 *
 * keyword → category_id 매핑 룰 (자동 카테고리 추천용)
 *
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ProductCategory } from './ProductCategory.entity.js';

@Entity('category_mapping_rules')
export class CategoryMappingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  keyword: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne('ProductCategory', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
