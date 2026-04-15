import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * CreditTransaction Entity
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Records every credit earn/spend/adjust event with dedup via reference_key.
 */

export enum TransactionType {
  EARN = 'earn',
  SPEND = 'spend',
  ADJUST = 'adjust',
}

export enum CreditSourceType {
  LESSON_COMPLETE = 'lesson_complete',
  QUIZ_PASS = 'quiz_pass',
  COURSE_COMPLETE = 'course_complete',
}

@Entity('credit_transactions')
@Index(['userId', 'createdAt'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 20, default: TransactionType.EARN })
  transactionType!: TransactionType;

  @Column({ type: 'varchar', length: 50 })
  sourceType!: CreditSourceType;

  @Column({ type: 'uuid', nullable: true })
  sourceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  referenceKey?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
