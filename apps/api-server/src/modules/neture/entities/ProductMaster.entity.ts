/**
 * ProductMaster Entity
 *
 * 플랫폼 상품 SSOT (Single Source of Truth)
 * 물리적 제품 1건 = barcode 1건 = ProductMaster 1건
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 *
 * Immutable fields: barcode, regulatory_type, regulatory_name, manufacturer_name, mfds_permit_number, mfds_product_id
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { SupplierProductOffer } from './SupplierProductOffer.entity.js';
import type { ProductCategory } from './ProductCategory.entity.js';
import type { Brand } from './Brand.entity.js';
import type { ProductImage } from './ProductImage.entity.js';
import type { ProductIdentifier } from './ProductIdentifier.entity.js';
import type { ProductDrugCategory } from '../utils/product-type.util.js';
import type { ProductDrugExtension } from './ProductDrugExtension.entity.js';

@Entity('product_masters')
export class ProductMaster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** GTIN barcode (8/12/13/14자리, check digit 포함) — immutable */
  @Column({ type: 'varchar', length: 14 })
  barcode: string;

  /** MFDS 기반 규제 유형 (자동 설정) — immutable */
  @Column({ name: 'regulatory_type', type: 'varchar', length: 50 })
  regulatoryType: string;

  /**
   * 의약품 세부 분류 (active 런타임 판정용) — WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1
   *
   * regulatoryType 이 'DRUG'까지만 구분하는 한계를 보완. OTC/Rx/QUASI 를 런타임에서 판정.
   * mutable (검토 중 drug_unspecified → otc 등 refine 가능). null = 미설정(비의약품 등).
   * 값: non_drug | otc | rx | quasi_drug | drug_unspecified (varchar, DB enum 아님)
   */
  @Column({ name: 'drug_category', type: 'varchar', length: 32, nullable: true })
  drugCategory: ProductDrugCategory | null;

  /** 식약처 공식 제품명 — immutable */
  @Column({ name: 'regulatory_name', type: 'varchar', length: 255 })
  regulatoryName: string;

  /** 상품명 (canonical) */
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  /** 브랜드명 (optional, legacy — brandId 전환 후 제거 예정) */
  @Column({ name: 'brand_name', type: 'varchar', length: 255, nullable: true })
  brandName: string | null;

  /** 카테고리 FK (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) */
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne('ProductCategory', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory;

  /** 브랜드 FK (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) */
  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null;

  @ManyToOne('Brand', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brand_id' })
  brand?: Brand;

  /** 제품 규격 (예: 500mg × 60정) */
  @Column({ type: 'text', nullable: true })
  specification: string | null;

  /** 원산지 */
  @Column({ name: 'origin_country', type: 'varchar', length: 100, nullable: true })
  originCountry: string | null;

  /** 검색/필터용 태그 (JSONB) */
  @Column({ type: 'jsonb', default: '[]' })
  tags: string[];

  /** 제조사명 — immutable */
  @Column({ name: 'manufacturer_name', type: 'varchar', length: 255 })
  manufacturerName: string;

  /** 식약처 허가 번호 — immutable */
  @Column({ name: 'mfds_permit_number', type: 'varchar', length: 100, nullable: true })
  mfdsPermitNumber: string | null;

  /** 식약처 제품 ID — immutable */
  @Column({ name: 'mfds_product_id', type: 'varchar', length: 100 })
  mfdsProductId: string;

  /** 식약처 검증 여부 */
  @Column({ name: 'is_mfds_verified', type: 'boolean', default: true })
  isMfdsVerified: boolean;

  /** 식약처 동기화 시각 */
  @Column({ name: 'mfds_synced_at', type: 'timestamp', nullable: true })
  mfdsSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** 이 Master에 연결된 공급 Offer 목록 */
  @OneToMany('SupplierProductOffer', 'master')
  offers: SupplierProductOffer[];

  /** 이 Master에 연결된 상품 이미지 목록 (WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1) */
  @OneToMany('ProductImage', 'master')
  images: ProductImage[];

  /**
   * 이 Master에 연결된 식별자 목록 (Identifier Core — WO-O4O-PRODUCT-IDENTIFIER-CORE-V1)
   *
   * additive 계층. primary 식별자는 barcode 컬럼의 mirror 이며, barcode 컬럼/UNIQUE 는 유지된다.
   */
  @OneToMany('ProductIdentifier', 'productMaster')
  identifiers?: ProductIdentifier[];

  /**
   * 의약품 확장 (1:1) — WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1
   * 상세/검증/출처/노출·광고·판매 정책. extension 측이 owning(FK 보유).
   */
  @OneToOne('ProductDrugExtension', 'productMaster')
  drugExtension?: ProductDrugExtension | null;
}
