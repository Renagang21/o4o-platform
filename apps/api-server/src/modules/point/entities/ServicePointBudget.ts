import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * ServicePointBudget Entity
 *
 * WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1
 * 서비스별 포인트 예산 현황 (serviceKey당 1 row).
 */
@Entity('service_point_budgets')
@Unique(['serviceKey'])
export class ServicePointBudget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 100 })
  @Index()
  serviceKey!: string;

  @Column({ name: 'allocated_amount', type: 'integer', default: 0 })
  allocatedAmount!: number;

  @Column({ name: 'used_amount', type: 'integer', default: 0 })
  usedAmount!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  memo?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  get remainingAmount(): number {
    return this.allocatedAmount - this.usedAmount;
  }

  hasSufficientBudget(amount: number): boolean {
    return this.remainingAmount >= amount;
  }
}
