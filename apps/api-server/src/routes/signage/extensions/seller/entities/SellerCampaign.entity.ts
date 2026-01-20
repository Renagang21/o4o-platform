/**
 * Seller Campaign Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * 판매자 캠페인 관리
 * 기간, 타겟팅, 예산 조건 정의
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

/**
 * Campaign Status
 */
export type SellerCampaignStatus =
  | 'draft'       // 작성 중
  | 'pending'     // 승인 대기
  | 'approved'    // 승인됨
  | 'active'      // 진행 중
  | 'paused'      // 일시 중지
  | 'completed'   // 완료
  | 'rejected';   // 거절됨

/**
 * Campaign Type
 */
export type SellerCampaignType =
  | 'promotion'   // 프로모션/할인
  | 'awareness'   // 브랜드 인지도
  | 'launch'      // 신제품 런칭
  | 'seasonal'    // 시즌 캠페인
  | 'event';      // 이벤트

/**
 * Targeting Configuration
 */
export interface SellerCampaignTargeting {
  serviceKeys?: string[];       // 특정 서비스만
  regions?: string[];           // 지역 타겟팅
  storeTypes?: string[];        // 매장 유형
  storeIds?: string[];          // 특정 매장
  excludeStoreIds?: string[];   // 제외 매장
}

/**
 * Budget Configuration (기록용, Phase 4 정산 연동)
 */
export interface SellerCampaignBudget {
  totalBudget?: number;         // 총 예산
  dailyBudget?: number;         // 일일 예산
  currency?: string;            // 통화
  costPerImpression?: number;   // CPM
  costPerClick?: number;        // CPC
}

/**
 * Seller Campaign Entity
 *
 * @description 판매자 캠페인
 * @schema signage_seller
 */
@Entity({ name: 'seller_campaigns', schema: 'signage_seller' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'partnerId'])
@Index(['startAt', 'endAt'])
export class SellerCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (Multi-tenant)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 파트너 ID (SellerPartner 참조)
   */
  @Column({ type: 'uuid' })
  @Index()
  partnerId!: string;

  /**
   * 캠페인 제목
   */
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /**
   * 캠페인 설명
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * 캠페인 유형
   */
  @Column({ type: 'varchar', length: 30, default: 'promotion' })
  campaignType!: SellerCampaignType;

  /**
   * 캠페인 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: SellerCampaignStatus;

  /**
   * 시작 일시
   */
  @Column({ type: 'timestamptz' })
  startAt!: Date;

  /**
   * 종료 일시
   */
  @Column({ type: 'timestamptz' })
  endAt!: Date;

  /**
   * 타겟팅 설정
   */
  @Column({ type: 'jsonb', default: {} })
  targeting!: SellerCampaignTargeting;

  /**
   * 예산 설정 (기록용)
   */
  @Column({ type: 'jsonb', default: {} })
  budget!: SellerCampaignBudget;

  /**
   * 승인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  approvedBy!: string | null;

  /**
   * 승인 일시
   */
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  /**
   * 거절 사유
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  /**
   * 우선순위 (같은 조건 시 정렬용)
   */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /**
   * 활성화 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 생성일시
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * 삭제일시 (Soft Delete)
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  /**
   * 버전 (Optimistic Locking)
   */
  @VersionColumn()
  version!: number;
}
