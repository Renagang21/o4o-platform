/**
 * MemberNotificationService
 * Phase 20-B: Member Notification Expansion
 *
 * Handles member notifications for:
 * - License expiry warnings (T-30, T-7)
 * - Verification expiry (status change to expired)
 * - Annual fee overdue warnings and confirmations
 * - Report rejection notifications
 * - Education deadline warnings
 *
 * Integrates with:
 * - api-server NotificationService for in-app notifications
 * - EmailService for email notifications
 * - Duplicate prevention via notification keys
 */

import { DataSource } from 'typeorm';

/**
 * Member Notification Types (mirrors api-server NotificationType)
 */
export type MemberNotificationType =
  | 'member.license_expiring'
  | 'member.license_expired'
  | 'member.verification_expired'
  | 'member.fee_overdue_warning'
  | 'member.fee_overdue'
  | 'member.report_rejected'
  | 'member.education_deadline';

/**
 * Notification priority for email and display ordering
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Notification channel
 */
export type NotificationChannel = 'in_app' | 'email' | 'both';

/**
 * Create notification DTO
 */
export interface CreateMemberNotificationDto {
  memberId: string;
  userId: string;
  type: MemberNotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  metadata?: Record<string, any>;
  // For duplicate prevention
  dedupeKey?: string;
  dedupeWindowHours?: number;
}

/**
 * Email data for member notifications
 */
export interface MemberNotificationEmailData {
  to: string;
  memberName: string;
  type: MemberNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  dueDate?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

/**
 * Notification result
 */
export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  emailSent?: boolean;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * In-memory deduplication cache entry
 */
interface DedupeEntry {
  key: string;
  timestamp: Date;
}

/**
 * MemberNotificationService
 *
 * Centralized service for sending member notifications
 * with duplicate prevention and multi-channel support
 */
export class NotificationService {
  private dataSource: DataSource;
  private dedupeCache: Map<string, DedupeEntry> = new Map();
  private readonly DEFAULT_DEDUPE_HOURS = 24;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    // Clean up old dedupe entries periodically
    this.startDedupeCleanup();
  }

  /**
   * Send a member notification
   *
   * @param dto - Notification data
   * @returns Result with success status
   */
  async send(dto: CreateMemberNotificationDto): Promise<NotificationResult> {
    const channel = dto.channel || 'both';
    const priority = dto.priority || 'normal';

    // Check deduplication
    if (dto.dedupeKey) {
      const windowHours = dto.dedupeWindowHours || this.DEFAULT_DEDUPE_HOURS;
      if (this.isDuplicate(dto.dedupeKey, windowHours)) {
        console.log(`[MemberNotification] Skipped duplicate: ${dto.dedupeKey}`);
        return {
          success: true,
          skipped: true,
          skipReason: 'Duplicate notification within window',
        };
      }
      // Record this notification
      this.recordNotification(dto.dedupeKey);
    }

    let notificationId: string | undefined;
    let emailSent = false;

    // Send in-app notification
    if (channel === 'in_app' || channel === 'both') {
      try {
        notificationId = await this.createInAppNotification(dto);
      } catch (error) {
        console.error('[MemberNotification] Failed to create in-app notification:', error);
      }
    }

    // Send email notification
    if (channel === 'email' || channel === 'both') {
      try {
        emailSent = await this.sendEmailNotification(dto);
      } catch (error) {
        console.error('[MemberNotification] Failed to send email:', error);
      }
    }

    // Log notification
    console.log('[MemberNotification]', {
      type: dto.type,
      userId: dto.userId,
      memberId: dto.memberId,
      title: dto.title,
      priority,
      channel,
      notificationId,
      emailSent,
      timestamp: new Date().toISOString(),
    });

    return {
      success: !!notificationId || emailSent,
      notificationId,
      emailSent,
    };
  }

  /**
   * Create in-app notification via api-server's notifications table
   */
  private async createInAppNotification(dto: CreateMemberNotificationDto): Promise<string | undefined> {
    try {
      // Use raw query to insert into notifications table
      const result = await this.dataSource.query(
        `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'in_app', false, NOW())
         RETURNING id`,
        [
          dto.userId,
          dto.type,
          dto.title,
          dto.message,
          JSON.stringify({
            ...dto.metadata,
            memberId: dto.memberId,
            priority: dto.priority || 'normal',
          }),
        ]
      );
      return result[0]?.id;
    } catch (error) {
      console.error('[MemberNotification] DB insert failed:', error);
      return undefined;
    }
  }

