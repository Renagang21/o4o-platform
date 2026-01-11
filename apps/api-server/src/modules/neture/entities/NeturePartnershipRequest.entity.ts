import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { NeturePartnershipProduct } from './NeturePartnershipProduct.entity';

export enum PartnershipStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  CLOSED = 'CLOSED',
}

@Entity('neture_partnership_requests')
export class NeturePartnershipRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string; // Soft reference (no FK to Core)

  @Column({ name: 'seller_name' })
  sellerName: string;

  @Column({ name: 'seller_service_type', nullable: true })
  sellerServiceType: string; // 'glycopharm', 'k-cosmetics', etc.

  @Column({ name: 'seller_store_url', type: 'text', nullable: true })
  sellerStoreUrl: string;

  @Column({ name: 'product_count', type: 'int', default: 0 })
  productCount: number;

  @Column({ name: 'period_start', type: 'date', nullable: true })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date', nullable: true })
  periodEnd: Date;

  @Column({ name: 'revenue_structure', type: 'text', nullable: true })
  revenueStructure: string;

  @Column({
    type: 'enum',
    enum: PartnershipStatus,
    default: PartnershipStatus.OPEN,
  })
  status: PartnershipStatus;

  @Column({ name: 'promotion_sns', type: 'boolean', default: false })
  promotionSns: boolean;

  @Column({ name: 'promotion_content', type: 'boolean', default: false })
  promotionContent: boolean;

  @Column({ name: 'promotion_banner', type: 'boolean', default: false })
  promotionBanner: boolean;

  @Column({ name: 'promotion_other', type: 'text', nullable: true })
  promotionOther: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_kakao', type: 'text', nullable: true })
  contactKakao: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'matched_at', type: 'timestamp', nullable: true })
  matchedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => NeturePartnershipProduct, (product) => product.partnershipRequest)
  products: NeturePartnershipProduct[];
}
