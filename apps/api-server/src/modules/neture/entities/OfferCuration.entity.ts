/**
 * OfferCuration Entity
 *
 * 큐레이션 — 승인된 Offer 중 operator가 노출 선택
 * placement: featured(추천), category(카테고리), banner(배너)
 *
 * WO-NETURE-PRODUCT-CURATION-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { SupplierProductOffer } from './SupplierProductOffer.entity.js';

@Entity('offer_curations')
@Index('idx_oc_offer_id', ['offerId'])
export class OfferCuration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey: string;

  @Column({ type: 'varchar', length: 50 })
  placement: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'start_at', type: 'timestamp', nullable: true })
  startAt: Date | null;

  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
