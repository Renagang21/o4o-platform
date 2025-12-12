/**
 * PharmaSettlementBatch Entity
 *
 * 의약품 B2B 정산 배치
 *
 * 도매상/제조사와 약국 간의 거래를 기간별로 묶어서 정산합니다.
 * Dropshipping의 SettlementBatch와 유사하지만, pharmacy contextType에 특화됩니다.
 *
 * @package @o4o/pharmaceutical-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 정산 배치 상태
 */
export enum PharmaSettlementStatus {
  OPEN = 'open',         // 진행중 (주문 추가 가능)
  CLOSED = 'closed',     // 마감 (정산 대기)
  PENDING_PAYMENT = 'pending_payment', // 결제 대기
  PAID = 'paid',         // 지급 완료
  DISPUTED = 'disputed', // 이의 제기
}

/**
 * 정산 유형
 */
export enum PharmaSettlementType {
  PHARMACY = 'pharmacy',       // 약국 정산 (약국 → 플랫폼)
  SUPPLIER = 'supplier',       // 공급자 정산 (플랫폼 → 도매상/제조사)
}

@Entity('pharma_settlement_batches')
export class PharmaSettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 정산 유형
   */
  @Index()
  @Column({
    type: 'enum',
    enum: PharmaSettlementType,
    default: PharmaSettlementType.PHARMACY,
  })
  settlementType!: PharmaSettlementType;

  /**
   * 정산 대상 ID (약국 ID 또는 공급자 ID)
   */
  @Index()
  @Column({ type: 'uuid' })
  targetId!: string;

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
   * 총 주문 건수
   */
  @Column({ type: 'int', default: 0 })
  orderCount!: number;

  /**
   * 총 주문 금액
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalOrderAmount!: number;

  /**
   * 총 할인 금액
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalDiscountAmount!: number;

  /**
   * 플랫폼 수수료
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformFee!: number;

  /**
   * 순 정산 금액
   */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  netAmount!: number;

  /**
   * 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaSettlementStatus,
    default: PharmaSettlementStatus.OPEN,
  })
  status!: PharmaSettlementStatus;

  /**
   * 마감 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date;

  /**
   * 결제 예정일
   */
  @Column({ type: 'date', nullable: true })
  paymentDueDate?: Date;

  /**
   * 결제 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  /**
   * 결제 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  paymentInfo?: {
    method?: string;       // 결제 방법 (계좌이체, 신용카드 등)
    accountNumber?: string; // 입금 계좌
    bankName?: string;
    reference?: string;    // 결제 참조 번호
  };

  /**
   * 포함된 주문 ID 목록
   */
  @Column({ type: 'jsonb', nullable: true })
  orderIds?: string[];

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
}
