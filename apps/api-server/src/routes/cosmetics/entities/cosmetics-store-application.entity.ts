/**
 * CosmeticsStoreApplication Entity
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Schema: cosmetics (isolated from Core)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CosmeticsStoreApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'cosmetics_store_applications', schema: 'cosmetics' })
export class CosmeticsStoreApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'applicant_user_id', type: 'uuid' })
  @Index()
  applicantUserId!: string;

  @Column({ name: 'store_name', type: 'varchar', length: 200 })
  storeName!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100 })
  businessNumber!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 200 })
  ownerName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: CosmeticsStoreApplicationStatus.DRAFT,
  })
  @Index()
  status!: CosmeticsStoreApplicationStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