  /**
   * Send email notification
   * Uses api-server's EmailService via dynamic import
   */
  private async sendEmailNotification(dto: CreateMemberNotificationDto): Promise<boolean> {
    try {
      // Get member's email from metadata or query
      const email = dto.metadata?.email;
      if (!email) {
        console.log('[MemberNotification] No email address, skipping email');
        return false;
      }

      const memberName = dto.metadata?.memberName || '회원';

      // Send email via raw query to avoid circular dependencies
      // The email will be sent by a background job or directly via EmailService
      // For now, we'll create a notification entry that triggers email sending

      // Create email content based on notification type
      const emailContent = this.generateEmailContent(dto);

      // Log email intent (actual sending happens via EmailService in api-server)
      console.log('[MemberNotification] Email queued:', {
        to: email,
        subject: emailContent.subject,
        type: dto.type,
      });

      // In production, this would call the email service API
      // For Phase 20-B, we store email intent in metadata
      await this.dataSource.query(
        `INSERT INTO notifications (id, "userId", type, title, message, metadata, channel, "isRead", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'email', false, NOW())
         RETURNING id`,
        [
          dto.userId,
          dto.type,
          emailContent.subject,
          dto.message,
          JSON.stringify({
            ...dto.metadata,
            memberId: dto.memberId,
            priority: dto.priority || 'normal',
            emailTo: email,
            emailSubject: emailContent.subject,
            emailBody: emailContent.body,
            emailQueued: true,
            emailQueuedAt: new Date().toISOString(),
          }),
        ]
      );

      return true;
    } catch (error) {
      console.error('[MemberNotification] Email send failed:', error);
      return false;
    }
  }

