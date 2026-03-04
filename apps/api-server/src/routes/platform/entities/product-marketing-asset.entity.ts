/**
 * ProductMarketingAsset Entity
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 *
 * 상품 ↔ 마케팅 자산(QR, POP, Library, Signage) 연결 (Display Domain).
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 * organization_id로 멀티테넌트 격리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity({ name: 'product_marketing_assets' })
@Index('IDX_pma_org_product', ['organizationId', 'productId'])
@Index('IDX_pma_org_asset', ['organizationId', 'assetType', 'assetId'])
@Unique('UQ_pma_product_asset', ['productId', 'assetType', 'assetId'])
export class ProductMarketingAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 50 })
  assetType!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
