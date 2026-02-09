/**
 * GlycopharmRequestActionLog Entity
 *
 * WO-O4O-REQUEST-POST-ACTION-PHASE2C
 *
 * 승인 후 자동 생성되는 후속 액션 로그.
 * 모든 결과물은 "초안(draft)"으로 생성 — 사람이 나중에 완료.
 *
 * action_type 매핑:
 * - consultation → consultation_log (draft)
 * - sample → sample_fulfillment (draft)
 * - order → order_draft (draft)
 * - survey_followup / info_followup → followup_log (completed)
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
import type { GlycopharmCustomerRequest } from './customer-request.entity.js';

/** 액션 유형 */
export type RequestActionType =
  | 'consultation_log'
  | 'sample_fulfillment'
  | 'order_draft'
  | 'followup_log';

/** 액션 상태 */
export type RequestActionStatus = 'draft' | 'in_progress' | 'completed';

@Entity({ name: 'glycopharm_request_action_logs', schema: 'public' })
@Index(['requestId', 'actionType'])
export class GlycopharmRequestActionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 원본 요청 ID */
  @Column({ name: 'request_id', type: 'uuid' })
  @Index()
  requestId!: string;

  @ManyToOne('GlycopharmCustomerRequest', { eager: false })
  @JoinColumn({ name: 'request_id' })
  request?: GlycopharmCustomerRequest;

  /** 액션 유형 */
  @Column({ name: 'action_type', type: 'varchar', length: 30 })
  actionType!: RequestActionType;

  /** 액션 상태 */
  @Column({ type: 'varchar', length: 20, default: "'draft'" })
  status!: RequestActionStatus;

  /** 처리자 ID */
  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy?: string;

  /** 메모 */
  @Column({ type: 'text', nullable: true })
  note?: string;

  /** 목적별 구조화 데이터 */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
