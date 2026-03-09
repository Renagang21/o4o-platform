/**
 * NetureSettlementOrder Entity
 *
 * WO-O4O-SETTLEMENT-SERVICE-EXTRACTION-V1
 *
 * neture_settlement_orders 테이블 매핑.
 * 정산-주문 연결 (중복 정산 방지).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('neture_settlement_orders')
@Index(['settlementId'])
export class NetureSettlementOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'settlement_id', type: 'uuid' })
  settlementId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'supplier_sales_amount', type: 'int', default: 0 })
  supplierSalesAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ESM mandatory: string-based relation
  @ManyToOne('NetureSettlement', 'settlementOrders')
  @JoinColumn({ name: 'settlement_id' })
  settlement: unknown;
}
