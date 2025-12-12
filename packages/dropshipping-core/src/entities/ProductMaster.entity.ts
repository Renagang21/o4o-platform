/**
 * ProductMaster Entity
 *
 * 산업 중립적 상품 원본 정보
 * attributes(JSON)으로 확장성 확보
 *
 * 모든 산업(화장품, 건강식품, 관광, 일반 상품 등)의 공통 상품 메타데이터를 저장합니다.
 * 산업별 특화 정보는 attributes 필드에 JSON으로 저장하여 확장성을 보장합니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SupplierProductOffer } from './SupplierProductOffer.entity.js';

export enum ProductStatus {
  DRAFT = 'draft',           // 작성 중
  ACTIVE = 'active',         // 활성 상태
  DISCONTINUED = 'discontinued', // 단종
  OUT_OF_STOCK = 'out_of_stock', // 품절
}

/**
 * ProductType - 산업별 상품 타입
 *
 * Core는 이 값의 비즈니스 의미를 해석하지 않음.
 * 확장앱(Cosmetics, Pharmacy, Tourism 등)이 Hook을 통해 각 타입별 로직을 처리.
 *
 * 예시:
 * - "general": 일반 상품
 * - "cosmetics": 화장품
 * - "food": 식품
 * - "pharmaceutical": 의약품
 * - "tourism": 관광 상품
 * - "partner": 파트너 상품
 */
export type ProductType =
  | 'general'
  | 'cosmetics'
  | 'food'
  | 'pharmaceutical'
  | 'tourism'
  | 'partner'
  | string; // 확장 가능

@Entity('dropshipping_product_masters')
export class ProductMaster {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string; // Stock Keeping Unit

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  /**
   * 산업별 상품 타입
   *
   * Core는 이 값을 단순 문자열로만 저장/조회하며, 비즈니스 로직은 처리하지 않음.
   * 확장앱이 Validation Hook을 통해 productType별 규칙을 적용함.
   */
  @Index()
  @Column({ type: 'varchar', length: 50, default: 'general' })
  productType!: ProductType;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @Column({ type: 'jsonb', nullable: true })
  images?: string[]; // 이미지 URL 배열

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>; // 산업별 확장 속성 (화장품: 성분, 용량 / 건강식품: 영양정보 / 관광: 일정 등)

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => SupplierProductOffer, (offer) => offer.productMaster)
  offers?: SupplierProductOffer[];
}
