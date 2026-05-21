import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum BudgetTxType {
  ALLOCATE = 'allocate',
  DEDUCT = 'deduct',
}

/**
 * ServicePointBudgetTransaction Entity
 *
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 * 예산 입금(allocate) / 차감(deduct) 이력.
 * referenceKey UNIQUE — 중복 차감 방지 (dedup).
 */
@Entity('service_point_budget_transactions')
export class ServicePointBudgetTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 100 })
  @Index()
  serviceKey!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ name: 'tx_type', type: 'varchar', length: 20 })
  txType!: BudgetTxType;

  @Column({ name: 'reference_key', type: 'varchar', length: 255, nullable: true })
  @Unique(['referenceKey'])
  referenceKey?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ name: 'operator_id', type: 'uuid', nullable: true })
  operatorId?: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}
