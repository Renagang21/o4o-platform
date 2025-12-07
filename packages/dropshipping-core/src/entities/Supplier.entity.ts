/**
 * Supplier Entity
 *
 * 공급자 정보 및 상태 관리
 * Dropshipping 생태계에서 상품을 제공하는 공급자를 나타냅니다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SupplierProductOffer } from './SupplierProductOffer.entity.js';

export enum SupplierStatus {
  PENDING = 'pending',       // 승인 대기
  ACTIVE = 'active',         // 활성 상태
  SUSPENDED = 'suspended',   // 일시 중단
  INACTIVE = 'inactive',     // 비활성 상태
}

@Entity('dropshipping_suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: SupplierStatus,
    default: SupplierStatus.PENDING,
  })
  status!: SupplierStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => SupplierProductOffer, (offer) => offer.supplier)
  offers?: SupplierProductOffer[];
}
