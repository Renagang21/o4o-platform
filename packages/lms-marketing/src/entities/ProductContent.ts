/**
 * ProductContent Entity
 *
 * ContentBundle(type=PRODUCT) 실행 래퍼
 * 공급자 제품 콘텐츠를 타겟에게 전달하기 위한 마케팅 컨텍스트
 *
 * 원칙:
 * - Core ContentBundle ID만 참조 (재정의 금지)
 * - 타겟팅/발행 컨텍스트만 관리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProductContentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export interface ProductTargeting {
  targets: ('seller' | 'consumer' | 'pharmacist' | 'all')[];
  regions?: string[];
  categories?: string[];
}

@Entity('lms_marketing_product_contents')
@Index(['supplierId'])
@Index(['bundleId'])
@Index(['status'])
export class ProductContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 공급자 ID */
  @Column({ type: 'uuid' })
  supplierId!: string;

  /** Core ContentBundle ID 참조 (type=PRODUCT) */
  @Column({ type: 'uuid' })
  bundleId!: string;

  /** 제품명 (빠른 참조용) */
  @Column({ type: 'varchar', length: 500 })
  title!: string;

  /** SKU */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  /** 브랜드 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  brand?: string;

  /** 카테고리 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  category?: string;

  /** 상태 */
  @Column({
    type: 'enum',
    enum: ProductContentStatus,
    default: ProductContentStatus.DRAFT,
  })
  status!: ProductContentStatus;

  /** 발행 여부 */
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  /** 타겟팅 설정 */
  @Column({ type: 'jsonb', default: { targets: ['all'] } })
  targeting!: ProductTargeting;

  /** 메타데이터 */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  /** 발행 일시 */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  // Helper Methods

  publish(): void {
    this.isPublished = true;
    this.status = ProductContentStatus.ACTIVE;
    this.publishedAt = new Date();
  }

  pause(): void {
    this.status = ProductContentStatus.PAUSED;
  }

  archive(): void {
    this.status = ProductContentStatus.ARCHIVED;
    this.isPublished = false;
  }
}
