/**
 * Seller Entity
 *
 * S2S 구조에서 판매 측(Sell Side)을 담당
 *
 * ## S2S 역할
 * - Supplier의 Offer를 선택하여 Listing 생성
 * - 자신의 채널(스마트스토어, 쿠팡 등)에 상품 노출
 * - Product Master를 직접 소유하지 않음 (파생 데이터만 관리)
 *
 * ## 소유 데이터
 * - Seller Listing (Offer 기반의 판매 상품)
 * - Channel Configs (채널별 설정)
 *
 * ## 파생 데이터 (Listing에서 관리)
 * - 판매가 (sellingPrice)
 * - 상품 설명 (Offer 기반으로 가공)
 * - 채널별 특화 데이터
 *
 * ## 비고
 * - Seller의 자격/승인 조건은 서비스별 Extension에서 정의
 * - Core는 상태(status) 관리만 담당
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SellerListing } from './SellerListing.entity.js';

export enum SellerStatus {
  PENDING = 'pending',       // 승인 대기
  ACTIVE = 'active',         // 활성 상태
  SUSPENDED = 'suspended',   // 일시 중단
  INACTIVE = 'inactive',     // 비활성 상태
}

@Entity('dropshipping_sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({
    type: 'enum',
    enum: SellerStatus,
    default: SellerStatus.PENDING,
  })
  status!: SellerStatus;

  @Column({ type: 'jsonb', nullable: true })
  channelConfigs?: Record<string, any>; // 스마트스토어, 쿠팡 등 채널별 설정

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => SellerListing, (listing) => listing.seller)
  listings?: SellerListing[];
}
