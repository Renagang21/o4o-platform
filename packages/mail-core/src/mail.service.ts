/**
 * Mail Service — Facade
 *
 * WO-P2-IMPLEMENT-CONTENT: Email service for user management
 * WO-O4O-MAIL-SERVICE-SPLIT-V1: Facade — sub-services compose
 *
 * All public method signatures preserved for backward compatibility.
 * Internal implementation delegates to:
 *   - MailTransportService (SMTP transport lifecycle, send, audit, status)
 *   - MailTemplateService (template loading, inline templates, file template rendering)
 *   - mail-render.helper (htmlToText, placeholder replacement)
 */

import type Mail from 'nodemailer/lib/mailer/index.js';
import { MailTransportService } from './mail-transport.service.js';
import { MailTemplateService } from './mail-template.service.js';
import { htmlToText } from './mail-render.helper.js';
import type { EmailOptions, MailServiceConfig } from './types.js';

export class MailService {
  private transport: MailTransportService;
  private templates: MailTemplateService;

  constructor(config?: MailServiceConfig) {
    this.transport = new MailTransportService(config);
    this.templates = new MailTemplateService(config?.templatesPath);
  }

  async initialize(): Promise<void> {
    return this.transport.initialize();
  }

  // ── Core send ──

  async sendEmail(options: EmailOptions & {
    templateData?: Record<string, any>;
    attachments?: Mail.Attachment[];
  }): Promise<{ success: boolean; error?: string }> {
    // Check if email service is available
    if (!this.transport.enabled) {
      return { success: false, error: 'Email service is disabled' };
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@o4o.com';
    const fromName = process.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM || 'O4O Platform';
    const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    try {
      const { to, subject, template, data, html: directHtml, text: directText } = options;

      const mailOptions: Mail.Options = {
        from: `"${fromName}" <${fromEmail}>`,
        to: recipient,
        subject,
        attachments: options.attachments,
      };

      // Use direct HTML/text if provided, otherwise use template
      if (directHtml || directText) {
        mailOptions.html = directHtml;
        mailOptions.text = directText || (directHtml ? htmlToText(directHtml) : undefined);
      } else if (template && (data || options.templateData)) {
        // Try file-based template first, then inline fallback
        const rendered = await this.templates.loadTemplateWithFallback(template, options.templateData || data as any);
        mailOptions.html = rendered.html;
        mailOptions.text = rendered.text || (rendered.html ? htmlToText(rendered.html) : undefined);
      } else {
        return { success: false, error: 'No email content provided' };
      }

      // Send email via transport
      const info = await this.transport.send(mailOptions);

      // Record to EmailLog (fire-and-forget)
      this.transport.logEmail(recipient, fromEmail, subject, 'sent', info.messageId, template || 'custom').catch(() => {});

      return { success: true };
    } catch (error: any) {
      // Record failure to EmailLog (fire-and-forget)
      this.transport.logEmail(recipient, fromEmail, options.subject, 'failed', undefined, options.template || 'custom', error.message).catch(() => {});

      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  // ── Business email methods (Neture domain) ──

  async sendUserApprovalEmail(to: string, data: { userName: string; userEmail: string; userRole: string; approvalDate: string; notes?: string }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('userApproved', {
        userName: data.userName,
        userEmail: data.userEmail,
        userRole: data.userRole,
        approvalDate: data.approvalDate,
        notes: data.notes || '',
        loginUrl: process.env.FRONTEND_URL || 'https://admin.neture.co.kr',
      }, ['notes']);
      await this.sendEmail({ to, subject: '계정 승인 완료 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendUserRejectionEmail(to: string, data: { userName: string; rejectReason: string }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('userRejected', {
        userName: data.userName,
        rejectReason: data.rejectReason,
        supportUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`,
      });
      await this.sendEmail({ to, subject: '계정 승인 거부 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendAccountSuspensionEmail(to: string, data: {
    userName: string;
    suspendReason: string;
    suspendedDate: string;
    suspendDuration?: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('accountSuspended', {
        userName: data.userName,
        suspendReason: data.suspendReason,
        suspendedDate: data.suspendedDate,
        suspendDuration: data.suspendDuration || '',
        appealUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support/appeal`,
      }, ['suspendDuration']);
      await this.sendEmail({ to, subject: '계정 정지 알림 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendAccountReactivationEmail(to: string, data: {
    userName: string;
    reactivatedDate: string;
    notes?: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('accountReactivated', {
        userName: data.userName,
        reactivatedDate: data.reactivatedDate,
        notes: data.notes || '',
        loginUrl: process.env.FRONTEND_URL || 'https://admin.neture.co.kr',
        termsUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/terms`,
        policyUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/policy`,
      }, ['notes']);
      await this.sendEmail({ to, subject: '계정 재활성화 완료 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendCommissionCalculatedEmail(to: string, data: {
    vendorName: string;
    orderDate: string;
    orderId: string;
    orderAmount: string;
    commissionRate: number;
    commissionAmount: string;
    settlementDate: string;
    pendingAmount: string;
    settlementStatus: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('commissionCalculated', {
        vendorName: data.vendorName,
        orderDate: data.orderDate,
        orderId: data.orderId,
        orderAmount: data.orderAmount,
        commissionRate: data.commissionRate.toString(),
        commissionAmount: data.commissionAmount,
        settlementDate: data.settlementDate,
        pendingAmount: data.pendingAmount,
        settlementStatus: data.settlementStatus,
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://admin.neture.co.kr'}/dashboard/commissions`,
      });
      await this.sendEmail({ to, subject: '💰 커미션 계산 완료 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendSettlementRequestEmail(to: string, data: {
    recipientName: string;
    requestId: string;
    requestDate: string;
    settlementPeriod: string;
    transactionCount: number;
    settlementAmount: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    reviewDeadline: string;
    expectedPaymentDate: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('settlementRequest', {
        recipientName: data.recipientName,
        requestId: data.requestId,
        requestDate: data.requestDate,
        settlementPeriod: data.settlementPeriod,
        transactionCount: data.transactionCount.toString(),
        settlementAmount: data.settlementAmount,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder,
        reviewDeadline: data.reviewDeadline,
        expectedPaymentDate: data.expectedPaymentDate,
        settlementUrl: `${process.env.FRONTEND_URL || 'https://admin.neture.co.kr'}/settlements/${data.requestId}`,
      });
      await this.sendEmail({ to, subject: '📊 정산 요청 접수 - Neture Platform', html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendRoleApplicationSubmittedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    businessNumber: string;
    appliedAt: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('roleApplicationSubmitted', {
        userName: data.userName,
        roleName: data.roleName,
        businessName: data.businessName,
        businessNumber: data.businessNumber,
        appliedAt: data.appliedAt,
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/apply`,
      });
      await this.sendEmail({ to, subject: `[Neture] ${data.roleName} 역할 신청이 접수되었습니다`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendRoleApplicationAdminNotificationEmail(to: string, data: {
    userName: string;
    userEmail: string;
    roleName: string;
    businessName: string;
    businessNumber: string;
    appliedAt: string;
    note?: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('roleApplicationAdminNotification', {
        userName: data.userName,
        userEmail: data.userEmail,
        roleName: data.roleName,
        businessName: data.businessName,
        businessNumber: data.businessNumber,
        appliedAt: data.appliedAt,
        note: data.note || '',
        reviewUrl: `${process.env.ADMIN_URL || 'https://admin.neture.co.kr'}/dashboard/admin/role-applications`,
      }, ['note']);
      await this.sendEmail({ to, subject: `[Admin Alert] 새로운 ${data.roleName} 역할 신청 - ${data.userName}`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendRoleApplicationApprovedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    approvedAt: string;
    workspaceUrl: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('roleApplicationApproved', {
        userName: data.userName,
        roleName: data.roleName,
        businessName: data.businessName,
        approvedAt: data.approvedAt,
        workspaceUrl: data.workspaceUrl,
      });
      await this.sendEmail({ to, subject: `🎉 [Neture] ${data.roleName} 역할 신청이 승인되었습니다!`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendRoleApplicationRejectedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    appliedAt: string;
    rejectedAt: string;
    reason?: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('roleApplicationRejected', {
        userName: data.userName,
        roleName: data.roleName,
        businessName: data.businessName,
        appliedAt: data.appliedAt,
        rejectedAt: data.rejectedAt,
        reason: data.reason || '',
        supportUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`,
        reapplyUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/apply`,
      }, ['reason']);
      await this.sendEmail({ to, subject: `[Neture] ${data.roleName} 역할 신청 결과 안내`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendServiceApplicationOperatorNotificationEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    appliedAt: string;
    businessName?: string;
    businessNumber?: string;
    pharmacyName?: string;
    licenseNumber?: string;
    note?: string;
    reviewUrl: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('serviceApplicationOperatorNotification', {
        serviceName: data.serviceName,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        applicantPhone: data.applicantPhone || '',
        appliedAt: data.appliedAt,
        businessName: data.businessName || '',
        businessNumber: data.businessNumber || '',
        pharmacyName: data.pharmacyName || '',
        licenseNumber: data.licenseNumber || '',
        note: data.note || '',
        reviewUrl: data.reviewUrl,
      }, ['applicantPhone', 'businessName', 'businessNumber', 'pharmacyName', 'licenseNumber', 'note']);
      await this.sendEmail({ to, subject: `[${data.serviceName}] 새로운 서비스 이용 신청 - ${data.applicantName}`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendServiceApplicationSubmittedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    applicantEmail: string;
    appliedAt: string;
    supportEmail: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('serviceApplicationSubmitted', {
        serviceName: data.serviceName,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        appliedAt: data.appliedAt,
        supportEmail: data.supportEmail,
      });
      await this.sendEmail({ to, subject: `[${data.serviceName}] 서비스 이용 신청이 접수되었습니다`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendServiceApplicationApprovedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    approvedAt: string;
    serviceUrl: string;
    supportEmail: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('serviceApplicationApproved', {
        serviceName: data.serviceName,
        applicantName: data.applicantName,
        approvedAt: data.approvedAt,
        serviceUrl: data.serviceUrl,
        supportEmail: data.supportEmail,
      });
      await this.sendEmail({ to, subject: `[${data.serviceName}] 서비스 이용 신청이 승인되었습니다!`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  async sendServiceApplicationRejectedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    rejectedAt: string;
    rejectionReason?: string;
    supportEmail: string;
  }): Promise<void> {
    try {
      const html = await this.templates.renderFileTemplate('serviceApplicationRejected', {
        serviceName: data.serviceName,
        applicantName: data.applicantName,
        rejectedAt: data.rejectedAt,
        rejectionReason: data.rejectionReason || '',
        supportEmail: data.supportEmail,
      }, ['rejectionReason']);
      await this.sendEmail({ to, subject: `[${data.serviceName}] 서비스 이용 신청 결과 안내`, html, text: htmlToText(html) });
    } catch (error) {
      throw error;
    }
  }

  // ── Generic email methods (merged from emailService.ts B) ──

  async sendPasswordResetEmail(email: string, resetToken: string, serviceUrl?: string): Promise<boolean> {
    const baseUrl = serviceUrl || process.env.ADMIN_URL || 'http://localhost:3001';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const result = await this.sendEmail({
      to: email,
      subject: 'Password Reset Request - O4O Platform',
      template: 'password-reset',
      templateData: {
        resetUrl,
        expiresIn: '1 hour',
        year: new Date().getFullYear(),
      },
    });
    return result.success;
  }

  async sendEmailVerification(email: string, verificationToken: string): Promise<boolean> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;

    const result = await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - O4O Platform',
      template: 'email-verification',
      templateData: {
        verifyUrl,
        year: new Date().getFullYear(),
      },
    });
    return result.success;
  }

  async sendSecurityAlert(email: string, alertData: {
    type: 'suspicious_login_attempts' | 'account_locked' | 'password_changed' | 'new_device_login';
    details: {
      message: string;
      recommendation?: string;
      ipAddress?: string;
      deviceInfo?: string;
      timestamp?: Date;
    };
  }): Promise<boolean> {
    const subjects: Record<string, string> = {
      suspicious_login_attempts: 'Security Alert: Suspicious Login Attempts',
      account_locked: 'Security Alert: Account Locked',
      password_changed: 'Security Alert: Password Changed',
      new_device_login: 'Security Alert: New Device Login',
    };

    const result = await this.sendEmail({
      to: email,
      subject: subjects[alertData.type] || 'Security Alert - O4O Platform',
      template: 'security-alert',
      templateData: {
        alertType: alertData.type,
        message: alertData.details.message,
        recommendation: alertData.details.recommendation,
        ipAddress: alertData.details.ipAddress,
        deviceInfo: alertData.details.deviceInfo,
        timestamp: alertData.details.timestamp || new Date(),
        year: new Date().getFullYear(),
      },
    });
    return result.success;
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: 'Welcome to O4O Platform!',
      template: 'welcome',
      templateData: {
        name: name || 'User',
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        year: new Date().getFullYear(),
      },
    });
    return result.success;
  }

  async sendAccountApprovalEmail(email: string, name: string, approved: boolean): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: `Account ${approved ? 'Approved' : 'Rejected'} - O4O Platform`,
      template: approved ? 'account-approved' : 'account-rejected',
      templateData: {
        name: name || 'User',
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      },
    });
    return result.success;
  }

  async sendOrderConfirmation(email: string, orderData: any): Promise<boolean> {
    const result = await this.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderData.orderNumber} - O4O Platform`,
      template: 'order-confirmation',
      templateData: orderData,
    });
    return result.success;
  }

  // ── Status methods ──

  async testConnection(): Promise<boolean> {
    return this.transport.testConnection();
  }

  isServiceAvailable(): boolean {
    return this.transport.isServiceAvailable();
  }

  getServiceStatus(): { enabled: boolean; initialized: boolean; available: boolean } {
    return this.transport.getServiceStatus();
  }
}
