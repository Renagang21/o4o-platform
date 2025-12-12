/**
 * Sample Supply Entity
 *
 * 샘플 공급 기록 관리
 * - 샘플 배송
 * - 사용량 추적
 * - 샘플 → 판매 전환
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SampleStatus = 'pending' | 'shipped' | 'delivered' | 'used' | 'returned' | 'expired';
export type SampleType = 'trial' | 'display' | 'tester' | 'gift' | 'promotional';

@Entity('cosmetics_sample_supply')
export class SampleSupply {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_id' })
  @Index()
  supplierId!: string;

  @Column({ name: 'store_id', nullable: true })
  @Index()
  storeId?: string;

  @Column({ name: 'partner_id', nullable: true })
  @Index()
  partnerId?: string;

  @Column({ name: 'product_id' })
  @Index()
  productId!: string;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'trial',
  })
  sampleType!: SampleType;

  @Column({ name: 'quantity_shipped', type: 'int', default: 0 })
  quantityShipped!: number;

  @Column({ name: 'quantity_used', type: 'int', default: 0 })
  quantityUsed!: number;

  @Column({ name: 'quantity_remaining', type: 'int', default: 0 })
  quantityRemaining!: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost!: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  @Index()
  status!: SampleStatus;

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber?: string;

  @Column({ name: 'shipping_carrier', nullable: true })
  shippingCarrier?: string;

  @Column({ name: 'recipient_name', nullable: true })
  recipientName?: string;

  @Column({ name: 'recipient_address', type: 'text', nullable: true })
  recipientAddress?: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone?: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date;

  @Column({ name: 'conversion_count', type: 'int', default: 0 })
  conversionCount!: number;

  @Column({ name: 'conversion_revenue', type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversionRevenue!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
