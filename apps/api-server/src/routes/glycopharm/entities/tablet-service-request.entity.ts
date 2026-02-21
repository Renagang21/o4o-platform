/**
 * TabletServiceRequest Entity
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * 매장 태블릿 주문 요청 큐.
 * 결제 없이 고객이 상품 선택 → 근무자에게 요청 전달.
 * 상태 모델: requested → acknowledged → served | cancelled
 *
 * NOTE: 이것은 주문(order) 테이블이 아닌 서비스 요청(request) 큐이다.
 * E-commerce Core와 분리되어 운영된다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 요청 상태 */
export type TabletServiceRequestStatus =
  | 'requested'     // 고객이 생성
  | 'acknowledged'  // 근무자 확인
  | 'served'        // 제공 완료
  | 'cancelled';    // 취소

/** 요청 항목 */
export interface TabletRequestItem {
  productId: string;
  quantity: number;
  productName: string;
  price: number;
}

@Entity({ name: 'tablet_service_requests' })
@Index(['pharmacyId', 'status'])
@Index(['pharmacyId', 'createdAt'])
export class TabletServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ type: 'jsonb' })
  items!: TabletRequestItem[];

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
  customerName?: string;

  @Column({ type: 'varchar', length: 20, default: 'requested' })
  status!: TabletServiceRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'acknowledged_at', type: 'timestamp with time zone', nullable: true })
  acknowledgedAt?: Date;

  @Column({ name: 'served_at', type: 'timestamp with time zone', nullable: true })
  servedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt?: Date;
}
