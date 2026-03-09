/**
 * ServiceProduct Entity
 *
 * WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1
 *
 * 서비스별 제품 정책 레이어 (Preparation Layer).
 * 현재는 미래 확장을 위한 준비 테이블이며, 기존 흐름에 영향 없음.
 *
 * 미래 구조:
 *   ProductMaster → SupplierProductOffer → ServiceProduct → OrganizationProductListing
 *
 * 역할:
 *   특정 서비스(kpa, glycopharm, cosmetics 등)에서 사용 가능한 제품을 정의.
 *   서비스별 가시성, 상태 정책을 독립 관리.
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
  Unique,
} from 'typeorm';
import type { ProductMaster } from '../../../modules/neture/entities/ProductMaster.entity.js';
import type { SupplierProductOffer } from '../../../modules/neture/entities/SupplierProductOffer.entity.js';

@Entity('service_products')
@Unique('UQ_service_products_service_offer', ['service_key', 'offer_id'])
@Index('IDX_service_products_service_status', ['service_key', 'status'])
@Index('IDX_service_products_offer', ['offer_id'])
export class ServiceProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  service_key: string;

  @Column({ type: 'uuid' })
  master_id: string;

  @ManyToOne('ProductMaster')
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ type: 'uuid' })
  offer_id: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'visible' })
  visibility: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
