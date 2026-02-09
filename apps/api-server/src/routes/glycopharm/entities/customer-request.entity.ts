/**
 * CustomerRequest Entity
 *
 * WO-O4O-COMMON-REQUEST-IMPLEMENTATION-PHASE1
 *
 * 고객 요청(Request)은 "사람의 판단이 필요한 업무"로 승격된 이벤트다.
 * - QR 스캔(consultation/sample/order purpose)
 * - 태블릿 "직원에게 요청"
 * - 설문 후 후속 대응
 *
 * 상태 모델: pending → approved | rejected | cancelled
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
import type { User } from '../../../modules/auth/entities/User.js';

/** 요청 목적 */
export type CustomerRequestPurpose =
  | 'consultation'    // 상담 요청
  | 'sample'          // 샘플 신청
  | 'order'           // 주문 의도
  | 'survey_followup' // 설문 후 후속 대응
  | 'info_followup';  // 정보 요청 후 설명 필요

/** 요청 출처 타입 */
export type CustomerRequestSourceType =
  | 'qr'      // QR 코드 스캔
  | 'tablet'  // 태블릿/키오스크
  | 'web'     // 웹 인터페이스
  | 'signage' // 디지털 사이니지
  | 'print';  // 전단/POP

/** 요청 상태 */
export type CustomerRequestStatus =
  | 'pending'   // 처리 대기
  | 'approved'  // 승인됨
  | 'rejected'  // 거절됨
  | 'cancelled'; // 취소됨

@Entity({ name: 'glycopharm_customer_requests', schema: 'public' })
@Index(['pharmacyId', 'status'])
@Index(['pharmacyId', 'requestedAt'])
export class GlycopharmCustomerRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 대상 약국 ID */
  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  /** 요청 목적 */
  @Column({
    type: 'varchar',
    length: 30,
  })
  purpose!: CustomerRequestPurpose;

  /** 요청 출처 타입 */
  @Column({
    name: 'source_type',
    type: 'varchar',
    length: 20,
  })
  sourceType!: CustomerRequestSourceType;

  /** 출처 식별자 (QR ID, 플레이리스트 ID 등) */
  @Column({
    name: 'source_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sourceId?: string;

  /** 요청 상태 */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: CustomerRequestStatus;

  /** 고객 연락처 (선택) */
  @Column({
    name: 'customer_contact',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerContact?: string;

  /** 고객 이름 (선택) */
  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  customerName?: string;

  /** 요청 시각 */
  @Column({
    name: 'requested_at',
    type: 'timestamp with time zone',
  })
  requestedAt!: Date;

  /** 처리자 ID */
  @Column({
    name: 'handled_by',
    type: 'uuid',
    nullable: true,
  })
  handledBy?: string;

  @ManyToOne('User', { eager: false })
  @JoinColumn({ name: 'handled_by' })
  handler?: User;

  /** 처리 시각 */
  @Column({
    name: 'handled_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  handledAt?: Date;

  /** 처리 메모/사유 */
  @Column({
    name: 'handle_note',
    type: 'text',
    nullable: true,
  })
  handleNote?: string;

  /** 추가 메타데이터 (JSON) */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
