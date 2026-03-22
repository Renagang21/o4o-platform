import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';

/**
 * AiBillingSummary — WO-O4O-AI-BILLING-DATA-SYSTEM-V1
 *
 * 월별 AI 서비스 정산 데이터.
 * ai_usage_aggregate 기반 스냅샷 → draft → confirmed → paid.
 */
@Entity({ name: 'ai_billing_summary' })
@Unique(['period', 'serviceKey'])
@Index(['status'])
@Index(['period'])
export class AiBillingSummary {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 7 })
  period!: string; // YYYY-MM

  @Column({ name: 'service_key', type: 'varchar', length: 20 })
  serviceKey!: string; // care / store / proxy

  @Column({ name: 'total_requests', type: 'int', default: 0 })
  totalRequests!: number;

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens!: number;

  @Column({ name: 'total_cost', type: 'numeric', precision: 15, scale: 4, default: 0 })
  totalCost!: number;

  @Column({ name: 'adjustment_amount', type: 'numeric', precision: 15, scale: 4, default: 0 })
  adjustmentAmount!: number;

  @Column({ name: 'final_cost', type: 'numeric', precision: 15, scale: 4, default: 0 })
  finalCost!: number;

  @Column({ type: 'varchar', length: 10, default: 'draft' })
  status!: string; // draft | confirmed | paid

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'generated_at', type: 'timestamptz', default: () => 'NOW()' })
  generatedAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date;
}
