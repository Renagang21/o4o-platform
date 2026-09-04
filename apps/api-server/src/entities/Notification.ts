/**
 * Notification Entity
 * Phase PD-7: Automation & Notification Foundation
 *
 * Stores in-app and email notifications for users
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from './User.js';

// Notification channel types
export type NotificationChannel = 'in_app' | 'email';

// Notification event types
// WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1 (B축):
//   dead member 18개를 제거했다. 판정 근거(current main 전수 census):
//     - producer 0 / consumer 0 (src 기준. dist/ 는 빌드 산출물이라 제외)
//     - 프로덕션 notifications.type distinct 16종 중 해당 18종 row 0건 → serialized contract 0
//   제거 목록:
//     order.new · order.status_changed · price.changed · stock.low ·
//     role.approved · role.application_submitted · settlement.new_pending ·
//     member.license_expiring · member.license_expired · member.verification_expired ·
//     member.fee_overdue_warning · member.fee_overdue · member.report_rejected ·
//     member.education_deadline ·
//     pharmacy.request_submitted · pharmacy.request_approved · pharmacy.request_rejected ·
//     store.online_sales_order_created
//   'settlement.paid' 는 §11 에 따라 canonical 정산 완료 이벤트로 활성화해 유지한다
//   (producer: neture-settlement.service.ts).
export type NotificationType =
  | 'settlement.paid'
  // WO-O4O-LMS-NOTIFICATION-INTEGRATION-V1: LMS course lifecycle events
  | 'lms.course_submitted'
  | 'lms.course_approved'
  | 'lms.course_rejected'
  // WO-NETURE-MARKET-TRIAL-NOTIFICATION-INTEGRATION-V1: Market Trial lifecycle events
  | 'market_trial.submitted'
  | 'market_trial.approved'
  | 'market_trial.rejected'
  | 'market_trial.joined'
  | 'market_trial.recruiting_success'
  | 'market_trial.recruiting_failed'
  | 'market_trial.outcome_confirming'
  | 'market_trial.fulfilled'
  // WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1: Contact 문의 등록 알림
  | 'contact.new'
  // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1
  | 'member.registration_pending'    // 운영자: 신규 회원가입 신청 접수
  | 'member.registration_approved'   // 신청자: 회원가입 승인
  | 'member.registration_rejected'   // 신청자: 회원가입 반려
  // WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1: 판매자 모집 신청자 알림
  | 'recruitment.application_approved'     // 판매자: 모집 신청 승인
  | 'recruitment.application_rejected'     // 판매자: 모집 신청 반려
  | 'recruitment.participation_terminated' // 판매자: 모집 참여 해지
  // WO-O4O-KPA-STORE-CONSULTATION-REQUEST-NOTIFICATION-WIRING-V1
  | 'store.consultation_requested'   // 매장 사용자: 신규 상담(태블릿 관심) 요청 접수
  // WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P3): 매장 신규 상품 등록 요청
  | 'store.product_request_submitted'         // 운영자/관리자: 신규 상품 등록 요청 접수
  | 'store.product_request_revision_requested' // 요청 매장: 보완 요청
  | 'store.product_request_approved'          // 요청 매장: 등록 완료(신규 승인/기존 연결)
  | 'store.product_request_rejected'          // 요청 매장: 등록 불가
  | 'custom';

// Legacy interface for backward compatibility
export interface NotificationData {
  title: string;
  message: string;
  type: string;
  recipientId: string;
  data?: any;
}

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
@Index(['serviceKey', 'userId', 'createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['type', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Recipient user (userId for PD-7, recipientId for backward compatibility)
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // O4O Boundary Policy fields (WO-O4O-NOTIFICATION-CORE-BASELINE-V1)
  // serviceKey: which O4O service this notification belongs to (kpa, glycopharm, neture, k-cosmetics, ...)
  @Column({ type: 'varchar', length: 100, nullable: true })
  serviceKey?: string;

  // organizationId: multi-tenant boundary (e.g. yaksa branch, store organization)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // actorId: user who triggered the notification (nullable for system events)
  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  // Notification channel (in_app by default, email is optional)
  @Column({ type: 'varchar', length: 50, default: 'in_app' })
  channel: NotificationChannel;

  // Notification type/event
  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  // Notification content
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  // Additional metadata (orderId, settlementId, productId, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Optional priority hint (low | normal | high | critical)
  @Column({ type: 'varchar', length: 20, nullable: true })
  priority?: string;

  // Read status
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt?: Date;

  // Helper method to mark as read
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  // Backward compatibility getters
  get recipientId(): string {
    return this.userId;
  }

  get read(): boolean {
    return this.isRead;
  }

  get data(): any {
    return this.metadata;
  }
}