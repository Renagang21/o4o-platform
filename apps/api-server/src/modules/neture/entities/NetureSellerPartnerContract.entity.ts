/**
 * NetureSellerPartnerContract Entity
 *
 * WO-NETURE-SELLER-PARTNER-CONTRACT-V1
 *
 * Seller ↔ Partner 독립 계약
 * Application 승인 시 자동 생성, commission_rate 스냅샷
 *
 * 상태 전이:
 * - active → terminated (seller 또는 partner 해지)
 * - active → expired (기한 만료)
 * - terminated / expired → 전이 불가
 *
 * 수수료 불변 원칙:
 * - commission_rate 변경 시 기존 계약 terminated → 신규 계약 생성
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractStatus {
  ACTIVE = 'active',
  TERMINATED = 'terminated',
  EXPIRED = 'expired',
}

export enum ContractTerminatedBy {
  SELLER = 'seller',
  PARTNER = 'partner',
}

@Entity('neture_seller_partner_contracts')
export class NetureSellerPartnerContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ name: 'recruitment_id' })
  recruitmentId: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({
    name: 'commission_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  commissionRate: number;

  @Column({
    name: 'contract_status',
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  contractStatus: ContractStatus;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'NOW()' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({
    name: 'terminated_by',
    type: 'enum',
    enum: ContractTerminatedBy,
    nullable: true,
  })
  terminatedBy: ContractTerminatedBy | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
