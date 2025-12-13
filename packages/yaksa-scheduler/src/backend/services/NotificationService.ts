/**
 * NotificationService
 * Phase 19-E: Notification Integration
 *
 * Handles notifications for scheduler events:
 * - Email notifications for failures, reminders, and alerts
 * - Internal admin alerts for critical events
 */

import type { Repository, EntityManager } from 'typeorm';
import type { ScheduledJob } from '../entities/ScheduledJob.js';
import type { JobFailureQueue } from '../entities/JobFailureQueue.js';

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'internal' | 'sms';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Notification types
 */
export type NotificationType =
  | 'job_failure'
  | 'retry_exhausted'
  | 'overdue_alert'
  | 'expiry_warning'
  | 'deadline_reminder'
  | 'system_health';

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  recipients: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  metadata?: {
    organizationId?: string;
    jobId?: string;
    targetService?: string;
    actionType?: string;
    failedItemId?: string;
    [key: string]: any;
  };
}

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  channel: NotificationChannel;
  recipients: string[];
  sentAt?: Date;
  error?: string;
  retryCount?: number;
}

/**
 * Admin alert data for internal notifications
 */
export interface AdminAlert {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  emailEnabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  senderEmail?: string;
  senderName?: string;
  maxRetries: number;
  retryDelayMs: number;
}

class NotificationService {
  private config: NotificationConfig = {
    emailEnabled: true,
    maxRetries: 3,
    retryDelayMs: 5000,
  };

  // In-memory admin alerts (could be persisted to DB later)
  private adminAlerts: AdminAlert[] = [];
  private maxAlerts = 100;

  /**
   * Configure notification service
   */
  configure(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[NotificationService] Configured');
  }

  // ============================================
  // Email Notifications
  // ============================================

