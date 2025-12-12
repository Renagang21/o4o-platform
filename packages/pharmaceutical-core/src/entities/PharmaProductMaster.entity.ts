/**
 * PharmaProductMaster Entity
 *
 * 의약품 원본 정보 - Dropshipping Core의 ProductMaster를 참조하되,
 * pharmaceutical-core 고유의 속성(약사법 관련)을 추가로 관리합니다.
 *
 * @package @o4o/pharmaceutical-core
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
import { PharmaOffer } from './PharmaOffer.entity.js';

/**
 * 의약품 분류
 * - OTC: 일반의약품 (Over The Counter)
 * - ETC: 전문의약품 (Ethical Drug)
 * - QUASI_DRUG: 의약외품
 */
export enum PharmaProductCategory {
  OTC = 'otc',
  ETC = 'etc',
  QUASI_DRUG = 'quasi_drug',
}

/**
 * 의약품 상태
 */
export enum PharmaProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock',
  RECALLED = 'recalled', // 의약품 전용: 리콜
}

@Entity('pharma_product_masters')
export class PharmaProductMaster {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Dropshipping Core ProductMaster ID (연결용)
   * pharmaceutical은 별도 테이블로 관리하지만, Core와 연결 가능
   */
  @Column({ type: 'uuid', nullable: true })
  coreProductMasterId?: string;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  /**
   * 의약품 표준코드 (13자리)
   */
  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  drugCode?: string;

  /**
   * 보험코드
   */
  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  insuranceCode?: string;

  /**
   * ATC 코드 (Anatomical Therapeutic Chemical code)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  atcCode?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode?: string;

  /**
   * 제조사/수입사
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  manufacturer?: string;

  /**
   * 의약품 분류
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PharmaProductCategory,
    default: PharmaProductCategory.OTC,
  })
  category!: PharmaProductCategory;

  /**
   * 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaProductStatus,
    default: PharmaProductStatus.DRAFT,
  })
  status!: PharmaProductStatus;

  /**
   * 단위 (정, 캡슐, ml, g 등)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string;

  /**
   * 포장 단위 (1박스 = 100정 등)
   */
  @Column({ type: 'int', nullable: true })
  packageSize?: number;

  /**
   * 유효기간 (개월)
   */
  @Column({ type: 'int', nullable: true })
  expiryMonths?: number;

  /**
   * 저장 조건 (냉장, 실온 등)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  storageCondition?: string;

  /**
   * 약효 분류
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  therapeuticCategory?: string;

  /**
   * 주성분
   */
  @Column({ type: 'jsonb', nullable: true })
  activeIngredients?: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;

  /**
   * 효능/효과
   */
  @Column({ type: 'text', nullable: true })
  indications?: string;

  /**
   * 용법/용량
   */
  @Column({ type: 'text', nullable: true })
  dosage?: string;

  /**
   * 주의사항
   */
  @Column({ type: 'text', nullable: true })
  warnings?: string;

  /**
   * 이미지 URL 배열
   */
  @Column({ type: 'jsonb', nullable: true })
  images?: string[];

  /**
   * 확장 속성
   */
  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => PharmaOffer, (offer) => offer.product)
  offers?: PharmaOffer[];
}
