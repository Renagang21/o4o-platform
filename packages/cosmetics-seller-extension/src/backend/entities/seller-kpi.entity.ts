/**
 * SellerKPI Entity
 *
 * 판매원 KPI 관리
 * - 일별/주별/월별 성과 지표
 * - 상담 수, 전환율, 매출
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type KPIPeriodType = 'daily' | 'weekly' | 'monthly';

@Entity('cosmetics_seller_kpi')
@Index(['sellerId', 'date', 'periodType'], { unique: true })
@Index(['sellerId'])
@Index(['date'])
@Index(['periodType'])
export class SellerKPI {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  sellerId!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 20, default: 'daily' })
  periodType!: KPIPeriodType;

  // 상담 지표
  @Column({ type: 'int', default: 0 })
  consultations!: number;

  @Column({ type: 'int', default: 0 })
  conversions!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  // 샘플 지표
  @Column({ type: 'int', default: 0 })
  samplesGiven!: number;

  @Column({ type: 'int', default: 0 })
  sampleConversions!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  sampleToPurchaseRate!: number;

  // 매출 지표
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSales!: number;

  @Column({ type: 'int', default: 0 })
  totalTransactions!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageTransactionValue!: number;

  // 진열 지표
  @Column({ type: 'int', default: 0 })
  displayUpdates!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  displayComplianceScore?: number;

  // 추가 메트릭
  @Column({ type: 'jsonb', nullable: true })
  topSellingProducts?: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    revenue: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
