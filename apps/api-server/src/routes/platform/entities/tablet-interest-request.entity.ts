/**
 * TabletInterestRequest Entity
 *
 * WO-O4O-TABLET-MODULE-V1
 *
 * 매장 태블릿 관심 요청 큐.
 * 고객이 개별 상품에 관심 표시 → 직원 알림 → 상담/안내.
 * 상태 모델: REQUESTED → ACKNOWLEDGED → COMPLETED | CANCELLED
 *
 * NOTE: 이것은 주문(order) 테이블이 아닌 관심 요청(interest) 큐이다.
 * E-commerce Core와 분리되어 운영된다.
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
import type { ProductMaster } from '../../../modules/neture/entities/ProductMaster.entity.js';

export enum InterestRequestStatus {
  REQUESTED = 'REQUESTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'tablet_interest_requests' })
@Index(['organizationId', 'status'])
@Index(['organizationId', 'createdAt'])
export class TabletInterestRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'master_id', type: 'uuid' })
  masterId!: string;

  @ManyToOne('ProductMaster', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'master_id' })
  master?: ProductMaster;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
  customerName?: string;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote?: string;

  @Column({
    type: 'enum',
    enum: InterestRequestStatus,
    enumName: 'tablet_interest_request_status_enum',
    default: InterestRequestStatus.REQUESTED,
  })
  status!: InterestRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;
}
