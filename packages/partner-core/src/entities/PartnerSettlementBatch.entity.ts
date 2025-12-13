/**
 * PartnerSettlementBatch Entity
 *
 * 파트너 정산 배치
 *
 * 특정 기간 동안의 확정된 커미션을 묶어서 정산하는 단위입니다.
 *
 * @package @o4o/partner-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Partner } from './Partner.entity.js';
import { PartnerCommission } from './PartnerCommission.entity.js';

/**
 * 정산 배치 상태
 */
export enum SettlementBatchStatus {
  OPEN = 'open',           // 진행중 (커미션 추가 가능)
  CLOSED = 'closed',       // 마감 (정산 대기)
  PROCESSING = 'processing', // 처리중
  PAID = 'paid',           // 지급 완료
  FAILED = 'failed',       // 지급 실패
}

@Entity('partner_settlement_batches')
export class PartnerSettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 파트너 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 정산 배치 번호
   */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  batchNumber!: string;

  /**
   * 정산 기간 시작
   */
  @Column({ type: 'date' })
  periodStart!: Date;

  /**
   * 정산 기간 종료
   */
  @Column({ type: 'date' })
  periodEnd!: Date;

  /**
   * 총 전환 수
   */
  @Column({ type: 'int', default: 0 })
  conversionCount!: number;

  /**
   * 총 커미션 금액
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCommissionAmount!: number;

  /**
   * 공제 금액 (세금 등)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductionAmount!: number;

  /**
   * 최종 정산 금액
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  netAmount!: number;

  /**
   * 정산 배치 상태
   */
  @Column({
    type: 'enum',
    enum: SettlementBatchStatus,
    default: SettlementBatchStatus.OPEN,
  })
  status!: SettlementBatchStatus;

  /**
   * 마감 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;

  /**
   * 지급 예정일
   */
  @Column({ type: 'date', nullable: true })
  paymentDueDate?: Date;

  /**
   * 지급 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 지급 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  paymentInfo?: {
    method?: string;           // 지급 방법 (계좌이체, 페이팔 등)
    accountNumber?: string;    // 입금 계좌
    bankName?: string;
    reference?: string;        // 거래 참조 번호
    transactionId?: string;    // 거래 ID
  };

  /**
   * 실패 사유
   */
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /**
   * 메모
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Partner, (partner) => partner.settlementBatches)
  @JoinColumn({ name: 'partnerId' })
  partner?: Partner;

  @OneToMany(() => PartnerCommission, (commission) => commission.settlementBatch)
  commissions?: PartnerCommission[];
}
