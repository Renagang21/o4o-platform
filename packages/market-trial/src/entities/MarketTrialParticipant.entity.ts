/**
 * MarketTrialParticipant Entity
 *
 * Represents a seller or partner participating in a market trial.
 * Phase 1: Entity definition only (minimal fields).
 *
 * Note: No approval/status fields - participation is direct.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Participant Type
 * Only SELLER or PARTNER as specified in Work Order.
 */
export enum ParticipantType {
  SELLER = 'seller',
  PARTNER = 'partner',
}

@Entity('market_trial_participants')
export class MarketTrialParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Market trial being participated in
   * References market_trials.id
   */
  @Column({ type: 'uuid' })
  @Index()
  marketTrialId!: string;

  /**
   * Participant ID (seller or partner ID)
   * References dropshipping_sellers.id or partners table
   */
  @Column({ type: 'uuid' })
  @Index()
  participantId!: string;

  /**
   * Type of participant
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  participantType!: string;

  /**
   * Amount contributed to the trial funding
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  contributionAmount!: number;

  /**
   * Selected reward type ('cash' | 'product')
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  rewardType?: string;

  /**
   * Reward fulfillment status ('pending' | 'fulfilled')
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  rewardStatus!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
