/**
 * SupplierProfile Entity (확장)
 *
 * 공동구매/B2B 참여 정책 보조
 * - dropshipping-core의 Supplier를 확장
 * - 공동구매 활성화 여부 등 정책 정보
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('groupbuy_supplier_profiles')
export class SupplierProfile {
  /**
   * 공급자 ID (dropshipping-core Supplier 참조)
   * - 별도 PK 없이 supplierId를 PK로 사용
   */
  @PrimaryColumn('uuid')
  supplierId!: string;

  /**
   * 공동구매 참여 활성화 여부
   */
  @Column({ type: 'boolean', default: false })
  @Index()
  isGroupbuyEnabled!: boolean;

  /**
   * 기본 정산 정책 ID
   * - dropshipping-core의 정산 정책 참조
   */
  @Column('uuid', { nullable: true })
  defaultSettlementPolicyId?: string;

  /**
   * 운영자 메모 (운영자 전용)
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * 공동구매 참여 조건
   */
  @Column({ type: 'jsonb', nullable: true })
  groupbuyTerms?: {
    minOrderQuantity?: number;
    maxConcurrentCampaigns?: number;
    allowedOrganizationTypes?: string[];
  };

  /**
   * 추가 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
