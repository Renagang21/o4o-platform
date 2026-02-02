import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { NetureSupplierProduct } from './NetureSupplierProduct.entity.js';

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ContactVisibility {
  PUBLIC = 'public',
  PARTNERS = 'partners',
  PRIVATE = 'private',
}

@Entity('neture_suppliers')
export class NetureSupplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'pricing_policy', type: 'text', nullable: true })
  pricingPolicy: string;

  @Column({ nullable: true })
  moq: string;

  @Column({ name: 'shipping_standard', type: 'text', nullable: true })
  shippingStandard: string;

  @Column({ name: 'shipping_island', type: 'text', nullable: true })
  shippingIsland: string;

  @Column({ name: 'shipping_mountain', type: 'text', nullable: true })
  shippingMountain: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', nullable: true })
  contactPhone: string;

  @Column({ name: 'contact_website', type: 'text', nullable: true })
  contactWebsite: string;

  @Column({ name: 'contact_kakao', type: 'text', nullable: true })
  contactKakao: string;

  @Column({ name: 'contact_email_visibility', type: 'varchar', length: 10, default: ContactVisibility.PUBLIC })
  contactEmailVisibility: ContactVisibility;

  @Column({ name: 'contact_phone_visibility', type: 'varchar', length: 10, default: ContactVisibility.PRIVATE })
  contactPhoneVisibility: ContactVisibility;

  @Column({ name: 'contact_website_visibility', type: 'varchar', length: 10, default: ContactVisibility.PUBLIC })
  contactWebsiteVisibility: ContactVisibility;

  @Column({ name: 'contact_kakao_visibility', type: 'varchar', length: 10, default: ContactVisibility.PARTNERS })
  contactKakaoVisibility: ContactVisibility;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.ACTIVE,
  })
  status: SupplierStatus;

  /**
   * User ID linking this supplier to a user account
   * Used for authentication - when user logs in, find their supplier by user_id
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @OneToMany('NetureSupplierProduct', 'supplier')
  products: NetureSupplierProduct[];
}
