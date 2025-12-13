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

  // Read status
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

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