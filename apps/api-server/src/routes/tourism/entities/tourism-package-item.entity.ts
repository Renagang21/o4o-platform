/**
 * Tourism Package Item Entity
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * 패키지에 포함된 상품(Dropshipping 참조)을 관리하는 엔티티
 * - Tourism은 상품을 소유하지 않음
 * - Dropshipping 상품 ID를 참조만 함 (Soft FK)
 * - 가격/재고/출고 책임은 Dropshipping/Core
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
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
import type { TourismPackage } from './tourism-package.entity.js';

/**
 * 아이템 유형
 */
export enum PackageItemType {
  PRODUCT = 'product',       // Dropshipping 상품
  SERVICE = 'service',       // 서비스 (가이드, 입장권 등)
  TRANSPORT = 'transport',   // 교통
  ACCOMMODATION = 'accommodation', // 숙박
}

@Entity('tourism_package_items')
export class TourismPackageItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 연결된 패키지 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  packageId!: string;

  /**
   * 아이템 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PackageItemType,
    default: PackageItemType.PRODUCT,
  })
  type!: PackageItemType;

  /**
   * Dropshipping 상품 ID (참조만, FK 아님)
   *
   * @note Tourism은 상품을 소유하지 않음
   * @note Dropshipping dropshipping_product_masters.id 참조
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  dropshippingProductId?: string;

  /**
   * 아이템 이름 (표시용)
   */
  @Column({ type: 'varchar', length: 300 })
  name!: string;

  /**
   * 아이템 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 수량 (패키지당 기본 포함 수량)
   */
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  /**
   * 선택 옵션 여부
   */
  @Column({ type: 'boolean', default: false })
  isOptional!: boolean;

  /**
   * 추가 금액 (선택 옵션일 경우)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  additionalPrice?: number;

  /**
   * 정렬 순서
   */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations (String-based for ESM compatibility - CLAUDE.md §4.1)
  @ManyToOne('TourismPackage', 'items')
  @JoinColumn({ name: 'packageId' })
  package?: TourismPackage;
}
