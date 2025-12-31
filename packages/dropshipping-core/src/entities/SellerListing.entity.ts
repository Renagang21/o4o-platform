/**
 * SellerListing Entity
 *
 * S2S 구조에서 Seller가 소유하는 파생 데이터
 *
 * ## S2S 역할
 * - Seller가 Offer를 선택하여 자신의 채널에 등록한 판매 상품
 * - Product Master/Offer의 정보를 기반으로 표현(Presentation) 생성
 * - 원본 데이터를 직접 수정하지 않음
 *
 * ## 소유권 구조
 * - ProductMaster (Supplier 소유) → Offer (Supplier 소유) → Listing (Seller 소유)
 *
 * ## Seller 소유 필드 (파생 데이터)
 * - title (판매 제목 - Offer 기반으로 가공)
 * - description (판매 설명 - Offer 기반으로 가공)
 * - sellingPrice (판매가 - Seller가 결정)
 * - channel (판매 채널)
 * - channelSpecificData (채널별 특화 데이터)
 *
 * ## 비고
 * - Listing은 Offer에 종속 (Offer 비활성화 시 Listing도 영향)
 * - Listing 생성 조건은 서비스별 Extension에서 정의
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
} from 'typeorm';
import { Seller } from './Seller.entity.js';
import { SupplierProductOffer } from './SupplierProductOffer.entity.js';
import { OrderRelay } from './OrderRelay.entity.js';

export enum ListingStatus {
  DRAFT = 'draft',           // 작성 중
  ACTIVE = 'active',         // 판매 중
  PAUSED = 'paused',         // 일시 중지
  SOLD_OUT = 'sold_out',     // 품절
  DELISTED = 'delisted',     // 판매 종료
}

export enum ListingChannel {
  SMARTSTORE = 'smartstore',  // 네이버 스마트스토어
  COUPANG = 'coupang',       // 쿠팡
  CUSTOM = 'custom',         // 커스텀 채널
}

@Entity('dropshipping_seller_listings')
export class SellerListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sellerId!: string;

  @Column({ type: 'uuid' })
  offerId!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellingPrice!: number; // 판매가

  @Column({
    type: 'enum',
    enum: ListingChannel,
    default: ListingChannel.CUSTOM,
  })
  channel!: ListingChannel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalListingId?: string; // 외부 채널의 상품 ID

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.DRAFT,
  })
  status!: ListingStatus;

  @Column({ type: 'jsonb', nullable: true })
  channelSpecificData?: Record<string, any>; // 채널별 특화 데이터

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Seller, (seller) => seller.listings)
  @JoinColumn({ name: 'sellerId' })
  seller?: Seller;

  @ManyToOne(() => SupplierProductOffer, (offer) => offer.listings)
  @JoinColumn({ name: 'offerId' })
  offer?: SupplierProductOffer;

  @OneToMany(() => OrderRelay, (order) => order.listing)
  orders?: OrderRelay[];
}
