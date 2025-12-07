/**
 * Seller Entity
 *
 * 판매자 등록 및 승인 구조
 * Dropshipping 생태계에서 상품을 판매하는 판매자를 나타냅니다.
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
