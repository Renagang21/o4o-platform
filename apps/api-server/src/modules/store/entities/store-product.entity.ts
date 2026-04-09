/**
 * StoreProduct Entity
 *
 * WO-O4O-STORE-CATALOG-AND-STORE-PRODUCT-SCHEMA-IMPLEMENTATION-V1
 *
 * 매장(organization) 소속 독립 상품.
 * CatalogProduct에서 application layer copy로 생성된 후 완전 독립.
 * 원본(catalog) 변경은 store_product에 영향 없음.
 *
 * - 서비스 소속 ❌, 매장 소속 ⭕
 * - (organization_id, catalog_product_id) UNIQUE
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { CatalogProduct } from '../../catalog/entities/catalog-product.entity.js';
import type { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';

@Entity('store_products')
@Index('idx_store_product_org', ['organizationId'])
@Index('idx_store_product_catalog_id', ['catalogProductId'])
@Index('idx_store_product_master_id', ['productMasterId'])
@Unique('uq_store_product_org_catalog', ['organizationId', 'catalogProductId'])
export class StoreProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 매장 (organization) ID — 소유자 */
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** Catalog 원본 ID (복사 출처, 독립 후에도 추적용) */
  @Column({ name: 'catalog_product_id', type: 'uuid' })
  catalogProductId: string;

  @ManyToOne('CatalogProduct', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'catalog_product_id' })
  catalogProduct?: CatalogProduct;

  /** ProductMaster 연결 (optional) */
  @Column({ name: 'product_master_id', type: 'uuid', nullable: true })
  productMasterId: string | null;

  @ManyToOne('ProductMaster', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_master_id' })
  productMaster?: ProductMaster | null;

  /** 매장별 상품명 */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** 가격 (KRW, integer) */
  @Column({ type: 'integer', nullable: true })
  price: number | null;

  @Column({ name: 'stock_quantity', type: 'integer', nullable: true })
  stockQuantity: number | null;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_partner_recruiting', type: 'boolean', default: false })
  isPartnerRecruiting: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
