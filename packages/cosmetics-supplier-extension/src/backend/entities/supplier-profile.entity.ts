/**
 * Supplier Profile Entity
 *
 * 브랜드/공급사 프로필 정보
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SupplierStatus = 'pending' | 'approved' | 'suspended' | 'inactive';
export type SupplierTier = 'basic' | 'premium' | 'enterprise';

@Entity('cosmetics_supplier_profiles')
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @Column({ name: 'brand_name' })
  @Index()
  brandName!: string;

  @Column({ name: 'brand_name_en', nullable: true })
  brandNameEn?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'banner_url', nullable: true })
  bannerUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'business_registration_number', nullable: true })
  businessRegistrationNumber?: string;

  @Column({ name: 'policy_contact', nullable: true })
  policyContact?: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail?: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  @Index()
  status!: SupplierStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'basic',
  })
  tier!: SupplierTier;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionRate!: number;

  @Column({ name: 'approved_seller_count', type: 'int', default: 0 })
  approvedSellerCount!: number;

  @Column({ name: 'approved_partner_count', type: 'int', default: 0 })
  approvedPartnerCount!: number;

  @Column({ name: 'total_products', type: 'int', default: 0 })
  totalProducts!: number;

  @Column({ name: 'total_sales', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSales!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
