/**
 * MarketTrialDecision Entity
 *
 * Represents a participant's final decision after trial period.
 * Phase 2: Decision (의사 표현) functionality.
 *
 * Note: Decision is one-time only, no updates allowed.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Decision Type
 * CONTINUE: Wants to continue handling the product
 * STOP: Does not want to continue
 */
export enum DecisionType {
  CONTINUE = 'continue',
  STOP = 'stop',
}

@Entity('market_trial_decisions')
@Unique(['marketTrialId', 'participantId']) // Prevent duplicate decisions
export class MarketTrialDecision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Market trial this decision belongs to
   * References market_trials.id
   */
  @Column({ type: 'uuid' })
  @Index()
  marketTrialId!: string;

  /**
   * Participant who made the decision
   * References market_trial_participants.participantId
   */
  @Column({ type: 'uuid' })
  @Index()
  participantId!: string;

  /**
   * Type of participant (SELLER or PARTNER)
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  participantType!: string;

  /**
   * The decision made by participant
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  decision!: string;

  /**
   * For partners: selected seller IDs (JSON array)
   * Only populated when participantType = PARTNER and decision = CONTINUE
   */
  @Column({ type: 'text', nullable: true })
  selectedSellerIds!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
