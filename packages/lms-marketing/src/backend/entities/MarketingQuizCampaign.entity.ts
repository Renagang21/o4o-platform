/**
 * MarketingQuizCampaign Entity
 *
 * Quiz-based marketing campaigns for product education.
 * Supports targeted delivery to sellers, consumers, and pharmacists
 * with reward/incentive mechanisms.
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
 * Target audience type for quiz campaigns
 */
export type QuizTargetAudience = 'seller' | 'consumer' | 'pharmacist' | 'all';

/**
 * Quiz question type
 */
export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

/**
 * Individual quiz question
 */
export interface QuizQuestion {
  /** Question ID */
  id: string;
  /** Question type */
  type: QuizQuestionType;
  /** Question text */
  question: string;
  /** Answer options */
  options: QuizOption[];
  /** Correct answer(s) - option IDs */
  correctAnswers: string[];
  /** Points for correct answer */
  points: number;
  /** Explanation shown after answering */
  explanation?: string;
  /** Order in the quiz */
  order: number;
}

/**
 * Quiz answer option
 */
export interface QuizOption {
  /** Option ID */
  id: string;
  /** Option text */
  text: string;
  /** Optional image URL */
  imageUrl?: string;
}

/**
 * Targeting configuration for quiz campaigns
 */
export interface QuizCampaignTargeting {
  /** Target audience types */
  targets: QuizTargetAudience[];
  /** Target regions (optional) */
  regions?: string[];
  /** Marketing tags for filtering */
  tags?: string[];
  /** Seller types (for seller targeting) */
  sellerTypes?: string[];
}

/**
 * Reward type for quiz completion
 */
export type RewardType = 'points' | 'coupon' | 'badge' | 'certificate';

/**
 * Quiz reward configuration
 */
export interface QuizReward {
  /** Reward type */
  type: RewardType;
  /** Reward value (points amount, coupon code, badge ID, etc.) */
  value: string;
  /** Minimum score percentage to earn reward (0-100) */
  minScorePercent: number;
  /** Reward description */
  description?: string;
}

/**
 * Quiz campaign status
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';

@Entity('lms_marketing_quiz_campaigns')
@Index(['supplierId'])
@Index(['bundleId'])
@Index(['isActive'])
@Index(['status'])
@Index(['startDate', 'endDate'])
export class MarketingQuizCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Supplier who created this campaign */
  @Column({ type: 'varchar', length: 255 })
  supplierId: string;

  /** Campaign title */
  @Column({ type: 'varchar', length: 500 })
  title: string;

  /** Campaign description */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Reference to ContentBundle in lms-core (educational content) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  bundleId: string | null;

  /** Quiz questions */
  @Column({ type: 'jsonb', default: [] })
  questions: QuizQuestion[];

  /** Targeting configuration */
  @Column({ type: 'jsonb', default: { targets: ['all'] } })
  targeting: QuizCampaignTargeting;

  /** Rewards for completion */
  @Column({ type: 'jsonb', default: [] })
  rewards: QuizReward[];

  /** Campaign status */
  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: CampaignStatus;

  /** Campaign start date */
  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  /** Campaign end date */
  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date | null;

  /** Whether the campaign is active */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Whether the campaign is published */
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  /** Time limit for quiz in seconds (optional) */
  @Column({ type: 'int', nullable: true })
  timeLimitSeconds: number | null;

  /** Maximum attempts allowed (null = unlimited) */
  @Column({ type: 'int', nullable: true })
  maxAttempts: number | null;

  /** Pass score percentage (0-100) */
  @Column({ type: 'int', default: 70 })
  passScorePercent: number;

  /** Show correct answers after completion */
  @Column({ type: 'boolean', default: true })
  showCorrectAnswers: boolean;

  /** Shuffle question order */
  @Column({ type: 'boolean', default: false })
  shuffleQuestions: boolean;

  /** Shuffle option order */
  @Column({ type: 'boolean', default: false })
  shuffleOptions: boolean;

  /** Total participation count */
  @Column({ type: 'int', default: 0 })
  participationCount: number;

  /** Total completion count */
  @Column({ type: 'int', default: 0 })
  completionCount: number;

  /** Average score */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageScore: number;

  /** Published timestamp */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Additional metadata */
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
