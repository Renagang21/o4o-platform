/**
 * CommissionRule Entity
 *
 * 수수료 정책 기반 정산 체계
 *
 * 상품 카테고리, 판매자 등급, 주문 금액 등에 따라 다른 수수료율을 적용할 수 있습니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommissionType {
  PERCENTAGE = 'percentage',   // 퍼센트 기반
  FIXED = 'fixed',             // 고정 금액
  TIERED = 'tiered',           // 단계별 (주문 금액에 따라 다름)
}

export enum CommissionRuleStatus {
  ACTIVE = 'active',           // 활성 상태
  INACTIVE = 'inactive',       // 비활성 상태
  ARCHIVED = 'archived',       // 보관됨
}

@Entity('dropshipping_commission_rules')
export class CommissionRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.PERCENTAGE,
  })
  type!: CommissionType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  rate?: number; // 퍼센트 (예: 10.50 = 10.5%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount?: number; // 고정 금액

  @Column({ type: 'jsonb', nullable: true })
  tieredRates?: Array<{ threshold: number; rate: number }>; // 단계별 수수료

  @Column({ type: 'varchar', length: 255, nullable: true })
  applicableCategory?: string; // 적용 가능 카테고리

  @Column({ type: 'uuid', nullable: true })
  applicableSellerId?: string; // 특정 판매자에게만 적용

  @Column({ type: 'int', default: 0 })
  priority!: number; // 우선순위 (낮을수록 우선)

  @Column({
    type: 'enum',
    enum: CommissionRuleStatus,
    default: CommissionRuleStatus.ACTIVE,
  })
  status!: CommissionRuleStatus;

  @Column({ type: 'date', nullable: true })
  validFrom?: Date;

  @Column({ type: 'date', nullable: true })
  validUntil?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
