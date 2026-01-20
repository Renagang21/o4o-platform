/**
 * Seller Partner Entity
 *
 * WO-SIGNAGE-PHASE3-DEV-SELLER
 *
 * 판매자/파트너 프로필 관리
 * Digital Signage 광고/프로모션 콘텐츠 제공자
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
 * Partner Status
 */
export type SellerPartnerStatus = 'pending' | 'active' | 'suspended' | 'terminated';

/**
 * Partner Category
 */
export type SellerPartnerCategory =
  | 'manufacturer'    // 제조사
  | 'distributor'     // 유통사
  | 'brand'           // 브랜드
  | 'agency'          // 광고 대행사
  | 'local-business'  // 지역 사업자
  | 'other';

/**
 * Partner Tier (향후 과금/혜택 차등)
 */
export type SellerPartnerTier = 'basic' | 'standard' | 'premium' | 'enterprise';

/**
 * Seller Partner Entity
 *
 * @description 판매자/파트너 프로필
 * @schema signage_seller
 */
@Entity({ name: 'seller_partners', schema: 'signage_seller' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'category'])
export class SellerPartner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 소속 조직 ID (Multi-tenant)
   */
  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  /**
   * 파트너 표시명
   */
  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  /**
   * 파트너 코드 (unique per organization)
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  code!: string;

  /**
   * 파트너 설명
   */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * 파트너 로고 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  /**
   * 파트너 카테고리
   */
  @Column({ type: 'varchar', length: 30, default: 'other' })
  category!: SellerPartnerCategory;

  /**
   * 파트너 등급
   */
  @Column({ type: 'varchar', length: 20, default: 'basic' })
  tier!: SellerPartnerTier;

  /**
   * 파트너 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: SellerPartnerStatus;

  /**
   * 담당자 정보
   */
  @Column({ type: 'jsonb', default: {} })
  contactInfo!: {
    name?: string;
    email?: string;
    phone?: string;
  };

  /**
   * 계약 정보 (기록용)
   */
  @Column({ type: 'jsonb', default: {} })
  contractInfo!: {
    contractId?: string;
    startDate?: string;
    endDate?: string;
    terms?: string;
  };

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
