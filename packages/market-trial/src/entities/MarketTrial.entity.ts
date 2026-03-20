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
 * Trial Status (Unified Enum)
 *
 * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 기준 단일화된 상태 모델
 * - Backend / API / Frontend 전부 이 enum 사용
 * - 기존 open/closed, upcoming/active/ended 등 모두 폐기
 */
export enum TrialStatus {
  DRAFT = 'draft',                         // 초안 - 공급자가 작성 중
  SUBMITTED = 'submitted',                 // 제출됨 - 운영자 심사 대기
  APPROVED = 'approved',                   // 승인됨 - 모집 시작 전
  RECRUITING = 'recruiting',               // 모집 중 - 참여자 모집 진행
  DEVELOPMENT = 'development',             // 개발/준비 중 - 모집 완료 후 상품 준비
  OUTCOME_CONFIRMING = 'outcome_confirming', // 결과 확정 중 - 참여자 Decision 수집
  FULFILLED = 'fulfilled',                 // 이행 완료 - Trial 성공 종료
  CLOSED = 'closed',                       // 종료 - 일반 종료 (실패/취소 포함)
}

/** @deprecated Use TrialStatus instead - 하위 호환용 alias */
export const MarketTrialStatus = TrialStatus;

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
   * Product being trialed (Optional)
   * References dropshipping_product_masters.id
   * @deprecated Trial-상품 FK 의존 제거 정책에 따라 optional로 변경
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  productId?: string;

  /**
   * Outcome Snapshot - Trial 결과 약속 정보
   * WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1: productId FK 대신 사용
   */
  @Column({ type: 'jsonb', nullable: true })
  outcomeSnapshot?: {
    expectedType: 'product' | 'cash';
    description: string;
    quantity?: number;
    note?: string;
  };

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
    default: TrialStatus.DRAFT,
  })
  @Index()
  status!: TrialStatus;

  /**
   * Supplier display name (denormalized for listing)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierName?: string;

  /**
   * Roles eligible to participate
   * WO-O4O-MARKET-TRIAL-PHASE1-V1: partner excluded, seller only
   */
  @Column({ type: 'jsonb', default: '["seller"]' })
  eligibleRoles!: string[];

  /**
   * Available reward options (e.g. ['cash', 'product'])
   */
  @Column({ type: 'jsonb', default: '["cash","product"]' })
  rewardOptions!: string[];

  /**
   * Maximum number of participants (null = unlimited)
   */
  @Column({ type: 'int', nullable: true })
  maxParticipants?: number;

  /**
   * Current participant count (denormalized for listing)
   */
  @Column({ type: 'int', default: 0 })
  currentParticipants!: number;

  /**
   * Service keys this trial is visible to (e.g. ['glycopharm', 'k-cosmetics'])
   * Empty array = visible to all (or unscoped)
   * WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1
   */
  @Column({ type: 'jsonb', default: '[]' })
  visibleServiceKeys!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
