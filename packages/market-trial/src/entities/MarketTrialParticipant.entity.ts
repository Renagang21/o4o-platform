/**
 * MarketTrialParticipant Entity
 *
 * Represents a seller or partner participating in a market trial.
 * Phase 1: Entity definition only (minimal fields).
 * Phase 2 (WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1):
 *   정산 선택/상태 필드 추가.
 *
 * Note: No approval/status fields - participation is direct.
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

  /**
   * Linked OrganizationProductListing ID (set when operator creates a store listing for this participant).
   * WO-MARKET-TRIAL-LISTING-AUTOLINK-V1
   */
  @Column({ type: 'uuid', nullable: true })
  listingId?: string;

  /**
   * Customer conversion pipeline stage.
   * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
   * none | interested | considering | adopted | first_order
   */
  @Column({ type: 'varchar', length: 30, default: 'none' })
  customerConversionStatus!: string;

  /**
   * Timestamp when customerConversionStatus was last updated.
   * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
   */
  @Column({ type: 'timestamp', nullable: true })
  customerConversionAt?: Date;

  /**
   * Operator note for the current conversion stage.
   * WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1
   */
  @Column({ type: 'text', nullable: true })
  customerConversionNote?: string;

  // ── Phase 2: Settlement fields (WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1) ──

  /**
   * 참여자 정산 선택: 개발 완료 후 제품/금액 중 선택
   * null = 미선택, 'product' = 제품 선택, 'cash' = 금액 선택
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  settlementChoice?: string | null;

  /**
   * 정산 상태 머신:
   * pending          → 참여 완료, 정산 대기 (초기값)
   * choice_pending   → 선택 가능 시점 (Trial outcome_confirming 이상)
   * choice_completed → 참여자 선택 완료
   * offline_review   → 운영자/공급자 오프라인 검토 중
   * offline_settled  → 오프라인 정산 완료
   */
  @Column({ type: 'varchar', length: 30, default: 'pending' })
  settlementStatus!: string;

  /**
   * 정산 기준 금액 (contributionAmount × (1 + rewardRate/100))
   * 선택 완료 시 운영자가 기록
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  settlementAmount?: number | null;

  /**
   * 예상/확정 제품 수량
   */
  @Column({ type: 'integer', nullable: true })
  settlementProductQty?: number | null;

  /**
   * 예상/확정 잔액 (현금 또는 Neture Credit 후보)
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  settlementRemainder?: number | null;

  /**
   * Neture Credit 처리 상태 (향후 연동 준비):
   * not_applicable → 해당 없음 (초기값)
   * pending        → 처리 예정
   * planned        → 계획 확정
   * completed      → 처리 완료
   */
  @Column({ type: 'varchar', length: 20, default: 'not_applicable' })
  creditProcessStatus!: string;

  /**
   * 운영자/공급자 정산 메모
   */
  @Column({ type: 'text', nullable: true })
  settlementNote?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
