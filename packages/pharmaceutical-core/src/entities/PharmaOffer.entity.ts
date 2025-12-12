/**
 * PharmaOffer Entity
 *
 * 의약품 도매상/제조사가 약국에 제시하는 공급 조건
 *
 * Dropshipping의 SupplierProductOffer와 유사하지만,
 * pharmaceutical은 Listing이 없고 직접 B2B 거래만 지원합니다.
 *
 * @package @o4o/pharmaceutical-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PharmaProductMaster } from './PharmaProductMaster.entity.js';
import { PharmaOrder } from './PharmaOrder.entity.js';

/**
 * Offer 상태
 */
export enum PharmaOfferStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
}

/**
 * 공급자 유형 (의약품 도매상/제조사만 가능)
 */
export enum PharmaSupplierType {
  WHOLESALER = 'wholesaler',     // 도매상
  MANUFACTURER = 'manufacturer', // 제조사
}

@Entity('pharma_offers')
export class PharmaOffer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 의약품 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  /**
   * 공급자 ID (도매상/제조사)
   */
  @Index()
  @Column({ type: 'uuid' })
  supplierId!: string;

  /**
   * 공급자 유형
   */
  @Column({
    type: 'enum',
    enum: PharmaSupplierType,
    default: PharmaSupplierType.WHOLESALER,
  })
  supplierType!: PharmaSupplierType;

  /**
   * 공급가 (박스당)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  supplierPrice!: number;

  /**
   * 보험청구가 (적용 시)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  insurancePrice?: number;

  /**
   * 재고 수량
   */
  @Column({ type: 'int', default: 0 })
  stockQuantity!: number;

  /**
   * 최소 주문 수량
   */
  @Column({ type: 'int', default: 1 })
  minOrderQuantity!: number;

  /**
   * 최대 주문 수량 (일일 한도)
   */
  @Column({ type: 'int', nullable: true })
  maxOrderQuantity?: number;

  /**
   * 할인율 (%) - 대량 구매 시
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bulkDiscountRate?: number;

  /**
   * 대량 구매 기준 수량
   */
  @Column({ type: 'int', nullable: true })
  bulkDiscountThreshold?: number;

  /**
   * 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaOfferStatus,
    default: PharmaOfferStatus.ACTIVE,
  })
  status!: PharmaOfferStatus;

  /**
   * 배송 리드타임 (영업일)
   */
  @Column({ type: 'int', default: 1 })
  leadTimeDays!: number;

  /**
   * 배송 옵션
   */
  @Column({ type: 'jsonb', nullable: true })
  shippingOptions?: {
    sameDay?: boolean;      // 당일 배송
    nextDay?: boolean;      // 익일 배송
    coldChain?: boolean;    // 냉장 배송
  };

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
  @ManyToOne(() => PharmaProductMaster, (product) => product.offers)
  @JoinColumn({ name: 'productId' })
  product?: PharmaProductMaster;

  @OneToMany(() => PharmaOrder, (order) => order.offer)
  orders?: PharmaOrder[];
}
