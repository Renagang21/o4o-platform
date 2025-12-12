/**
 * PharmaDispatch Entity
 *
 * Phase 10: 의약품 배송/출고 정보
 *
 * 의약품은 특수 배송 규정이 존재하므로 별도 엔진 설계:
 * - 온도 관리 배송 (냉장/냉동)
 * - 마약류 특별 관리
 * - 배송 추적 정보
 *
 * @package @o4o/pharmaceutical-core
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
import { PharmaOrder } from './PharmaOrder.entity.js';

/**
 * 배송 상태
 */
export enum PharmaDispatchStatus {
  PENDING = 'pending',           // 출고 대기
  PREPARING = 'preparing',       // 출고 준비중
  DISPATCHED = 'dispatched',     // 출고 완료
  IN_TRANSIT = 'in_transit',     // 배송중
  OUT_FOR_DELIVERY = 'out_for_delivery', // 배송 출발
  DELIVERED = 'delivered',       // 배송 완료
  FAILED = 'failed',             // 배송 실패
  RETURNED = 'returned',         // 반송
}

/**
 * 온도 관리 유형
 */
export enum TemperatureControlType {
  NONE = 'none',                 // 온도 관리 불필요 (실온)
  REFRIGERATED = 'refrigerated', // 냉장 (2-8°C)
  FROZEN = 'frozen',             // 냉동 (-20°C 이하)
  CONTROLLED = 'controlled',     // 특수 온도 관리
}

@Entity('pharma_dispatches')
export class PharmaDispatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /**
   * 출고 번호
   */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  dispatchNumber!: string;

  /**
   * 배송 상태
   */
  @Column({
    type: 'enum',
    enum: PharmaDispatchStatus,
    default: PharmaDispatchStatus.PENDING,
  })
  status!: PharmaDispatchStatus;

  /**
   * 출고 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt?: Date;

  /**
   * 배송 완료 시점
   */
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  /**
   * 운송사 이름
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  carrierName?: string;

  /**
   * 운송장 번호
   */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber?: string;

  /**
   * 배송 추적 URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  trackingUrl?: string;

  /**
   * 온도 관리 유형
   */
  @Column({
    type: 'enum',
    enum: TemperatureControlType,
    default: TemperatureControlType.NONE,
  })
  temperatureControl!: TemperatureControlType;

  /**
   * 온도 관리 필요 여부 (boolean shorthand)
   */
  @Column({ type: 'boolean', default: false })
  requiresColdChain!: boolean;

  /**
   * 목표 온도 (°C)
   */
  @Column({ type: 'jsonb', nullable: true })
  temperatureRange?: {
    min: number;
    max: number;
  };

  /**
   * 온도 모니터링 로그
   */
  @Column({ type: 'jsonb', nullable: true })
  temperatureLogs?: Array<{
    timestamp: Date;
    temperature: number;
    location?: string;
  }>;

  /**
   * 마약류 여부 (특별 관리)
   */
  @Column({ type: 'boolean', default: false })
  isNarcotics!: boolean;

  /**
   * 마약류 관리번호
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  narcoticsControlNumber?: string;

  /**
   * 배송 기사 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  driverInfo?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };

  /**
   * 수령 확인 정보
   */
  @Column({ type: 'jsonb', nullable: true })
  deliveryConfirmation?: {
    receiverName?: string;
    receiverSignature?: string;
    receivedAt?: Date;
    notes?: string;
  };

  /**
   * 배송 실패/반송 사유
   */
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /**
   * 재배송 시도 횟수
   */
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  /**
   * 예상 배송 시간
   */
  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryAt?: Date;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => PharmaOrder)
  @JoinColumn({ name: 'orderId' })
  order?: PharmaOrder;
}
