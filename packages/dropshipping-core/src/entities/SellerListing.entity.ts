/**
 * SellerListing Entity
 *
 * 판매자가 특정 채널에 등록한 판매용 상품
 *
 * 하나의 SupplierProductOffer를 기반으로 Seller가 자신의 채널(스마트스토어, 쿠팡 등)에
 * 등록한 상품을 나타냅니다.
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
