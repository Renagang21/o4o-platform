/**
 * PartnerEarnings Entity
 *
 * 파트너 수익 관리
 * - 판매 커미션
 * - 보너스/보상
 * - 정산 상태 추적
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EarningsType = 'commission' | 'bonus' | 'referral' | 'campaign';
export type EarningsStatus = 'pending' | 'available' | 'withdrawn' | 'cancelled';

@Entity('cosmetics_partner_earnings')
@Index(['partnerId'])
@Index(['status'])
@Index(['earningsType'])
@Index(['createdAt'])
@Index(['partnerId', 'status'])
export class PartnerEarnings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 20 })
  earningsType!: EarningsType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: EarningsStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceType?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  orderAmount?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  availableAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  withdrawnAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  withdrawalTransactionId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
