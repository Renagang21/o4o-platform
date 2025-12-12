/**
 * PartnerEarnings Entity
 *
 * 파트너 수익 관리
 * - 수익 유형 (커미션, 보너스 등)
 * - 금액 및 상태
 * - 주문 ID 연결
 * - 정산 정보
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
export type EarningsStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

@Entity('cosmetics_partner_earnings')
@Index(['partnerId'])
@Index(['earningsType'])
@Index(['status'])
@Index(['orderId'])
@Index(['createdAt'])
export class PartnerEarnings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 50 })
  earningsType!: EarningsType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: EarningsStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  routineId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
