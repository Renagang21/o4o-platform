/**
 * OfferServicePrice Entity
 *
 * 서비스별 공급가 — offer_id + service_key 단위 별도 가격(SSOT).
 * price_general(기본/ fallback) 과 독립. 주문 단가 우선순위:
 *   event_price > offer_service_prices.unit_price > price_general > legacy opl.price
 *
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-FLOW-V1
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

@Entity('offer_service_prices')
@Index('idx_osp_offer_id', ['offerId'])
export class OfferServicePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey: string;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
