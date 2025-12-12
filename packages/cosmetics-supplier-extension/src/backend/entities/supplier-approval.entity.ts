/**
 * Supplier Approval Entity
 *
 * Seller/Partner 승인 관리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ApprovalType = 'seller' | 'partner';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked';

@Entity('cosmetics_supplier_approvals')
export class SupplierApproval {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'supplier_id' })
  @Index()
  supplierId!: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  @Index()
  type!: ApprovalType;

  @Column({ name: 'seller_id', nullable: true })
  @Index()
  sellerId?: string;

  @Column({ name: 'partner_id', nullable: true })
  @Index()
  partnerId?: string;

  @Column({ name: 'applicant_name', nullable: true })
  applicantName?: string;

  @Column({ name: 'store_name', nullable: true })
  storeName?: string;

  @Column({ name: 'business_number', nullable: true })
  businessNumber?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  @Index()
  status!: ApprovalStatus;

  @Column({ name: 'request_message', type: 'text', nullable: true })
  requestMessage?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number;

  @Column({ name: 'special_terms', type: 'text', nullable: true })
  specialTerms?: string;

  @Column({ name: 'contract_start_date', type: 'date', nullable: true })
  contractStartDate?: Date;

  @Column({ name: 'contract_end_date', type: 'date', nullable: true })
  contractEndDate?: Date;

  @Column({ name: 'approved_products', type: 'jsonb', nullable: true })
  approvedProducts?: string[];

  @Column({ name: 'approved_categories', type: 'jsonb', nullable: true })
  approvedCategories?: string[];

  @Column({ name: 'requested_at', type: 'timestamp', nullable: true })
  requestedAt?: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @Column({ name: 'rejected_by', nullable: true })
  rejectedBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