  /**
   * Send email notification
   */
  async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
    if (!this.config.emailEnabled) {
      console.log('[NotificationService] Email disabled, skipping');
      return {
        success: false,
        channel: 'email',
        recipients: payload.recipients,
        error: 'Email notifications are disabled',
      };
    }

    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= this.config.maxRetries) {
      try {
        // TODO: Integrate with actual email service (nodemailer, SendGrid, etc.)
        // For now, log the notification
        console.log(`[NotificationService] Sending email:`, {
          subject: payload.subject,
          to: payload.recipients,
          priority: payload.priority,
          type: payload.type,
        });

        // Simulate email sending (replace with actual implementation)
        const notificationId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Log success
        console.log(`[NotificationService] Email sent: ${notificationId}`);

        return {
          success: true,
          notificationId,
          channel: 'email',
          recipients: payload.recipients,
          sentAt: new Date(),
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[NotificationService] Email send failed (attempt ${retryCount + 1}):`, lastError);

        retryCount++;
        if (retryCount <= this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * retryCount);
        }
      }
    }

    // Log failure
    console.error(`[NotificationService] Email send exhausted after ${this.config.maxRetries} retries`);

    return {
      success: false,
      channel: 'email',
      recipients: payload.recipients,
      error: lastError,
      retryCount,
    };
  }

  // ============================================
  // Admin Internal Alerts
  // ============================================

  /**
   * Create admin alert (internal notification)
   */
  createAdminAlert(
    type: NotificationType,
    priority: NotificationPriority,
    title: string,
    message: string,
    options?: {
      organizationId?: string;
      metadata?: Record<string, any>;
      actionUrl?: string;
    }
  ): AdminAlert {
    const alert: AdminAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      title,
      message,
      organizationId: options?.organizationId,
      metadata: options?.metadata,
      actionUrl: options?.actionUrl,
      createdAt: new Date(),
      read: false,
    };

    // Add to alerts (FIFO, limit to maxAlerts)
    this.adminAlerts.unshift(alert);
    if (this.adminAlerts.length > this.maxAlerts) {
      this.adminAlerts = this.adminAlerts.slice(0, this.maxAlerts);
    }

    console.log(`[NotificationService] Admin alert created: ${alert.id} - ${title}`);

    return alert;
  }

  /**
   * Get admin alerts for an organization
   */
  getAdminAlerts(
    organizationId?: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): AdminAlert[] {
    let alerts = this.adminAlerts;

    if (organizationId) {
      alerts = alerts.filter(a => !a.organizationId || a.organizationId === organizationId);
    }

    if (options?.unreadOnly) {
      alerts = alerts.filter(a => !a.read);
    }

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * Mark alert as read
   */
  markAlertAsRead(alertId: string): boolean {
    const alert = this.adminAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      return true;
    }
    return false;
  }

  /**
   * Mark all alerts as read
   */
  markAllAlertsAsRead(organizationId?: string): number {
    let count = 0;
    for (const alert of this.adminAlerts) {
      if (!organizationId || alert.organizationId === organizationId) {
        if (!alert.read) {
          alert.read = true;
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Get unread alert count
   */
  getUnreadAlertCount(organizationId?: string): number {
    return this.getAdminAlerts(organizationId, { unreadOnly: true }).length;
  }

  // ============================================
  // Scheduler Event Notifications
  // ============================================

  /**
   * Notify job failure
   */
  async notifyJobFailure(
    job: ScheduledJob,
    error: Error,
    options?: { adminOnly?: boolean }
  ): Promise<void> {
    // Create admin alert
    this.createAdminAlert(
      'job_failure',
      'high',
      `작업 실패: ${job.name}`,
      `스케줄 작업 "${job.name}"이(가) 실패했습니다: ${error.message}`,
      {
        organizationId: job.organizationId,
        metadata: {
          jobId: job.id,
          targetService: job.targetService,
          actionType: job.actionType,
          failureCount: job.failureCount,
        },
        actionUrl: `/admin/yaksa-scheduler/jobs/${job.id}`,
      }
    );

    // Send email if configured
    if (!options?.adminOnly && job.config?.notifyOnFailure && job.config?.notifyEmails?.length) {
      await this.sendEmail({
        type: 'job_failure',
        priority: 'high',
        channel: 'email',
        recipients: job.config.notifyEmails,
        subject: `[Yaksa] 작업 실패 알림: ${job.name}`,
        body: `
작업명: ${job.name}
서비스: ${job.getTargetServiceName()}
작업 유형: ${job.getActionTypeName()}
오류: ${error.message}
실패 횟수: ${job.failureCount}

자세한 내용은 관리자 페이지에서 확인해주세요.
        `.trim(),
        metadata: {
          organizationId: job.organizationId,
          jobId: job.id,
          targetService: job.targetService,
          actionType: job.actionType,
        },
      });
    }
  }

  /**
   * Notify retry exhausted
   */
  async notifyRetryExhausted(failure: JobFailureQueue): Promise<void> {
    // Create critical admin alert
    this.createAdminAlert(
      'retry_exhausted',
      'critical',
      '재시도 소진: 수동 처리 필요',
      `작업 "${failure.targetService}:${failure.actionType}"의 재시도가 모두 소진되었습니다. 수동 확인이 필요합니다.`,
      {
        organizationId: failure.organizationId,
        metadata: {
          failureId: failure.id,
          jobId: failure.jobId,
          targetService: failure.targetService,
          actionType: failure.actionType,
          retryCount: failure.retryCount,
          maxRetries: failure.maxRetries,
        },
        actionUrl: `/admin/yaksa-scheduler/failures`,
      }
    );
  }

  /**
   * Notify critical threshold exceeded
   */
  async notifyCriticalThreshold(
    type: 'overdue' | 'expiring' | 'failed',
    count: number,
    organizationId?: string
  ): Promise<void> {
    const titles: Record<string, string> = {
      overdue: '연체 청구서 임계치 초과',
      expiring: '만료 예정 면허 임계치 초과',
      failed: '실패 큐 임계치 초과',
    };

    const messages: Record<string, string> = {
      overdue: `연체 청구서가 ${count}건을 초과했습니다. 즉시 확인이 필요합니다.`,
      expiring: `만료 예정 면허가 ${count}건을 초과했습니다. 갱신 안내가 필요합니다.`,
      failed: `실패 큐 항목이 ${count}건을 초과했습니다. 시스템 점검이 필요합니다.`,
    };

    this.createAdminAlert(
      'system_health',
      'critical',
      titles[type],
      messages[type],
      {
        organizationId,
        metadata: { type, count },
        actionUrl: '/admin/yaksa-hub',
      }
    );
  }

  // ============================================
  // Helper Methods
  // ============================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const notificationService = new NotificationService();
