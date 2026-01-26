/**
 * PaymentEventLog Entity
 *
 * WO-O4O-PAYMENT-CORE-V0.1
 *
 * 결제 이벤트 로그 저장 엔티티
 *
 * 목적:
 * - 모든 결제 이벤트 영구 저장
 * - 디버깅 및 감사 추적
 * - 이벤트 재생 (향후 확장)
 *
 * ⚠️ ESM Entity 규칙 준수:
 * - 관계 정의 시 문자열 사용
 * - type import 사용
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PaymentEventType } from '../types/PaymentEvents.js';

@Entity('payment_event_logs')
export class PaymentEventLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 이벤트 타입
   */
  @Index()
  @Column({
    type: 'varchar',
    length: 50,
  })
  eventType!: PaymentEventType;

  /**
   * 내부 결제 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  paymentId!: string;

  /**
   * 트랜잭션 ID
   */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  transactionId!: string;

  /**
   * 주문 ID
   */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  orderId?: string;

  /**
   * 이벤트 페이로드 (JSON)
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  /**
   * 이벤트 발생 시각
   */
  @Index()
  @Column({ type: 'timestamp' })
  eventTimestamp!: Date;

  /**
   * 이벤트 소스 (서비스명)
   */
  @Column({ type: 'varchar', length: 50, default: 'payment-core' })
  source!: string;

  /**
   * 이벤트 버전
   */
  @Column({ type: 'varchar', length: 10, default: 'v0.1' })
  version!: string;

  /**
   * 처리 상태
   *
   * 이벤트가 정상적으로 발행되었는지 추적
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'published',
  })
  status!: 'pending' | 'published' | 'failed';

  /**
   * 에러 메시지 (실패 시)
   */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * 레코드 생성 시각
   */
  @CreateDateColumn()
  createdAt!: Date;
}
