/**
 * PlatformPayment Entity
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * PaymentProps 인터페이스를 구현하는 TypeORM Entity.
 * 테이블: o4o_payments
 *
 * payment-core는 PaymentProps (plain interface)만 정의.
 * 이 Entity가 DB 레이어를 제공.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('o4o_payments')
export class PlatformPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'KRW' })
  currency!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  transactionId!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  orderId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentKey!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  paidAmount!: number | null;

  @Column({ type: 'timestamp' })
  requestedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  failedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  sourceService!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
