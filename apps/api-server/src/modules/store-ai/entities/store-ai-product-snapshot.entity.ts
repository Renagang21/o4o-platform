import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * StoreAiProductSnapshot — WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1
 *
 * 상품별 KPI 스냅샷. 일별 1회 생성 (organization + product + date 유니크).
 * 각 상품의 QR 스캔, 주문, 매출, 전환율 등 성과 지표.
 */
@Entity({ name: 'store_ai_product_snapshots' })
@Unique(['organizationId', 'productId', 'snapshotDate'])
export class StoreAiProductSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  @Index()
  snapshotDate!: string;

  @Column({ name: 'period_days', type: 'int', default: 7 })
  periodDays!: number;

  @Column({ name: 'qr_scans', type: 'int', default: 0 })
  qrScans!: number;

  @Column({ name: 'orders', type: 'int', default: 0 })
  orders!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  revenue!: number;

  @Column({ name: 'conversion_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  conversionRate!: number;

  @Column({ name: 'content_views', type: 'int', default: 0 })
  contentViews!: number;

  @Column({ name: 'signage_views', type: 'int', default: 0 })
  signageViews!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
