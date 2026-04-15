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
 * CreditBalance Entity
 *
 * WO-O4O-CREDIT-SYSTEM-V1
 * Stores per-user Neture Credit balance.
 */
@Entity('credit_balances')
@Unique(['userId'])
export class CreditBalance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'integer', default: 0 })
  balance!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
