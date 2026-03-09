/**
 * NetureSettlement Entity
 *
 * WO-O4O-SETTLEMENT-SERVICE-EXTRACTION-V1
 *
 * neture_settlements 테이블 매핑.
 * 공급자별 기간별 정산 기록.
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

@Entity('neture_settlements')
@Index(['supplierId'])
@Index(['status'])
@Index(['periodStart', 'periodEnd'])
export class NetureSettlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ name: 'total_sales', type: 'int', default: 0 })
  totalSales: number;

  @Column({ name: 'platform_fee', type: 'int', default: 0 })
  platformFee: number;

  @Column({ name: 'supplier_amount', type: 'int', default: 0 })
  supplierAmount: number;

  @Column({ name: 'platform_fee_rate', type: 'numeric', precision: 5, scale: 4, default: 0.10 })
  platformFeeRate: number;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ESM mandatory: string-based relation
  @OneToMany('NetureSettlementOrder', 'settlement')
  settlementOrders: unknown[];
}
