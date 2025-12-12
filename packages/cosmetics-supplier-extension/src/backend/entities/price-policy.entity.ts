/**
 * Price Policy Entity
 *
 * 공급사의 가격 정책 관리
 * - 최소/최대 판매가
 * - 도매가
 * - 가격 위반 페널티
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PolicyScope = 'product' | 'category' | 'brand' | 'global';
export type PolicyStatus = 'draft' | 'active' | 'expired' | 'suspended';

@Entity('cosmetics_price_policies')
export class PricePolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_id' })
  @Index()
  supplierId!: string;

  @Column({ name: 'policy_name' })
  policyName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'product',
  })
  scope!: PolicyScope;

  @Column({ name: 'product_id', nullable: true })
  @Index()
  productId?: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @Column({ name: 'wholesale_price', type: 'decimal', precision: 12, scale: 2 })
  wholesalePrice!: number;

  @Column({ name: 'min_sale_price', type: 'decimal', precision: 12, scale: 2 })
  minSalePrice!: number;

  @Column({ name: 'max_sale_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxSalePrice?: number;

  @Column({ name: 'recommended_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  recommendedPrice?: number;

  @Column({ name: 'violation_penalty_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  violationPenaltyRate!: number;

  @Column({ name: 'violation_warning_threshold', type: 'int', default: 3 })
  violationWarningThreshold!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  @Index()
  status!: PolicyStatus;

  @Column({ name: 'active_from', type: 'timestamp', nullable: true })
  activeFrom?: Date;

  @Column({ name: 'active_to', type: 'timestamp', nullable: true })
  activeTo?: Date;

  @Column({ name: 'apply_to_all_sellers', type: 'boolean', default: true })
  applyToAllSellers!: boolean;

  @Column({ name: 'seller_ids', type: 'jsonb', nullable: true })
  sellerIds?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
