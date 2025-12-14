/**
 * MarketTrial Entity
 *
 * Represents a supplier's product trial campaign that sellers/partners can fund.
 * Phase 1: Entity definition only (minimal fields).
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
 * Market Trial Status
 * Minimal status values as specified in Work Order.
 */
export enum MarketTrialStatus {
  OPEN = 'open',                 // Funding open for participation
  TRIAL_ACTIVE = 'trial_active', // Funding complete, trial period active
  FAILED = 'failed',             // Funding failed or trial failed
}

@Entity('market_trials')
export class MarketTrial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Supplier who created this trial
   * References dropshipping_suppliers.id
   */
  @Column({ type: 'uuid' })
  @Index()
  supplierId!: string;

  /**
   * Product being trialed
   * References dropshipping_product_masters.id
   */
  @Column({ type: 'uuid' })
  @Index()
  productId!: string;

  /**
   * Trial campaign title
   */
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  /**
   * Trial description and details
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Price per trial unit that participants pay
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  trialUnitPrice!: number;

  /**
   * Target funding amount to reach
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount!: number;

  /**
   * Current funded amount
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentAmount!: number;

  /**
   * Funding period start
   */
  @Column({ type: 'timestamp' })
  fundingStartAt!: Date;

  /**
   * Funding period end
   */
  @Column({ type: 'timestamp' })
  fundingEndAt!: Date;

  /**
   * Trial period duration in days (after funding success)
   */
  @Column({ type: 'int' })
  trialPeriodDays!: number;

  /**
   * Current status
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: MarketTrialStatus.OPEN,
  })
  @Index()
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
