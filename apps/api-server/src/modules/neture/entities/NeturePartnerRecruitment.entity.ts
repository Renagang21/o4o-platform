/**
 * NeturePartnerRecruitment Entity
 *
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * 제품 × 판매자 단위 파트너 모집 공고
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

@Entity('neture_partner_recruitments')
@Unique(['productId', 'sellerId'])
@Index(['status'])
export class NeturePartnerRecruitment {
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
