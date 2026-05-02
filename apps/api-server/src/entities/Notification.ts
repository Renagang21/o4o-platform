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
export type NotificationType =
  | 'order.new'
  | 'order.status_changed'
  | 'settlement.new_pending'
  | 'settlement.paid'
  | 'price.changed'
  | 'stock.low'
  | 'role.approved'
  | 'role.application_submitted'
  // Phase 20-B: Member notification types
  | 'member.license_expiring'
  | 'member.license_expired'
  | 'member.verification_expired'
  | 'member.fee_overdue_warning'
  | 'member.fee_overdue'
  | 'member.report_rejected'
  | 'member.education_deadline'
  // WO-O4O-LMS-NOTIFICATION-INTEGRATION-V1: LMS course lifecycle events
  | 'lms.course_submitted'
  | 'lms.course_approved'
  | 'lms.course_rejected'
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