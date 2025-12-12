/**
 * Sample Inventory Entity
 *
 * 샘플 재고 관리
 * - 매장별 샘플 입고/사용 추적
 * - 재고 자동 보충 알림
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SampleType = 'trial' | 'tester' | 'display' | 'gift' | 'promotional';
export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'pending_refill';

@Entity('cosmetics_sample_inventory')
@Index(['storeId', 'productId'], { unique: true })
export class SampleInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'varchar', length: 50, default: 'trial' })
  sampleType!: SampleType;

  @Column({ type: 'int', default: 0 })
  quantityReceived!: number;

  @Column({ type: 'int', default: 0 })
  quantityUsed!: number;

  @Column({ type: 'int', default: 0 })
  quantityRemaining!: number;

  @Column({ type: 'int', default: 10 })
  minimumStock!: number;

  @Column({ type: 'varchar', length: 50, default: 'in_stock' })
  status!: InventoryStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastRefilledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
