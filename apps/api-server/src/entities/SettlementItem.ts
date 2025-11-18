import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Settlement } from './Settlement.js';
import type { Order } from './Order.js';

/**
 * SettlementItem Entity
 * Phase PD-5: Dropshipping Settlement System
 *
 * Represents individual order items included in a settlement
 * Links settlements to specific orders and order items
 */

@Entity('settlement_items')
@Index(['settlementId'])
@Index(['orderId'])
@Index(['orderItemId'])
export class SettlementItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Settlement relation
  @Column({ type: 'uuid' })
  settlementId: string;

  @ManyToOne(() => Settlement, (settlement) => settlement.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'settlementId' })
  settlement: Settlement;

  // Order relation
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne('Order', { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @Column({ type: 'uuid' })
  orderItemId: string; // ID from OrderItem (stored in JSONB)

  // Product information (snapshot at order time)
  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'integer' })
  quantity: number;

  // Pricing snapshots (from OrderItem at order creation time)
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  salePriceSnapshot: string; // 판매가 per unit

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  basePriceSnapshot?: string; // 공급가 per unit

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  commissionAmountSnapshot?: string; // 커미션 total

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  marginAmountSnapshot?: string; // 마진 total

  // Phase SETTLE-1: PD-2 Commission Policy Integration
  @Column({
    type: 'enum',
    enum: ['rate', 'fixed'],
    nullable: true
  })
  commissionType?: 'rate' | 'fixed'; // Commission calculation method

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  commissionRate?: string; // Commission rate (0-1, e.g., 0.20 = 20%) for rate type

  // Calculated totals
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalSaleAmount: string; // salePriceSnapshot * quantity

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  totalBaseAmount?: string; // basePriceSnapshot * quantity

  // Party IDs (for reference)
  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
