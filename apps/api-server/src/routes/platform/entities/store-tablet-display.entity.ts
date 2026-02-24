/**
 * StoreTabletDisplay Entity
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 *
 * 태블릿에 진열할 상품 구성.
 * product_type으로 supplier/local 구분.
 * product_id는 상품 타입에 따라 다른 테이블을 참조 (soft reference).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { StoreTablet } from './store-tablet.entity.js';

export type StoreTabletDisplayProductType = 'supplier' | 'local';

@Entity({ name: 'store_tablet_displays' })
@Index('IDX_store_tablet_displays_tablet_sort', ['tabletId', 'sortOrder'])
export class StoreTabletDisplay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tablet_id', type: 'uuid' })
  @Index('IDX_store_tablet_displays_tablet')
  tabletId!: string;

  @Column({ name: 'product_type', type: 'varchar', length: 20 })
  productType!: StoreTabletDisplayProductType;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('StoreTablet', 'displays')
  @JoinColumn({ name: 'tablet_id' })
  tablet?: StoreTablet;
}
