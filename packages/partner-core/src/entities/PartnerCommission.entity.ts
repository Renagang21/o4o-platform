/**
 * PartnerCommission Entity
 *
 * 커미션 발생 단위
 *
 * 전환이 확정되면 커미션이 계산되어 기록됩니다.
 * 이 커미션은 정산 배치에 포함되어 파트너에게 지급됩니다.
 *
 * @package @o4o/partner-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Partner } from './Partner.entity.js';
import { PartnerConversion } from './PartnerConversion.entity.js';
import { PartnerSettlementBatch } from './PartnerSettlementBatch.entity.js';

/**
 * 커미션 상태
 */
export enum CommissionStatus {
  PENDING = 'pending',       // 대기중
  CONFIRMED = 'confirmed',   // 확정
  SETTLED = 'settled',       // 정산됨
  CANCELLED = 'cancelled',   // 취소됨
}

@Entity('partner_commissions')
export class PartnerCommission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 파트너 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 전환 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  conversionId!: string;

  /**
   * 정산 배치 ID (정산 후 설정)
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  settlementBatchId?: string;

  /**
   * 기준 금액 (주문 금액)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  baseAmount!: number;

  /**
   * 적용 커미션율 (%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number;

  /**
   * 커미션 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number;

  /**
   * 보너스 금액 (프로모션 등)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonusAmount!: number;

  /**
   * 최종 커미션 금액
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount!: number;

  /**
   * 커미션 상태
   */
  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status!: CommissionStatus;

  /**
   * 커미션 유형 (click, referral, bonus 등)
   */
  @Column({ type: 'varchar', length: 50, default: 'click' })
  commissionType!: string;

  /**
   * 확정 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  /**
   * 정산 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Partner, (partner) => partner.commissions)
  @JoinColumn({ name: 'partnerId' })
  partner?: Partner;

  @OneToOne(() => PartnerConversion, (conversion) => conversion.commission)
  @JoinColumn({ name: 'conversionId' })
  conversion?: PartnerConversion;

  @ManyToOne(() => PartnerSettlementBatch, (batch) => batch.commissions, {
    nullable: true,
  })
  @JoinColumn({ name: 'settlementBatchId' })
  settlementBatch?: PartnerSettlementBatch;
}
