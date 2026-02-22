/**
 * MarketTrialFulfillment Entity
 *
 * Trial participant fulfillment tracking.
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1: in-memory → DB 전환
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
 * Fulfillment Status
 *
 * pending → address_collected → order_created → shipped → delivered → fulfilled
 */
export type FulfillmentStatus =
  | 'pending'
  | 'address_collected'
  | 'order_created'
  | 'shipped'
  | 'delivered'
  | 'fulfilled';

export interface StatusTransition {
  from: FulfillmentStatus;
  to: FulfillmentStatus;
  timestamp: string;
  reason?: string;
}

@Entity('market_trial_fulfillments')
export class MarketTrialFulfillment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  participationId!: string;

  @Column({ type: 'uuid' })
  @Index()
  trialId!: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderNumber?: string;

  @Column({ type: 'jsonb', default: '[]' })
  statusHistory!: StatusTransition[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
