/**
 * SellerRecruitment Entity — 공급자의 판매자(매장) 모집 공고
 *
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 *   (구 NeturePartnerRecruitment · WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1 에서 분리)
 *
 * 도메인: Supplier → Store 판매자 모집. Legacy Partner(제휴마케팅)가 **아니다**
 *   (O4O-ROLE-WORKSPACE-ARCHITECTURE-V1 §7 · IR-O4O-ROLE-WORKSPACE-REFACTOR-PREFLIGHT-V1 §B-8).
 *
 * ⚠️ temporary legacy persistence seam:
 *   물리 테이블명 `neture_partner_recruitments` 는 과거 명칭이다. 이번 WO 는 DDL 을 만들지 않으므로
 *   테이블/컬럼명은 그대로 두고 **이 엔티티만이 그 이름을 안다**. rename 은 후속
 *   WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 대상.
 *
 * 상태:
 *  - status(RecruitmentStatus): 모집 운영 상태 — recruiting (모집중) / closed (마감)
 *  - exposureStatus(ExposureStatus): 서비스 노출 승인 상태 — pending / approved / rejected
 *    (WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1, IR dbd2ca435 B안. 두 축은 분리.)
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

export enum RecruitmentStatus {
  RECRUITING = 'recruiting',
  CLOSED = 'closed',
}

/**
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1
 * 서비스 노출 승인 상태 (모집 운영 상태 RecruitmentStatus 와 분리).
 *  - PENDING: 운영자 노출 승인 대기 (신규 모집 기본값)
 *  - APPROVED: 운영자가 해당 서비스 노출 승인 → browse 노출 / apply 허용
 *  - REJECTED: 운영자가 노출 반려 → browse 미노출 / apply 차단
 */
export enum ExposureStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** 물리 테이블명 (legacy seam) — 이 상수 밖에서 문자열을 반복하지 않는다. */
export const SELLER_RECRUITMENT_TABLE = 'neture_partner_recruitments';

@Entity(SELLER_RECRUITMENT_TABLE)
// WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1:
// 서비스당 1 row — 같은 상품×공급자라도 service 별 독립 모집(각자 exposure_status).
@Unique(['productId', 'sellerId', 'serviceId'])
@Index(['status'])
export class SellerRecruitment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ name: 'consumer_price', type: 'decimal', precision: 10, scale: 0, default: 0 })
  consumerPrice: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number;

  /** 모집 주체 = 공급자 user id (C bridge offer 해소 전제). 컬럼명 seller_id 는 legacy. */
  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_name' })
  sellerName: string;

  @Column({ name: 'shop_url', type: 'text', nullable: true })
  shopUrl: string;

  @Column({ name: 'service_name', nullable: true })
  serviceName: string;

  @Column({ name: 'service_id', nullable: true })
  serviceId: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: RecruitmentStatus,
    default: RecruitmentStatus.RECRUITING,
  })
  status: RecruitmentStatus;

  // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: 서비스 노출 승인 상태 (운영 상태와 분리)
  @Column({
    name: 'exposure_status',
    type: 'enum',
    enum: ExposureStatus,
    default: ExposureStatus.PENDING,
  })
  exposureStatus: ExposureStatus;

  @Column({ name: 'exposure_reviewed_at', type: 'timestamp', nullable: true })
  exposureReviewedAt: Date | null;

  @Column({ name: 'exposure_reviewed_by', type: 'uuid', nullable: true })
  exposureReviewedBy: string | null;

  @Column({ name: 'exposure_review_note', type: 'text', nullable: true })
  exposureReviewNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
