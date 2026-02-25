/**
 * ProductApproval Entity
 * 제품 승인 (공급자 제품 → 약국 리스팅 승인 추적)
 *
 * WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1
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
import type { NetureSupplierProduct } from '../modules/neture/entities/NetureSupplierProduct.entity.js';

export enum ProductApprovalType {
  SERVICE = 'service',
  PRIVATE = 'private',
}

export enum ProductApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('product_approvals')
@Index('IDX_product_approvals_product', ['product_id'])
@Index('IDX_product_approvals_org', ['organization_id'])
@Index('IDX_product_approvals_status', ['approval_status'])
@Index('IDX_product_approvals_service_key', ['service_key'])
export class ProductApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  product_id: string;

  // ESM §4: string-based relation
  @ManyToOne('NetureSupplierProduct')
  @JoinColumn({ name: 'product_id' })
  product?: NetureSupplierProduct;

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
