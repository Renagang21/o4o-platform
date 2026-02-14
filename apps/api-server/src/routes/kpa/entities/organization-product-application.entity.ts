/**
 * OrganizationProductApplication Entity
 * 약국 상품 판매 신청
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ProductApplicationStatus = 'pending' | 'approved' | 'rejected';

@Entity('organization_product_applications')
@Index('IDX_org_product_app_org_id', ['organization_id'])
@Index('IDX_org_product_app_status', ['status'])
@Index('IDX_org_product_app_requested_by', ['requested_by'])
export class OrganizationProductApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50, default: 'kpa' })
  service_key: string;

  @Column({ type: 'varchar', length: 200 })
  external_product_id: string;

  @Column({ type: 'varchar', length: 300 })
  product_name: string;

  @Column({ type: 'jsonb', default: '{}' })
  product_metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: ProductApplicationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reject_reason: string | null;

  @Column({ type: 'uuid' })
  requested_by: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  requested_at: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
