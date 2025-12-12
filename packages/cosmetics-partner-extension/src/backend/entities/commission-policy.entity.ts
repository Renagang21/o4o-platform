/**
 * CommissionPolicy Entity
 *
 * 파트너 커미션 정책 엔티티
 * - 파트너별, 상품별, 캠페인별 정책 설정
 * - 정률(PERCENT) 또는 정액(FIXED) 방식
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PolicyType = 'PERCENT' | 'FIXED';

export interface PolicyMetadata {
  description?: string;
  minOrderAmount?: number;
  maxCommission?: number;
  categories?: string[];
  [key: string]: unknown;
}

@Entity('cosmetics_partner_commission_policies')
@Index(['partnerId', 'productId', 'campaignId'])
@Index(['effectiveFrom', 'effectiveTo'])
export class CommissionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 특정 파트너 전용 정책 (null이면 전체 적용)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  partnerId?: string;

  /**
   * 특정 상품 전용 정책 (null이면 전체 상품 적용)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  productId?: string;

  /**
   * 특정 캠페인 전용 정책 (null이면 캠페인 무관)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  campaignId?: string;

  /**
   * 정책명
   */
  @Column({ length: 200 })
  name!: string;

  /**
   * 정책 유형: PERCENT(정률) 또는 FIXED(정액)
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'PERCENT',
  })
  policyType!: PolicyType;

  /**
   * 커미션 비율 (PERCENT인 경우)
   * 예: 0.10 = 10%
   */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  commissionRate!: number;

  /**
   * 고정 커미션 금액 (FIXED인 경우)
   * 단위: 원
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fixedAmount!: number;

  /**
   * 정책 적용 시작일
   */
  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom?: Date;

  /**
   * 정책 적용 종료일
   */
  @Column({ type: 'timestamp', nullable: true })
  effectiveTo?: Date;

  /**
   * 정책 우선순위 (높을수록 우선 적용)
   */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  /**
   * 활성화 여부
   */
  @Column({ default: true })
  isActive!: boolean;

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: PolicyMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * 생성자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;
}
