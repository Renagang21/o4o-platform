/**
 * SellerInventory Entity
 *
 * 매장 재고 관리
 * - 제품별 재고 수량
 * - 재주문 기준 수량
 * - 재고 조정 이력
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AdjustmentReason = 'sale' | 'return' | 'damage' | 'restock' | 'audit' | 'other';

export interface StockAdjustment {
  date: string;
  previousQuantity: number;
  newQuantity: number;
  reason: AdjustmentReason;
  notes?: string;
  adjustedBy?: string;
}

@Entity('cosmetics_seller_inventory')
@Index(['sellerId', 'productId'], { unique: true })
@Index(['sellerId'])
@Index(['quantity'])
export class SellerInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  sellerId!: string;

  @Column({ type: 'varchar', length: 255 })
  productId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ type: 'int', default: 5 })
  reorderLevel!: number;

  @Column({ type: 'int', nullable: true })
  maxStockLevel?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestockedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAuditedAt?: Date;

  @Column({ type: 'jsonb', default: [] })
  adjustmentHistory!: StockAdjustment[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
