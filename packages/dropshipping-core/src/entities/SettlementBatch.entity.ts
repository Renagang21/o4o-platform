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
  PROCESSING = 'processing', // 처리 중
  PAID = 'paid',           // 지급 완료
  FAILED = 'failed',       // 실패
}

/**
 * SettlementType - 정산 유형 (정식 Enum)
 *
 * Core에서 지원하는 기본 정산 유형.
 * 확장앱(Partner, Pharmacy 등)은 'platform-extension'을 사용하여
 * 자체 정산 방식을 구현합니다.
 *
 * - SELLER: 판매자(Seller) 정산
 * - SUPPLIER: 공급자(Supplier) 정산
 * - PLATFORM_EXTENSION: 플랫폼 확장앱 정산 (Partner, Pharmacy 등)
 */
export enum SettlementType {
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  PLATFORM_EXTENSION = 'platform-extension',
}

/**
 * @deprecated Use SettlementType enum instead
 */
export type SettlementContextType =
  | 'seller'
  | 'supplier'
  | 'partner'
  | 'pharmacy'
  | 'platform-extension'
  | string;

@Entity('dropshipping_settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 정산 유형 (정식 Enum)
   *
   * Core의 정산 유형을 정의합니다.
   * 확장앱(Partner, Pharmacy 등)은 PLATFORM_EXTENSION 사용.
   */
  @Index()
  @Column({
    type: 'enum',
    enum: SettlementType,
    default: SettlementType.SELLER,
  })
  settlementType!: SettlementType;

  /**
   * @deprecated Use settlementType instead
   */
  @Index()
  @Column({ type: 'varchar', length: 50, default: 'seller' })
  contextType!: SettlementContextType;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string; // 판매자 ID (settlementType === SELLER)

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string; // 공급자 ID (settlementType === SUPPLIER)

  @Column({ type: 'uuid', nullable: true })
  partnerId?: string; // 확장앱 ID (settlementType === PLATFORM_EXTENSION)

  /**
   * 확장앱 타입 (platform-extension인 경우)
   * 예: 'partner', 'pharmacy', etc.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  extensionType?: string;

  @Column({ type: 'varchar', length: 255 })
  batchNumber!: string; // 정산 배치 번호

  @Column({ type: 'date' })
  periodStart!: Date; // 정산 기간 시작

  @Column({ type: 'date' })
  periodEnd!: Date; // 정산 기간 종료

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number; // 총 주문 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount!: number; // 총 수수료 (플랫폼 수수료)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductionAmount!: number; // 차감 금액 (환불, 취소 등)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount!: number; // 순 정산 금액 (totalAmount - commissionAmount - deductionAmount)

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
