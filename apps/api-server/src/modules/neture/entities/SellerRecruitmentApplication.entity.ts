/**
 * SellerRecruitmentApplication Entity — 판매자(매장)의 모집 참여 신청
 *
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 *   (구 NeturePartnerApplication · WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1 에서 분리)
 *
 * 신청 주체 = 매장/판매자 사용자(applicantId). Legacy Partner 계정·role·계약과 무관하다.
 *
 * 물리 테이블 `seller_recruitment_applications` · 컬럼 `applicant_id` / `applicant_name`
 *   (구 neture_partner_applications · partner_id / partner_name →
 *   WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 에서 rename).
 *   테이블명은 이 엔티티의 상수만이 안다 — raw SQL 은 SELLER_RECRUITMENT_APPLICATION_TABLE 을 쓴다.
 *
 * 상태: pending (신청) / approved (승인) / rejected (반려) / cancelled
 *   - cancelled + decidedBy = 신청자 본인  → 신청 철회 (WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1)
 *   - cancelled + decidedBy = 모집 공급자 → 승인 후 참여 해지 (WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1)
 *     과거에는 legacy `neture_seller_partner_contracts.contract_status='terminated'` 로 파생했으나
 *     Partner 계약 생성이 은퇴되어 신청 행 자체가 종결 상태를 보유한다 (DB enum 추가 없음 = DDL 0).
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
  // WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: 신청자 본인 철회 / 공급자 참여 해지 (decidedBy 로 구분)
  CANCELLED = 'cancelled',
}

/** 물리 테이블명 */
export const SELLER_RECRUITMENT_APPLICATION_TABLE = 'seller_recruitment_applications';

@Entity(SELLER_RECRUITMENT_APPLICATION_TABLE)
@Unique(['recruitmentId', 'applicantId'])
@Index(['recruitmentId'])
@Index(['applicantId'])
@Index(['status'])
export class SellerRecruitmentApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recruitment_id' })
  recruitmentId: string;

  /** 신청자(매장/판매자) user id */
  @Column({ name: 'applicant_id' })
  applicantId: string;

  /** 신청자 표시명 */
  @Column({ name: 'applicant_name', nullable: true })
  applicantName: string;

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
