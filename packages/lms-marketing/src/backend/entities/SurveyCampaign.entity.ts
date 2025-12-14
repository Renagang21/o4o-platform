/**
 * SurveyCampaign Entity
 *
 * Marketing survey campaign for market research and feedback collection.
 * Uses LMS-Core Survey engine for questions and response handling.
 *
 * Phase R8: Survey Campaign Module
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
 * Target audience type for survey campaign
 */
export type SurveyTargetAudience = 'seller' | 'consumer' | 'pharmacist' | 'all';

/**
 * Survey campaign status
 */
export type SurveyCampaignStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'archived';

/**
 * Targeting configuration for survey campaign
 */
export interface SurveyCampaignTargeting {
  /** Target audience types */
  targets: SurveyTargetAudience[];
  /** Target regions (optional) */
  regions?: string[];
  /** Marketing tags for filtering */
  tags?: string[];
  /** Seller types (for seller targeting) */
  sellerTypes?: string[];
}

/**
 * Reward type for survey completion
 */
export type SurveyRewardType = 'points' | 'coupon' | 'badge' | 'none';

/**
 * Reward configuration for survey campaign
 */
export interface SurveyReward {
  /** Type of reward */
  type: SurveyRewardType;
  /** Reward value (points amount, coupon code, badge id) */
  value: string;
  /** Description of the reward */
  description?: string;
}

@Entity('lms_marketing_survey_campaigns')
@Index(['supplierId'])
@Index(['surveyId'])
@Index(['status'])
@Index(['isActive'])
@Index(['isPublished'])
export class SurveyCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Supplier who created this campaign */
  @Column({ type: 'varchar', length: 255 })
  supplierId: string;

  /** Reference to Survey in lms-core (optional - can embed questions) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  surveyId: string | null;

  /** Campaign title */
  @Column({ type: 'varchar', length: 500 })
  title: string;

  /** Campaign description */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Reference to ContentBundle in lms-core (optional) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  bundleId: string | null;

  /** Embedded survey questions (alternative to surveyId reference) */
  @Column({ type: 'jsonb', default: [] })
  questions: SurveyQuestion[];

  /** Targeting configuration */
  @Column({ type: 'jsonb', default: { targets: ['all'] } })
  targeting: SurveyCampaignTargeting;

  /** Reward configuration */
  @Column({ type: 'jsonb', nullable: true })
  reward: SurveyReward | null;

  /** Campaign status */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: SurveyCampaignStatus;

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

  /** Allow anonymous responses */
  @Column({ type: 'boolean', default: false })
  allowAnonymous: boolean;

  /** Maximum responses allowed (null = unlimited) */
  @Column({ type: 'int', nullable: true })
  maxResponses: number | null;

  /** Participation count */
  @Column({ type: 'int', default: 0 })
  participationCount: number;

  /** Completion count */
  @Column({ type: 'int', default: 0 })
  completionCount: number;

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

/**
 * Survey question types
 */
export type SurveyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text'
  | 'textarea'
  | 'rating'
  | 'scale'
  | 'date'
  | 'email'
  | 'phone';

/**
 * Survey question option
 */
export interface SurveyQuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  value?: string | number;
}

/**
 * Survey question
 */
export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  description?: string;
  options?: SurveyQuestionOption[];
  required: boolean;
  order: number;
  /** For rating/scale type */
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Validation rules */
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * Survey response answer
 */
export interface SurveyAnswer {
  questionId: string;
  value: string | string[] | number;
  timeSpentSeconds?: number;
}

/**
 * Survey campaign response record
 */
export interface SurveyCampaignResponse {
  campaignId: string;
  userId?: string;
  isAnonymous: boolean;
  answers: SurveyAnswer[];
  completedAt: Date;
  metadata?: Record<string, unknown>;
}
