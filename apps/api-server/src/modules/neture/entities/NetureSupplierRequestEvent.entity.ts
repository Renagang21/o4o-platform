/**
 * NetureSupplierRequestEvent Entity
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.2
 *
 * 판매자 신청에 대한 이벤트 로그
 * 승인/거절 시 감사 추적(audit trail)을 위한 별도 기록
 *
 * 기록 항목:
 * - 승인자(supplierId)
 * - 시각(timestamp)
 * - 대상(sellerId, productId)
 * - 이벤트 유형(approved, rejected)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum RequestEventType {
  CREATED = 'created',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('neture_supplier_request_events')
export class NetureSupplierRequestEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 대상 신청 ID
  @Column({ name: 'request_id' })
  requestId: string;

  // 이벤트 유형
  @Column({
    type: 'enum',
    enum: RequestEventType,
    name: 'event_type',
  })
  eventType: RequestEventType;

  // 행위자 (승인/거절한 공급자)
  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({ name: 'actor_name', nullable: true })
  actorName: string;

  // 대상 정보 (판매자)
  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_name' })
  sellerName: string;

  // 대상 정보 (제품)
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  // 서비스 정보
  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'service_name' })
  serviceName: string;

  // 이전 상태 → 새 상태
  @Column({ name: 'from_status', nullable: true })
  fromStatus: string;

  @Column({ name: 'to_status' })
  toStatus: string;

  // 추가 정보 (거절 사유 등)
  @Column({ type: 'text', nullable: true })
  reason: string;

  // 메타데이터
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
