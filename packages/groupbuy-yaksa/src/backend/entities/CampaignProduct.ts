/**
 * CampaignProduct Entity (핵심)
 *
 * "공동구매 대상 상품" 정의
 * - 기간 + 최소수량 = 공동구매 조건
 * - dropshipping-core의 Product 참조
 * - 광고/노출 관련 필드 없음 (Work Order 제약)
 * - 수수료율 없음 (Work Order 제약)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { GroupbuyCampaign } from './GroupbuyCampaign.js';
import { GroupbuyOrder } from './GroupbuyOrder.js';

/**
 * 캠페인 상품 상태
 */
export type CampaignProductStatus =
  | 'active'         // 진행 중
  | 'threshold_met'  // 최소수량 달성
  | 'closed';        // 마감

@Entity('campaign_products')
@Index(['campaignId', 'status'])
@Index(['productId'])
@Index(['supplierId'])
@Index(['status', 'startDate', 'endDate'])
export class CampaignProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 캠페인 ID
   */
  @Column('uuid')
  @Index()
  campaignId!: string;

  /**
   * 상품 ID (dropshipping-core Product 참조)
   */
  @Column('uuid')
  productId!: string;

  /**
   * 공급자 ID (dropshipping-core Supplier 참조)
   */
  @Column('uuid')
  supplierId!: string;

  /**
   * 공동구매 가격
   * - 이 가격은 dropshipping-core의 주문 생성 시 참조용
   * - 실제 결제/정산은 dropshipping-core에서 처리
   */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  groupPrice!: number;

  // ============================================
  // 공동구매 조건 (핵심)
  // ============================================

  /**
   * 최소 총 수량 (필수)
   * - 이 수량 이상 주문되어야 공동구매 성립
   */
  @Column({ type: 'int' })
  minTotalQuantity!: number;

  /**
   * 최대 총 수량 (선택)
   * - null이면 무제한
   */
  @Column({ type: 'int', nullable: true })
  maxTotalQuantity?: number;

  /**
   * 상품별 시작일 (필수)
   */
  @Column({ type: 'timestamp with time zone' })
  startDate!: Date;

  /**
   * 상품별 종료일 (필수)
   */
  @Column({ type: 'timestamp with time zone' })
  endDate!: Date;

  // ============================================
  // 수량 집계 필드
  // ============================================

  /**
   * 주문된 수량 (모든 약국 합계)
   */
  @Column({ type: 'int', default: 0 })
  orderedQuantity!: number;

  /**
   * 확정된 수량 (모든 약국 합계)
   */
  @Column({ type: 'int', default: 0 })
  confirmedQuantity!: number;

  /**
   * 상품 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: CampaignProductStatus;

  // ============================================
  // 메타데이터
  // ============================================

  /**
   * 추가 메타데이터
   * - 상품 설명, 주의사항 등
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

  @ManyToOne(() => GroupbuyCampaign, (campaign) => campaign.products)
  @JoinColumn({ name: 'campaignId' })
  campaign?: GroupbuyCampaign;

  @OneToMany(() => GroupbuyOrder, (order) => order.campaignProduct)
  orders?: GroupbuyOrder[];

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * 최소 수량 달성 여부
   */
  get isThresholdMet(): boolean {
    return this.orderedQuantity >= this.minTotalQuantity;
  }

  /**
   * 주문 가능 여부
   */
  get canOrder(): boolean {
    if (this.status === 'closed') return false;
    if (this.maxTotalQuantity && this.orderedQuantity >= this.maxTotalQuantity) return false;

    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }
}
