/**
 * NeturePartnerRecruitment Entity
 *
 * WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1
 *
 * 제품 × 판매자 단위 파트너 모집 공고
 * 상태: recruiting (모집중) / closed (마감)
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
