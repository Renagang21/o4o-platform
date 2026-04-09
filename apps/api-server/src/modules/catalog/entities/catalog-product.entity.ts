/**
 * CatalogProduct Entity
 *
 * WO-O4O-STORE-CATALOG-AND-STORE-PRODUCT-SCHEMA-IMPLEMENTATION-V1
 *
 * 매장들이 등록하여 공유하는 공용 상품 풀.
 * 서비스 소속이 아니라 플랫폼 공용 DB에 존재한다.
 *
 * - ProductMaster 연결은 optional (느슨한 매칭)
 * - StoreProduct는 본 엔티티에서 복사되어 매장별 독립 인스턴스로 생성됨
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
import type { ProductMaster } from '../../neture/entities/ProductMaster.entity.js';

@Entity('catalog_products')
@Index('idx_catalog_product_master_id', ['productMasterId'])
@Index('idx_catalog_regulatory_type', ['regulatoryType'])
export class CatalogProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ProductMaster 연결 (optional, 느슨한 매칭) */
  @Column({ name: 'product_master_id', type: 'uuid', nullable: true })
  productMasterId: string | null;

  @ManyToOne('ProductMaster', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_master_id' })
  productMaster?: ProductMaster | null;

  /** 공용 상품명 */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer: string | null;

  @Column({ name: 'origin_country', type: 'varchar', length: 100, nullable: true })
  originCountry: string | null;

  /** 규제 유형 (DRUG / HEALTH_FUNCTIONAL / QUASI_DRUG / COSMETIC / GENERAL 등) */
  @Column({ name: 'regulatory_type', type: 'varchar', length: 50 })
  regulatoryType: string;

  /** 공용 레벨 짧은 설명 */
  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string | null;

  /** 공용 레벨 상세 설명 */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** 등록한 매장 사용자 ID */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
