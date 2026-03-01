/**
 * ProductApproval Entity
 * 제품 승인 (공급자 Offer → 약국 리스팅 승인 추적)
 *
 * WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: product_id → offer_id
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { SupplierProductOffer } from '../modules/neture/entities/SupplierProductOffer.entity.js';

export enum ProductApprovalType {
  SERVICE = 'service',
  PRIVATE = 'private',
}

export enum ProductApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}

@Entity('product_approvals')
@Index('IDX_product_approvals_org', ['organization_id'])
@Index('IDX_product_approvals_status', ['approval_status'])
@Index('IDX_product_approvals_service_key', ['service_key'])
export class ProductApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offer_id', type: 'uuid', nullable: true })
  offer_id: string | null;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50, default: 'kpa' })
  service_key: string;

  @Column({
    type: 'enum',
    enum: ProductApprovalType,
    default: ProductApprovalType.SERVICE,
  })
  approval_type: ProductApprovalType;

  @Column({
    type: 'enum',
    enum: ProductApprovalStatus,
    default: ProductApprovalStatus.PENDING,
  })
  approval_status: ProductApprovalStatus;

  @Column({ type: 'uuid', nullable: true })
  requested_by: string | null;

  @Column({ type: 'uuid', nullable: true })
  decided_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  decided_at: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
