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
   * Type of participant (STORE_OWNER / legacy SELLER)
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

  // (구 selectedSellerIds — Legacy Partner 결정 전용 컬럼) 매핑 제거.
  // WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1: 물리 컬럼은 Phase 2 migration 이 DROP.

  @CreateDateColumn()
  createdAt!: Date;
}
