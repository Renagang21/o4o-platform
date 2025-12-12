/**
 * PartnerConversion Entity
 *
 * 전환(Click → Order) 기록
 *
 * 파트너 링크를 통한 클릭이 실제 주문으로 이어진 경우를 기록합니다.
 * 이 데이터를 기반으로 커미션이 계산됩니다.
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
import { PartnerClick } from './PartnerClick.entity.js';
import { PartnerCommission } from './PartnerCommission.entity.js';

/**
 * 전환 상태
 */
export enum ConversionStatus {
  PENDING = 'pending',       // 대기중 (주문 확정 전)
  CONFIRMED = 'confirmed',   // 확정 (주문 완료)
  CANCELLED = 'cancelled',   // 취소됨
  REFUNDED = 'refunded',     // 환불됨
}

@Entity('partner_conversions')
export class PartnerConversion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 파트너 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 클릭 ID (선택적 - 직접 전환인 경우 없을 수 있음)
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  clickId?: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'varchar', length: 255 })
  orderId!: string;

  /**
   * 주문 번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  orderNumber?: string;

  /**
   * 제품 유형
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  productType?: string;

  /**
   * 주문 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  orderAmount!: number;

  /**
   * 커미션 금액 (계산됨)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionAmount!: number;

  /**
   * 전환 상태
   */
  @Column({
    type: 'enum',
    enum: ConversionStatus,
    default: ConversionStatus.PENDING,
  })
  status!: ConversionStatus;

  /**
   * 귀속 기간 (클릭 후 며칠 내 전환인지)
   */
  @Column({ type: 'int', nullable: true })
  attributionDays?: number;

  /**
   * 확정 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  /**
   * 취소 사유
   */
  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Partner, (partner) => partner.conversions)
  @JoinColumn({ name: 'partnerId' })
  partner?: Partner;

  @OneToOne(() => PartnerClick, (click) => click.conversion, { nullable: true })
  @JoinColumn({ name: 'clickId' })
  click?: PartnerClick;

  @OneToOne(() => PartnerCommission, (commission) => commission.conversion)
  commission?: PartnerCommission;
}
