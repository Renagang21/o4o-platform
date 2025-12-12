/**
 * PartnerEarnings Entity
 *
 * 파트너 수익 관리
 * - 수익 유형 (커미션, 보너스 등)
 * - 금액 및 상태
 * - 주문 ID 연결
 * - 정산 정보
 * - Commission Policy 연동 (Phase 6-D)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EarningsType = 'commission' | 'bonus' | 'referral' | 'campaign' | 'sale';
export type EarningsStatus = 'pending' | 'available' | 'paid' | 'cancelled' | 'withdrawn';
export type EventType = 'CLICK' | 'CONVERSION' | 'SALE';

@Entity('cosmetics_partner_earnings')
@Index(['partnerId'])
@Index(['earningsType'])
@Index(['status'])
@Index(['orderId'])
@Index(['eventType'])
@Index(['createdAt'])
export class PartnerEarnings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  partnerId!: string;

  @Column({ type: 'varchar', length: 50 })
  earningsType!: EarningsType;

  /**
   * 이벤트 유형: CLICK, CONVERSION, SALE
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  eventType?: EventType;

  /**
   * 이벤트 값 (구매액, 클릭 가치 등)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  eventValue!: number;

  /**
   * 계산된 커미션 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  /**
   * 적용된 커미션 정책 ID
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  commissionPolicyId?: string;

  /**
   * 트랜잭션 ID (외부 결제/주문 시스템 연동용)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: EarningsStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  routineId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 인출 요청일
   */
  @Column({ type: 'timestamp', nullable: true })
  withdrawnAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
