/**
 * GlycopharmEvent Entity
 *
 * WO-O4O-REQUEST-EVENT-CONNECTION-PHASE2A
 *
 * 이벤트는 "사람의 판단을 요구하지 않는 관찰 가능한 행동 기록"이다.
 * - impression: 콘텐츠 노출
 * - click: 의도적 반응 (버튼, 카드, 터치)
 * - qr_scan: QR 코드 스캔 → 시스템 진입
 *
 * 기준: O4O-EXPOSURE-EVENT-DEFINITION-V1
 * 승격 조건 충족 시 GlycopharmCustomerRequest로 연결
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** 표준 이벤트 타입 3종 (O4O-EXPOSURE-EVENT-DEFINITION-V1) */
export type GlycopharmEventType = 'impression' | 'click' | 'qr_scan';

/** 이벤트 출처 타입 */
export type GlycopharmEventSourceType = 'qr' | 'tablet' | 'web' | 'signage' | 'print';

/** QR purpose (O4O-QR-PURPOSE-DEFINITION-V1) */
export type GlycopharmEventPurpose =
  | 'info'
  | 'survey'
  | 'sample'
  | 'consultation'
  | 'order'
  | 'event';

@Entity({ name: 'glycopharm_events', schema: 'public' })
@Index(['pharmacyId', 'eventType', 'createdAt'])
@Index(['sourceType', 'sourceId', 'createdAt'])
export class GlycopharmEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 대상 약국 ID */
  @Column({ name: 'pharmacy_id', type: 'uuid' })
  pharmacyId!: string;

  /** 이벤트 유형 */
  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType!: GlycopharmEventType;

  /** 이벤트 출처 타입 */
  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType!: GlycopharmEventSourceType;

  /** 출처 식별자 (QR ID, 콘텐츠 ID 등) */
  @Column({ name: 'source_id', type: 'varchar', length: 255, nullable: true })
  sourceId?: string;

  /** QR purpose (해당하는 경우) */
  @Column({ type: 'varchar', length: 30, nullable: true })
  purpose?: GlycopharmEventPurpose;

  /** 추가 메타데이터 (디바이스 정보, 부가 맥락) */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /** 승격된 Request ID (null이면 미승격) */
  @Column({ name: 'promoted_to_request_id', type: 'uuid', nullable: true })
  promotedToRequestId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
