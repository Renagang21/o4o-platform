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
 * 캠페인 상태
 */
export type CampaignStatus =
  | 'draft'      // 초안
  | 'active'     // 진행 중
  | 'closed'     // 마감
  | 'completed'  // 완료
  | 'cancelled'; // 취소

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
}
