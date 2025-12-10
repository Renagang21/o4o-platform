/**
 * SettlementBatch Entity
 *
 * 정산 배치 관리
 *
 * 특정 기간 동안의 주문/수수료를 묶어서 정산하는 단위입니다.
 * 판매자(Seller)별로 정산 배치가 생성됩니다.
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
} from 'typeorm';
import { CommissionTransaction } from './CommissionTransaction.entity.js';
import { Seller } from './Seller.entity.js';

export enum SettlementBatchStatus {
  OPEN = 'open',           // 진행중 (거래 추가 가능)
  CLOSED = 'closed',       // 마감 (정산 대기)
  PAID = 'paid',           // 지급 완료
}

@Entity('dropshipping_settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sellerId!: string; // 판매자 ID

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
  @ManyToOne(() => Seller)
  @JoinColumn({ name: 'sellerId' })
  seller?: Seller;

  @OneToMany(() => CommissionTransaction, (transaction) => transaction.settlementBatch)
  commissionTransactions?: CommissionTransaction[];
}
