/**
 * OrganizationProductListing Entity
 * 약국 매장 진열 상품
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: product_id → master_id + offer_id
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
import type { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';
import type { SupplierProductOffer } from '../../neture/entities/SupplierProductOffer.entity.js';
import type { ServiceProduct } from '../../../routes/kpa/entities/service-product.entity.js';

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

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ name: 'master_id', type: 'uuid' })
  master_id: string;

  @ManyToOne('ProductMaster')
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ name: 'offer_id', type: 'uuid' })
  offer_id: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  /** WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1: 미래 FK — 현재 nullable, 기존 동작 무변경 */
  @Column({ type: 'uuid', nullable: true })
  service_product_id: string | null;

  @ManyToOne('ServiceProduct')
  @JoinColumn({ name: 'service_product_id' })
  service_product?: ServiceProduct;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
