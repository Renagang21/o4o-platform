/**
 * Seller Content Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * 판매자 콘텐츠 관리
 * Global Content + Clone 모델 (Force 미지원)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

/**
 * Content Type
 */
export type SellerContentType =
  | 'product-ad'      // 제품 광고
  | 'brand-video'     // 브랜드 영상
  | 'promotion'       // 프로모션/할인
  | 'event'           // 이벤트 안내
  | 'banner';         // 배너 이미지

/**
 * Content Status
 */
export type SellerContentStatus =
  | 'draft'           // 작성 중
  | 'pending'         // 승인 대기
  | 'approved'        // 승인됨 (노출 가능)
  | 'rejected'        // 거절됨
  | 'archived';       // 보관됨

/**
 * Content Scope
 */
export type SellerContentScope = 'global' | 'store';

/**
 * Media Assets
 */
export interface SellerMediaAssets {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  qrCodeUrl?: string;
  landingUrl?: string;
  additionalAssets?: string[];
}

/**
 * Seller Content Entity
 *
 * @description 판매자 콘텐츠
 * @schema signage_seller
 *
 * IMPORTANT: Force는 항상 false
 * Seller 콘텐츠는 Store가 자율적으로 Clone하여 사용
 */
@Entity({ name: 'seller_contents', schema: 'signage_seller' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'campaignId'])
@Index(['organizationId', 'partnerId'])
@Index(['scope', 'status'])
export class SellerContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (Multi-tenant)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 파트너 ID (SellerPartner 참조)
   */
  @Column({ type: 'uuid' })
  @Index()
  partnerId!: string;

  /**
   * 캠페인 ID (SellerCampaign 참조, optional)
   */
  @Column({ type: 'uuid', nullable: true })
  campaignId!: string | null;

  /**
   * 콘텐츠 제목
   */
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /**
   * 콘텐츠 설명
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * 콘텐츠 유형
   */
  @Column({ type: 'varchar', length: 30, default: 'product-ad' })
  contentType!: SellerContentType;

  /**
   * 미디어 에셋
   */
  @Column({ type: 'jsonb', default: {} })
  mediaAssets!: SellerMediaAssets;

  /**
   * 콘텐츠 소스
   * 항상 'seller-partner'
   */
  @Column({ type: 'varchar', length: 30, default: 'seller-partner' })
  source!: 'seller-partner';

  /**
   * 콘텐츠 범위
   * global: 모든 Store에서 조회 가능
   * store: Clone된 Store 전용
   */
  @Column({ type: 'varchar', length: 20, default: 'global' })
  scope!: SellerContentScope;

  /**
   * Force 여부
   * IMPORTANT: Seller는 항상 false (강제 노출 불가)
   */
  @Column({ type: 'boolean', default: false })
  isForced!: false;

  /**
   * 원본 콘텐츠 ID (Clone된 경우)
   */
  @Column({ type: 'uuid', nullable: true })
  parentContentId!: string | null;

  /**
   * 콘텐츠 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: SellerContentStatus;

  /**
   * Metrics 수집 활성화
   */
  @Column({ type: 'boolean', default: true })
  metricsEnabled!: boolean;

  /**
   * 승인자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  approvedBy!: string | null;

  /**
   * 승인 일시
   */
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  /**
   * 거절 사유
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  /**
   * 표시 순서
   */
  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  /**
   * Clone 횟수
   */
  @Column({ type: 'int', default: 0 })
  cloneCount!: number;

  /**
   * 총 노출 수 (집계)
   */
  @Column({ type: 'int', default: 0 })
  totalImpressions!: number;

  /**
   * 총 클릭 수 (집계)
   */
  @Column({ type: 'int', default: 0 })
  totalClicks!: number;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /**
   * 활성화 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 생성일시
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * 삭제일시 (Soft Delete)
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  /**
   * 버전 (Optimistic Locking)
   */
  @VersionColumn()
  version!: number;
}
