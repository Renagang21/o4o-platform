/**
 * Supplier Entity (Stub)
 *
 * This is a minimal stub entity to satisfy TypeScript compilation.
 * Used by SupplierEntityController and AdminSupplierController.
 *
 * @deprecated Consider migrating to a package-based supplier system
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import type { Product } from './Product.js';
import type { BusinessInfo } from './BusinessInfo.js';

export enum SupplierStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected'
}

export enum SupplierTier {
  BASIC = 'basic',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

@Entity('suppliers')
@Index(['userId'], { unique: true })
@Index(['status'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PENDING
  })
  status!: SupplierStatus;

  @Column({
    type: 'enum',
    enum: SupplierTier,
    default: SupplierTier.BASIC
  })
  tier!: SupplierTier;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true, name: 'company_description' })
  companyDescription?: string;

  @Column({ type: 'simple-array', nullable: true })
  specialties?: string[];

  @Column({ type: 'simple-array', nullable: true })
  certifications?: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({ type: 'json', nullable: true, name: 'seller_tier_discounts' })
  sellerTierDiscounts?: Record<string, number>;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0, name: 'default_partner_commission_rate' })
  defaultPartnerCommissionRate!: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_id' })
  taxId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_name' })
  bankName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bank_account' })
  bankAccount?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'account_holder' })
  accountHolder?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'contact_person' })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'contact_phone' })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'json', nullable: true, name: 'operating_hours' })
  operatingHours?: Array<{ day: string; open: string; close: string }>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'simple-array', nullable: true, name: 'shipping_methods' })
  shippingMethods?: string[];

  @Column({ type: 'simple-array', nullable: true, name: 'payment_methods' })
  paymentMethods?: string[];

  @Column({ type: 'int', nullable: true, name: 'founded_year' })
  foundedYear?: number;

  @Column({ type: 'int', nullable: true, name: 'employee_count' })
  employeeCount?: number;

  @Column({ type: 'json', nullable: true, name: 'social_media' })
  socialMedia?: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'average_rating' })
  averageRating!: number;

  @Column({ type: 'int', default: 0, name: 'total_reviews' })
  totalReviews!: number;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt?: Date;

  @ManyToOne('BusinessInfo', { nullable: true })
  @JoinColumn({ name: 'business_info_id' })
  businessInfo?: BusinessInfo;

  @OneToMany('Product', 'supplier')
  products?: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Approve this supplier
   */
  approve(adminId: string): void {
    this.status = SupplierStatus.ACTIVE;
    this.approvedBy = adminId;
    this.approvedAt = new Date();
  }

  /**
   * Reject this supplier
   */
  reject(): void {
    this.status = SupplierStatus.REJECTED;
  }
}
