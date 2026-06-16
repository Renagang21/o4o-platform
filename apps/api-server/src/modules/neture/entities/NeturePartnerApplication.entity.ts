/**
 * NeturePartnerApplication Entity
 *
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * 파트너의 모집 참여 신청
 * 상태: pending (신청) / approved (승인) / rejected (거절) / cancelled (신청자 본인 철회)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  // WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: 신청자(판매자/매장) 본인이 pending 신청을 철회.
  // rejected(공급자 반려)와 운영 의미가 다르므로 별도 값. (migration: ADD VALUE 'cancelled')
  CANCELLED = 'cancelled',
}

@Entity('neture_partner_applications')
@Unique(['recruitmentId', 'partnerId'])
@Index(['recruitmentId'])
@Index(['partnerId'])
@Index(['status'])
export class NeturePartnerApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recruitment_id' })
  recruitmentId: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @Column({ name: 'partner_name', nullable: true })
  partnerName: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ name: 'applied_at', type: 'timestamp', default: () => 'NOW()' })
  appliedAt: Date;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt: Date;

  @Column({ name: 'decided_by', nullable: true })
  decidedBy: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
