/**
 * GroupbuyOrder Entity
 *
 * 공동구매 참여 기록 (주문 일부)
 * - 약국의 공동구매 참여를 기록
 * - dropshipping-core의 Order와 연결
 * - 금액 필드 없음 (Work Order 제약)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GroupbuyCampaign } from './GroupbuyCampaign.js';
import { CampaignProduct } from './CampaignProduct.js';

/**
 * 공동구매 주문 상태
 */
export type GroupbuyOrderStatus =
  | 'pending'    // 대기 (주문 접수)
  | 'confirmed'  // 확정 (최소수량 달성 후)
  | 'cancelled'; // 취소

@Entity('groupbuy_orders')
@Index(['campaignId', 'pharmacyId'])
@Index(['campaignProductId', 'pharmacyId'])
@Index(['supplierId'])
@Index(['orderStatus'])
@Index(['dropshippingOrderId'])
export class GroupbuyOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 캠페인 ID
   */
  @Column('uuid')
  @Index()
  campaignId!: string;

  /**
   * 캠페인 상품 ID
   */
  @Column('uuid')
  @Index()
  campaignProductId!: string;

  /**
   * 약국 ID (organization-core 참조)
   */
  @Column('uuid')
  @Index()
  pharmacyId!: string;

  /**
   * 공급자 ID (dropshipping-core 참조)
   * - 집계 쿼리 최적화를 위해 비정규화
   */
  @Column('uuid')
  supplierId!: string;

  /**
   * 주문 수량
   */
  @Column({ type: 'int' })
  quantity!: number;

  /**
   * 주문 상태
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  orderStatus!: GroupbuyOrderStatus;

  /**
   * dropshipping 주문 ID (연결)
   * - 실제 주문/배송/정산은 dropshipping-core에서 처리
   * - null이면 아직 dropshipping 주문 미생성
   */
  @Column('uuid', { nullable: true })
  dropshippingOrderId?: string;

  // ============================================
  // 메타데이터
  // ============================================

  /**
   * 주문자 ID (약국 담당자)
   */
  @Column('uuid', { nullable: true })
  orderedBy?: string;

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

  @ManyToOne(() => GroupbuyCampaign, (campaign) => campaign.orders)
  @JoinColumn({ name: 'campaignId' })
  campaign?: GroupbuyCampaign;

  @ManyToOne(() => CampaignProduct, (product) => product.orders)
  @JoinColumn({ name: 'campaignProductId' })
  campaignProduct?: CampaignProduct;
}
