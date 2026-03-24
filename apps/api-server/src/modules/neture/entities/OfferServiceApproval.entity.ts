/**
 * OfferServiceApproval Entity
 *
 * 서비스 레벨 상품 승인 — 공급자가 선택한 서비스별 승인 상태 관리
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
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

@Entity('offer_service_approvals')
@Index('idx_osa_offer_id', ['offerId'])
export class OfferServiceApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @ManyToOne('SupplierProductOffer', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer?: SupplierProductOffer;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  serviceKey: string;

  @Column({ name: 'approval_status', type: 'varchar', length: 20, default: 'pending' })
  approvalStatus: string;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
