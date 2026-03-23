/**
 * ProductCategory Entity
 *
 * 상품 카테고리 — 4단계 계층 구조 (depth 0-3)
 * parent_id 기반 self-referencing tree
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
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

@Entity('product_categories')
@Index(['parentId'])
@Index(['depth'])
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  /** 부모 카테고리 (self-reference) */
  @ManyToOne('ProductCategory', 'children', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: ProductCategory;

  /** 자식 카테고리 (self-reference) */
  @OneToMany('ProductCategory', 'parent')
  children?: ProductCategory[];

  /** 계층 깊이: 0(대분류) ~ 3(세부분류) */
  @Column({ type: 'int', default: 0 })
  depth: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** 규제 카테고리 여부 — true 시 MFDS 필드(regulatoryType/regulatoryName) 필수 */
  @Column({ name: 'is_regulated', type: 'boolean', default: false })
  isRegulated: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
