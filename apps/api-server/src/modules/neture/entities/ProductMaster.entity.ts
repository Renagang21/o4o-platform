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
} from 'typeorm';
import type { SupplierProductOffer } from './SupplierProductOffer.entity.js';

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

  /** 식약처 공식 제품명 — immutable */
  @Column({ name: 'regulatory_name', type: 'varchar', length: 255 })
  regulatoryName: string;

  /** 마케팅용 표시명 */
  @Column({ name: 'marketing_name', type: 'varchar', length: 255 })
  marketingName: string;

  /** 브랜드명 (optional) */
  @Column({ name: 'brand_name', type: 'varchar', length: 255, nullable: true })
  brandName: string | null;

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
}
