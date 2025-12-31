/**
 * Supplier Entity
 *
 * S2S 구조에서 공급 측(Supply Side)을 담당
 *
 * ## S2S 역할
 * - Product Master의 소유자 (상품 원본 정보 관리)
 * - Offer를 통해 Seller에게 공급 조건 제시
 * - 주문 발생 시 Order Relay를 통해 주문 수신
 *
 * ## 소유 데이터
 * - Product Master (상품 원본)
 * - Supplier Product Offer (공급 조건)
 *
 * ## 비고
 * - Supplier의 자격/승인 조건은 서비스별 Extension에서 정의
 * - Core는 상태(status) 관리만 담당
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
