/**
 * OrganizationProductListing Entity
 * 약국 매장 진열 상품
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { OrganizationStore } from './organization-store.entity.js';
import type { NetureSupplierProduct } from '../../../modules/neture/entities/NetureSupplierProduct.entity.js';

@Entity('organization_product_listings')
@Index('IDX_org_product_listing_org_id', ['organization_id'])
@Index('IDX_org_product_listing_active', ['is_active'])
export class OrganizationProductListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationStore;

  @Column({ type: 'varchar', length: 50, default: 'kpa' })
  service_key: string;

  @Column({ type: 'varchar', length: 200 })
  external_product_id: string;

  @Column({ type: 'varchar', length: 300 })
  product_name: string;

  @Column({ type: 'jsonb', default: '{}' })
  product_metadata: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  retail_price: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  // WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1
  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  // ESM §4: string-based relation
  @ManyToOne('NetureSupplierProduct')
  @JoinColumn({ name: 'product_id' })
  product?: NetureSupplierProduct;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
