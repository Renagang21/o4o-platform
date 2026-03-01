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
import type { ProductMaster } from '../../../modules/neture/entities/ProductMaster.entity.js';
import type { SupplierProductOffer } from '../../../modules/neture/entities/SupplierProductOffer.entity.js';

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

  @Column({ type: 'boolean', default: true })
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

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
