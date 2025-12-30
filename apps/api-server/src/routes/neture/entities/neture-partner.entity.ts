/**
 * NeturePartner Entity
 *
 * Phase D-1: Neture API Server 골격 구축
 * Schema: neture (isolated from Core)
 *
 * 판매자 / 공급자 / 파트너 통합 엔티티
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { NetureProduct } from './neture-product.entity.js';

/**
 * Partner Type Enum
 */
export enum NeturePartnerType {
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  PARTNER = 'partner',
}

/**
 * Partner Status Enum
 */
export enum NeturePartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

/**
 * Partner Contact Interface
 */
export interface NeturePartnerContact {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
}

/**
 * Partner Address Interface
 */
export interface NeturePartnerAddress {
  zipCode?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
}

@Entity({ name: 'neture_partners', schema: 'neture' })
export class NeturePartner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ name: 'business_name', type: 'varchar', length: 200, nullable: true })
  businessName?: string | null;

  @Column({ name: 'business_number', type: 'varchar', length: 50, nullable: true })
  @Index()
  businessNumber?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: NeturePartnerType.PARTNER,
  })
  @Index()
  type!: NeturePartnerType;

  @Column({
    type: 'varchar',
    length: 20,
    default: NeturePartnerStatus.PENDING,
  })
  @Index()
  status!: NeturePartnerStatus;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  contact?: NeturePartnerContact | null;

  @Column({ type: 'jsonb', nullable: true })
  address?: NeturePartnerAddress | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;

  // user_id는 참조만 (Core FK 제약 금지)
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => NetureProduct, (product) => product.partner)
  products?: NetureProduct[];
}
