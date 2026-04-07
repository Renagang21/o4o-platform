/**
 * GroupbuyCampaign Entity
 *
 * 조직 스코프 기반 캠페인 컨테이너
 * - 지부/분회(division/branch) 단위로 생성
 * - 금액/수수료 필드 없음 (Work Order 제약)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CampaignProduct } from './CampaignProduct.js';
import { GroupbuyOrder } from './GroupbuyOrder.js';

/**
 * 캠페인(이벤트) 승인 상태
 *
 * WO-O4O-EVENT-OFFER-CORE-TRANSITION-V1:
 * - 새 정책: draft → submitted → approved | rejected → ended
 * - 승인 후 본체/상품/가격/기간 모두 수정 불가
 * - 중단 개념 없음 (cancel 제거)
 *
 * Legacy 값 보존 (DB 호환, WO-3에서 migration 예정):
 * - 'active'    → 'approved'와 동일 의미로 취급
 * - 'closed'    → 'ended'와 동일 의미
 * - 'completed' → 'ended'와 동일 의미
 * - 'cancelled' → 'ended'와 동일 의미 (신규 진입 차단)
 */
export type CampaignStatus =
  // 새 승인 상태 (event_offer 표준)
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'ended'
  // Legacy (DB 호환 전용, 신규 코드에서 set 금지)
  | 'active'
  | 'closed'
  | 'completed'
  | 'cancelled';

/**
 * Approval state 정규화
 * Legacy 값을 새 모델로 매핑하여 동일 로직으로 처리할 수 있게 한다.
 */
export function normalizeApprovalState(
  status: CampaignStatus
): 'draft' | 'submitted' | 'approved' | 'rejected' | 'ended' {
  switch (status) {
    case 'active':
      return 'approved';
    case 'closed':
    case 'completed':
    case 'cancelled':
      return 'ended';
    default:
      return status;
  }
}

/**
 * 이벤트 시간 기반 운영 상태
 */
export type EventOfferTimeStatus = 'upcoming' | 'active' | 'ended';

@Entity('groupbuy_campaigns')
@Index(['organizationId', 'status'])
@Index(['status', 'startDate', 'endDate'])
export class GroupbuyCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 조직 ID (지부/분회)
   * organization-core의 Organization 참조
   */
  @Column('uuid')
  @Index()
  organizationId!: string;

  /**
   * 캠페인 제목
   */
  @Column({ length: 200 })
  title!: string;

  /**
   * 캠페인 설명
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * 캠페인 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status!: CampaignStatus;

  /**
   * 시작일
   */
  @Column({ type: 'timestamp with time zone' })
  startDate!: Date;

  /**
   * 종료일
   */
  @Column({ type: 'timestamp with time zone' })
  endDate!: Date;

  // ============================================
  // 수량 집계 필드 (금액 없음)
  // ============================================

  /**
   * 총 주문 수량 (모든 상품 합계)
   */
  @Column({ type: 'int', default: 0 })
  totalOrderedQuantity!: number;

  /**
   * 총 확정 수량 (모든 상품 합계)
   */
  @Column({ type: 'int', default: 0 })
  totalConfirmedQuantity!: number;

  /**
   * 참여 약국 수
   */
  @Column({ type: 'int', default: 0 })
  participantCount!: number;

  // ============================================
  // 메타데이터
  // ============================================

  /**
   * 생성자 ID (관리자)
   */
  @Column('uuid')
  createdBy!: string;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ============================================
  // Relations
  // ============================================

  @OneToMany(() => CampaignProduct, (product) => product.campaign)
  products?: CampaignProduct[];

  @OneToMany(() => GroupbuyOrder, (order) => order.campaign)
  orders?: GroupbuyOrder[];

  // ============================================
  // Helper Methods (event_offer)
  // ============================================

  /**
   * 정규화된 승인 상태 (legacy 값 자동 매핑)
   */
  get approvalState(): 'draft' | 'submitted' | 'approved' | 'rejected' | 'ended' {
    return normalizeApprovalState(this.status);
  }

  /**
   * 승인 후 객체인지 (불변 가드용)
   */
  get isApproved(): boolean {
    return this.approvalState === 'approved';
  }

  /**
   * 시간 기반 운영 상태 (upcoming / active / ended)
   * - 정책: 승인 안 된 캠페인은 항상 'upcoming' 취급 (외부 노출 안 함)
   * - 종료된(rejected/ended) 캠페인은 'ended'
   */
  getComputedTimeStatus(now: Date = new Date()): EventOfferTimeStatus {
    const state = this.approvalState;
    if (state === 'ended' || state === 'rejected') return 'ended';
    if (state !== 'approved') return 'upcoming';
    if (now < this.startDate) return 'upcoming';
    if (now > this.endDate) return 'ended';
    return 'active';
  }

  /**
   * 주문(참여) 가능 여부 — 진행 중일 때만
   */
  canAcceptOrders(now: Date = new Date()): boolean {
    return this.getComputedTimeStatus(now) === 'active';
  }
}
