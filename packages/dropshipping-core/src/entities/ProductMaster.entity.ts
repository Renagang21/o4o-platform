/**
 * ProductMaster Entity
 *
 * S2S 구조에서 상품 정보의 Source of Truth
 *
 * ## 소유권 기준 (S2S 핵심 원칙)
 * - ProductMaster는 Supplier(공급자)가 소유
 * - Supplier가 상품의 이름, 설명, SKU, 브랜드, 카테고리 등 원본 정보를 관리
 * - Seller는 이 정보를 직접 수정할 수 없음
 *
 * ## 데이터 흐름
 * ProductMaster (Supplier 소유)
 *   → SupplierProductOffer (Supplier가 제시하는 공급 조건)
 *     → SellerListing (Seller가 자신의 채널에 등록한 파생 데이터)
 *
 * ## 확장성
 * - attributes(JSON)으로 산업별 특화 정보 저장
 * - productType으로 산업 구분 (cosmetics, pharmaceutical, general 등)
 * - Extension이 Validation Hook을 통해 산업별 규칙 적용
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
 * ProductType - 산업별 상품 타입 (정식 Enum)
 *
 * ## S2S 관점
 * - Core는 이 값의 비즈니스 의미를 해석하지 않음 (단순 분류자)
 * - 각 서비스의 Extension/Core가 Hook을 통해 타입별 규칙 적용
 *
 * ## 현재 정의된 타입 (역사적 결정, 추후 일반화 대상)
 * - GENERAL: 일반 상품 (기본값)
 * - COSMETICS: 화장품 → dropshipping-cosmetics Extension
 * - FOOD: 식품
 * - HEALTH: 건강기능식품
 * - ELECTRONICS: 전자제품
 * - PHARMACEUTICAL: 의약품 → pharmaceutical-core (규제 도메인)
 * - CUSTOM: 확장앱이 정의하는 커스텀 타입
 *
 * ## 비고
 * - 하드코딩된 타입은 역사적 결정으로 유지
 * - 신규 타입 추가 시 Extension 패턴 권장
 */
export enum ProductType {
  GENERAL = 'general',
  COSMETICS = 'cosmetics',
  FOOD = 'food',
  HEALTH = 'health',
  ELECTRONICS = 'electronics',
  PHARMACEUTICAL = 'pharmaceutical',
  CUSTOM = 'custom',
}

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
  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.GENERAL,
  })
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
