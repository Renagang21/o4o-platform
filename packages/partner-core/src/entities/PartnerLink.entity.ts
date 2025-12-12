/**
 * PartnerLink Entity
 *
 * 파트너가 생성한 단축 링크
 *
 * 파트너는 다양한 타겟(listing, product, page 등)에 대한
 * 추적 가능한 단축 링크를 생성하여 유입을 추적합니다.
 *
 * @package @o4o/partner-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Partner } from './Partner.entity.js';
import { PartnerClick } from './PartnerClick.entity.js';

/**
 * 링크 타겟 유형
 */
export enum LinkTargetType {
  LISTING = 'listing',     // 판매 리스팅
  PRODUCT = 'product',     // 상품
  PAGE = 'page',           // 페이지
  CAMPAIGN = 'campaign',   // 캠페인
  CATEGORY = 'category',   // 카테고리
  EXTERNAL = 'external',   // 외부 링크
}

/**
 * 링크 상태
 */
export enum PartnerLinkStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('partner_links')
export class PartnerLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 파트너 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 타겟 유형
   */
  @Column({
    type: 'enum',
    enum: LinkTargetType,
    default: LinkTargetType.PRODUCT,
  })
  targetType!: LinkTargetType;

  /**
   * 타겟 ID (listing/product/page의 ID)
   */
  @Index()
  @Column({ type: 'varchar', length: 255 })
  targetId!: string;

  /**
   * 원본 URL
   */
  @Column({ type: 'varchar', length: 1000 })
  originalUrl!: string;

  /**
   * 단축 URL (해시)
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  shortUrl!: string;

  /**
   * 제품 유형 (Cosmetics, Tourism, General 등)
   * 의약품(pharmaceutical)은 자동 차단됨
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  productType?: string;

  /**
   * 총 클릭 수
   */
  @Column({ type: 'int', default: 0 })
  clickCount!: number;

  /**
   * 총 전환 수
   */
  @Column({ type: 'int', default: 0 })
  conversionCount!: number;

  /**
   * 링크 상태
   */
  @Column({
    type: 'enum',
    enum: PartnerLinkStatus,
    default: PartnerLinkStatus.ACTIVE,
  })
  status!: PartnerLinkStatus;

  /**
   * 만료일
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  /**
   * 커스텀 별칭
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  alias?: string;

  /**
   * UTM 파라미터
   */
  @Column({ type: 'jsonb', nullable: true })
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Partner, (partner) => partner.links)
  @JoinColumn({ name: 'partnerId' })
  partner?: Partner;

  @OneToMany(() => PartnerClick, (click) => click.link)
  clicks?: PartnerClick[];
}
