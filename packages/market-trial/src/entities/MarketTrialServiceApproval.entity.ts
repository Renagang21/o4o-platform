/**
 * MarketTrialServiceApproval Entity
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1: 서비스별 2차 승인
 *
 * Neture 운영자 1차 승인 후, 각 visibleServiceKey별로
 * ServiceApproval 레코드가 생성되어 서비스 운영자가 개별 승인.
 *
 * 패턴 참조: ProductApproval (apps/api-server/src/entities/ProductApproval.ts)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum ServiceApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('market_trial_service_approvals')
@Unique(['trialId', 'serviceKey'])
@Index('IDX_mtsa_trial', ['trialId'])
@Index('IDX_mtsa_service_status', ['serviceKey', 'status'])
export class MarketTrialServiceApproval {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trial_id', type: 'uuid' })
  trialId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ServiceApprovalStatus.PENDING,
  })
  status!: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
