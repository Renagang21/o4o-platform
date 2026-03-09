import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * StoreAiSnapshot — WO-O4O-STORE-HUB-AI-SUMMARY-V1
 *
 * 매장 KPI 스냅샷. 일별 1회 생성 (organization + date 유니크).
 * data JSONB에 주문/QR/상품/채널 집계 저장.
 */
@Entity({ name: 'store_ai_snapshots' })
@Unique(['organizationId', 'snapshotDate'])
export class StoreAiSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  @Index()
  snapshotDate!: string;

  @Column({ name: 'period_days', type: 'int', default: 7 })
  periodDays!: number;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
