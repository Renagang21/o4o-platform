/**
 * MarketTrialForum Entity
 *
 * Mapping table linking a market trial to its forum board.
 * Phase 1: Entity definition only.
 *
 * Note: This is a pure mapping table - no forum data is duplicated here.
 * Forum data resides in the forum-core tables.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('market_trial_forums')
export class MarketTrialForum {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Market trial ID
   * References market_trials.id
   */
  @Column({ type: 'uuid' })
  @Index()
  marketTrialId!: string;

  /**
   * Forum board ID
   * References forum boards table (forum-core)
   */
  @Column({ type: 'uuid' })
  @Index()
  forumId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
