/**
 * SettlementBatch Entity
 *
 * 정산 배치 관리
 *
 * 특정 기간 동안의 주문/수수료를 묶어서 정산하는 단위입니다.
 * contextType을 통해 판매자/공급자/파트너/약국 등 다양한 정산 유형을 지원합니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CommissionTransaction } from './CommissionTransaction.entity.js';
import { Seller } from './Seller.entity.js';

export enum SettlementBatchStatus {
  OPEN = 'open',           // 진행중 (거래 추가 가능)
  CLOSED = 'closed',       // 마감 (정산 대기)
  PAID = 'paid',           // 지급 완료
}

/**
 * SettlementContextType - 정산 컨텍스트 유형
 *
 * 확장앱(Partner, Pharmacy 등)이 자체 정산 방식을 구현할 수 있도록
 * contextType을 통해 정산 유형을 구분합니다.
 */
export type SettlementContextType =
  | 'seller'      // 판매자 정산 (기본)
  | 'supplier'    // 공급자 정산
  | 'partner'     // 파트너 정산
  | 'pharmacy'    // 약국 정산
  | string;       // 확장 가능

@Entity('dropshipping_settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 정산 컨텍스트 유형
   *
   * Core는 이 값을 단순 문자열로만 저장/조회하며, 비즈니스 로직은 처리하지 않음.
   * 확장앱이 Settlement Hook을 통해 contextType별 정산 규칙을 적용함.
   */
  @Index()
  @Column({ type: 'varchar', length: 50, default: 'seller' })
  contextType!: SettlementContextType;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string; // 판매자 ID (contextType === 'seller')

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string; // 공급자 ID (contextType === 'supplier')

  @Column({ type: 'uuid', nullable: true })
  partnerId?: string; // 파트너 ID (contextType === 'partner')

  @Column({ type: 'varchar', length: 255 })
  batchNumber!: string; // 정산 배치 번호

  @Column({ type: 'date' })
  periodStart!: Date; // 정산 기간 시작

  @Column({ type: 'date' })
  periodEnd!: Date; // 정산 기간 종료

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number; // 총 주문 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount!: number; // 총 수수료

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount!: number; // 정산 금액 (총 주문 금액 - 수수료)

  @Column({
    type: 'enum',
    enum: SettlementBatchStatus,
    default: SettlementBatchStatus.OPEN,
  })
  status!: SettlementBatchStatus;

  @Column({ type: 'timestamp', nullable: true })
  closedAt?: Date; // 마감 시점

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date; // 지급 시점

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Seller, { nullable: true })
  @JoinColumn({ name: 'sellerId' })
  seller?: Seller;

  @OneToMany(() => CommissionTransaction, (transaction) => transaction.settlementBatch)
  commissionTransactions?: CommissionTransaction[];
}
