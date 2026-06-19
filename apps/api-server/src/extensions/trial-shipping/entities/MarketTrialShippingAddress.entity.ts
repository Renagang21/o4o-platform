/**
 * MarketTrialShippingAddress Entity
 *
 * Trial participant shipping address.
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

@Entity('market_trial_shipping_addresses')
export class MarketTrialShippingAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  participationId!: string;

  @Column({ type: 'varchar', length: 100 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 10 })
  postalCode!: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressDetail?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deliveryNote?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