  /**
   * Generate email content based on notification type
   */
  private generateEmailContent(dto: CreateMemberNotificationDto): { subject: string; body: string } {
    const memberName = dto.metadata?.memberName || '회원';
    const portalUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';

    const templates: Record<MemberNotificationType, { subject: string; body: string }> = {
      'member.license_expiring': {
        subject: `[Neture] 면허 만료 예정 안내`,
        body: `
안녕하세요, ${memberName}님.

회원님의 면허가 ${dto.metadata?.daysUntilExpiry || ''}일 후 만료 예정입니다.

면허 갱신 절차를 진행해 주세요.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.license_expired': {
        subject: `[Neture] 면허 만료 알림`,
        body: `
안녕하세요, ${memberName}님.

회원님의 면허가 만료되었습니다.

자격 유지를 위해 면허 갱신을 진행해 주세요.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.verification_expired': {
        subject: `[Neture] 자격 검증 만료 안내`,
        body: `
안녕하세요, ${memberName}님.

회원님의 자격 검증이 만료되었습니다.

재검증을 위해 회원 포털에서 자격 검증을 다시 진행해 주세요.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.fee_overdue_warning': {
        subject: `[Neture] 연회비 납부 예정 안내`,
        body: `
안녕하세요, ${memberName}님.

${dto.metadata?.year || new Date().getFullYear()}년도 연회비 납부 기한이 ${dto.metadata?.daysUntilDue || ''}일 후입니다.

금액: ${(dto.metadata?.amount || 0).toLocaleString()}원

기한 내 납부 부탁드립니다.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.fee_overdue': {
        subject: `[Neture] 연회비 연체 안내`,
        body: `
안녕하세요, ${memberName}님.

${dto.metadata?.year || new Date().getFullYear()}년도 연회비가 연체되었습니다.

금액: ${(dto.metadata?.amount || 0).toLocaleString()}원

빠른 시일 내 납부 부탁드립니다.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.report_rejected': {
        subject: `[Neture] 신고서 반려 안내`,
        body: `
안녕하세요, ${memberName}님.

제출하신 신고서가 반려되었습니다.

반려 사유: ${dto.metadata?.rejectReason || '담당자에게 문의해 주세요.'}

수정 후 재제출해 주세요.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
      'member.education_deadline': {
        subject: `[Neture] 필수 교육 마감 임박 안내`,
        body: `
안녕하세요, ${memberName}님.

필수 교육 "${dto.metadata?.courseName || ''}"의 마감 기한이 ${dto.metadata?.daysUntilDeadline || ''}일 후입니다.

기한 내 이수를 완료해 주세요.

▶ 회원 포털 바로가기: ${portalUrl}/member

감사합니다.
Neture Platform
        `.trim(),
      },
    };

    return templates[dto.type] || {
      subject: `[Neture] ${dto.title}`,
      body: dto.message,
    };
  }

  // ============================================
  // Convenience Methods for Specific Events
  // ============================================

  /**
   * Send license expiring notification
   */
  async sendLicenseExpiringNotification(
    memberId: string,
    userId: string,
    daysUntilExpiry: number,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    const priority: NotificationPriority = daysUntilExpiry <= 7 ? 'high' : 'normal';

    return this.send({
      memberId,
      userId,
      type: 'member.license_expiring',
      title: '면허 만료 예정',
      message: `면허가 ${daysUntilExpiry}일 후 만료 예정입니다. 갱신을 준비해 주세요.`,
      priority,
      channel: 'both',
      metadata: {
        ...metadata,
        daysUntilExpiry,
      },
      dedupeKey: `license_expiring:${memberId}:${daysUntilExpiry <= 7 ? '7' : '30'}`,
      dedupeWindowHours: daysUntilExpiry <= 7 ? 24 : 168, // 1 day for T-7, 7 days for T-30
    });
  }

  /**
   * Send verification expired notification
   */
  async sendVerificationExpiredNotification(
    memberId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    return this.send({
      memberId,
      userId,
      type: 'member.verification_expired',
      title: '자격 검증 만료',
      message: '자격 검증이 만료되었습니다. 재검증을 진행해 주세요.',
      priority: 'high',
      channel: 'both',
      metadata,
      dedupeKey: `verification_expired:${memberId}`,
      dedupeWindowHours: 168, // 7 days
    });
  }

  /**
   * Send fee overdue warning notification
   */
  async sendFeeOverdueWarningNotification(
    memberId: string,
    userId: string,
    year: number,
    amount: number,
    daysUntilDue: number,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    return this.send({
      memberId,
      userId,
      type: 'member.fee_overdue_warning',
      title: '연회비 납부 예정',
      message: `${year}년도 연회비(${amount.toLocaleString()}원) 납부 기한이 ${daysUntilDue}일 후입니다.`,
      priority: 'normal',
      channel: 'both',
      metadata: {
        ...metadata,
        year,
        amount,
        daysUntilDue,
      },
      dedupeKey: `fee_warning:${memberId}:${year}`,
      dedupeWindowHours: 168, // 7 days
    });
  }

  /**
   * Send fee overdue notification
   */
  async sendFeeOverdueNotification(
    memberId: string,
    userId: string,
    year: number,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    return this.send({
      memberId,
      userId,
      type: 'member.fee_overdue',
      title: '연회비 연체',
      message: `${year}년도 연회비(${amount.toLocaleString()}원)가 연체되었습니다.`,
      priority: 'high',
      channel: 'both',
      metadata: {
        ...metadata,
        year,
        amount,
      },
      dedupeKey: `fee_overdue:${memberId}:${year}`,
      dedupeWindowHours: 168, // 7 days
    });
  }

  /**
   * Send report rejected notification
   */
  async sendReportRejectedNotification(
    memberId: string,
    userId: string,
    reportId: string,
    rejectReason?: string,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    return this.send({
      memberId,
      userId,
      type: 'member.report_rejected',
      title: '신고서 반려',
      message: `신고서가 반려되었습니다. ${rejectReason ? `사유: ${rejectReason}` : ''}`,
      priority: 'high',
      channel: 'both',
      metadata: {
        ...metadata,
        reportId,
        rejectReason,
      },
      dedupeKey: `report_rejected:${reportId}`,
      dedupeWindowHours: 24,
    });
  }

  /**
   * Send education deadline notification
   */
  async sendEducationDeadlineNotification(
    memberId: string,
    userId: string,
    courseName: string,
    daysUntilDeadline: number,
    metadata?: Record<string, any>
  ): Promise<NotificationResult> {
    const priority: NotificationPriority = daysUntilDeadline <= 3 ? 'high' : 'normal';

    return this.send({
      memberId,
      userId,
      type: 'member.education_deadline',
      title: '교육 마감 임박',
      message: `"${courseName}" 교육 마감이 ${daysUntilDeadline}일 후입니다.`,
      priority,
      channel: 'both',
      metadata: {
        ...metadata,
        courseName,
        daysUntilDeadline,
      },
      dedupeKey: `education_deadline:${memberId}:${metadata?.courseId || courseName}:${daysUntilDeadline <= 3 ? '3' : '14'}`,
      dedupeWindowHours: daysUntilDeadline <= 3 ? 24 : 168,
    });
  }

  // ============================================
  // Legacy Methods (backward compatibility)
  // ============================================

  /**
   * @deprecated Use sendVerificationApprovedNotification instead
   */
  async sendVerificationApproved(memberId: string, detail?: any): Promise<void> {
    console.log('[Notification] Verification approved:', { memberId, detail });
  }

  /**
   * @deprecated Use sendVerificationExpiredNotification instead
   */
  async sendVerificationRejected(
    memberId: string,
    reason: string,
    detail?: any
  ): Promise<void> {
    console.log('[Notification] Verification rejected:', { memberId, reason, detail });
  }

  /**
   * @deprecated Use sendFeeOverdueWarningNotification instead
   */
  async sendFeeReminder(memberId: string, year: number, amount: number): Promise<void> {
    console.log('[Notification] Fee reminder:', { memberId, year, amount });
  }

  /**
   * @deprecated Use send() instead
   */
  async sendGeneral(memberId: string, message: string, detail?: any): Promise<void> {
    console.log('[Notification] General:', { memberId, message, detail });
  }

  // ============================================
  // Deduplication Helpers
  // ============================================

  /**
   * Check if a notification is a duplicate within the window
   */
  private isDuplicate(key: string, windowHours: number): boolean {
    const entry = this.dedupeCache.get(key);
    if (!entry) return false;

    const windowMs = windowHours * 60 * 60 * 1000;
    const now = new Date().getTime();
    const entryTime = entry.timestamp.getTime();

    return now - entryTime < windowMs;
  }

  /**
   * Record a notification for deduplication
   */
  private recordNotification(key: string): void {
    this.dedupeCache.set(key, {
      key,
      timestamp: new Date(),
    });
  }

  /**
   * Start periodic cleanup of old dedupe entries
   */
  private startDedupeCleanup(): void {
    // Clean up every hour
    setInterval(() => {
      const now = new Date().getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const [key, entry] of this.dedupeCache.entries()) {
        if (now - entry.timestamp.getTime() > maxAge) {
          this.dedupeCache.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
