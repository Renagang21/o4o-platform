import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { EmailService } from './emailService.js';
import { RoleEnrollment } from '../entities/RoleEnrollment.js';
import { User } from '../entities/User.js';
import logger from '../utils/logger.js';

/**
 * Enrollment Email Service
 *
 * Handles email notifications for role enrollment state transitions.
 * Part of P1 Phase B implementation.
 *
 * State Transitions:
 * - CREATED: Initial enrollment submission (email sent to user)
 * - ON_HOLD: Enrollment placed on hold, requires additional info (email sent to user)
 * - APPROVED: Enrollment approved (email sent to user)
 * - REJECTED: Enrollment rejected (email sent to user)
 */
export class EnrollmentEmailService {
  private static instance: EnrollmentEmailService;
  private emailService: EmailService;

  private constructor() {
    this.emailService = EmailService.getInstance();
  }

  static getInstance(): EnrollmentEmailService {
    if (!EnrollmentEmailService.instance) {
      EnrollmentEmailService.instance = new EnrollmentEmailService();
    }
    return EnrollmentEmailService.instance;
  }

  /**
   * Send enrollment created notification
   * Sent when user first submits role enrollment application
   *
   * @param enrollment - The enrollment record
   * @param user - The user who created the enrollment
   */
  async sendEnrollmentCreated(
    enrollment: RoleEnrollment,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    if (!user.email) {
      logger.warn('Cannot send enrollment created email: user has no email', {
        enrollmentId: enrollment.id,
        userId: user.id
      });
      return { success: false, error: 'User has no email address' };
    }

    try {
      const roleDisplayName = this.getRoleDisplayName(enrollment.role);
      const statusUrl = `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/my/enrollment/${enrollment.id}`;

      const html = await this.renderEnrollmentCreatedTemplate({
        userName: user.name || user.email,
        role: roleDisplayName,
        enrollmentId: enrollment.id,
        statusUrl,
        createdAt: enrollment.createdAt.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: `[Neture] ${roleDisplayName} 역할 신청이 접수되었습니다`,
        html,
        text: this.extractTextFromHtml(html)
      });

      return { success: result };
    } catch (error: any) {
      logger.error('Failed to send enrollment created email:', {
        enrollmentId: enrollment.id,
        userId: user.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send enrollment held notification
   * Sent when admin places enrollment on hold (requires additional info)
   *
   * @param enrollment - The enrollment record
   * @param user - The user who submitted the enrollment
   * @param holdReason - Reason for holding the enrollment
   * @param requestedFields - Optional array of field names that need to be updated
   */
  async sendEnrollmentHeld(
    enrollment: RoleEnrollment,
    user: User,
    holdReason: string,
    requestedFields?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!user.email) {
      logger.warn('Cannot send enrollment held email: user has no email', {
        enrollmentId: enrollment.id,
        userId: user.id
      });
      return { success: false, error: 'User has no email address' };
    }

    try {
      const roleDisplayName = this.getRoleDisplayName(enrollment.role);
      const statusUrl = `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/my/enrollment/${enrollment.id}`;

      const html = await this.renderEnrollmentHeldTemplate({
        userName: user.name || user.email,
        role: roleDisplayName,
        enrollmentId: enrollment.id,
        holdReason,
        requestedFields: requestedFields || [],
        statusUrl,
        supportUrl: `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`
      });

      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: `[Neture] ${roleDisplayName} 역할 신청이 보류되었습니다`,
        html,
        text: this.extractTextFromHtml(html)
      });

      return { success: result };
    } catch (error: any) {
      logger.error('Failed to send enrollment held email:', {
        enrollmentId: enrollment.id,
        userId: user.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send enrollment approved notification
   * Sent when admin approves enrollment
   *
   * @param enrollment - The enrollment record
   * @param user - The user who submitted the enrollment
   * @param approvalNote - Optional approval note from admin
   */
  async sendEnrollmentApproved(
    enrollment: RoleEnrollment,
    user: User,
    approvalNote?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!user.email) {
      logger.warn('Cannot send enrollment approved email: user has no email', {
        enrollmentId: enrollment.id,
        userId: user.id
      });
      return { success: false, error: 'User has no email address' };
    }

    try {
      const roleDisplayName = this.getRoleDisplayName(enrollment.role);
      const dashboardUrl = this.getRoleDashboardUrl(enrollment.role);

      const html = await this.renderEnrollmentApprovedTemplate({
        userName: user.name || user.email,
        role: roleDisplayName,
        enrollmentId: enrollment.id,
        approvalNote: approvalNote || '',
        dashboardUrl,
        approvedAt: enrollment.reviewedAt?.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) || new Date().toLocaleString('ko-KR')
      });

      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: `[Neture] 🎉 ${roleDisplayName} 역할 신청이 승인되었습니다!`,
        html,
        text: this.extractTextFromHtml(html)
      });

      return { success: result };
    } catch (error: any) {
      logger.error('Failed to send enrollment approved email:', {
        enrollmentId: enrollment.id,
        userId: user.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send enrollment rejected notification
   * Sent when admin rejects enrollment
   *
   * @param enrollment - The enrollment record
   * @param user - The user who submitted the enrollment
   * @param rejectReason - Reason for rejection
   * @param reapplyAfter - Optional date when user can reapply (for cooldown period)
   */
  async sendEnrollmentRejected(
    enrollment: RoleEnrollment,
    user: User,
    rejectReason: string,
    reapplyAfter?: Date
  ): Promise<{ success: boolean; error?: string }> {
    if (!user.email) {
      logger.warn('Cannot send enrollment rejected email: user has no email', {
        enrollmentId: enrollment.id,
        userId: user.id
      });
      return { success: false, error: 'User has no email address' };
    }

    try {
      const roleDisplayName = this.getRoleDisplayName(enrollment.role);
      const supportUrl = `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`;

      const html = await this.renderEnrollmentRejectedTemplate({
        userName: user.name || user.email,
        role: roleDisplayName,
        enrollmentId: enrollment.id,
        rejectReason,
        reapplyAfter: reapplyAfter ? reapplyAfter.toLocaleString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : undefined,
        supportUrl,
        cooldownHours: reapplyAfter ? this.calculateCooldownHours(reapplyAfter) : undefined
      });

      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: `[Neture] ${roleDisplayName} 역할 신청이 거부되었습니다`,
        html,
        text: this.extractTextFromHtml(html)
      });

      return { success: result };
    } catch (error: any) {
      logger.error('Failed to send enrollment rejected email:', {
        enrollmentId: enrollment.id,
        userId: user.id,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  // Helper methods

  private getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      supplier: '공급자',
      seller: '판매자',
      partner: '파트너'
    };
    return roleNames[role] || role;
  }

  private getRoleDashboardUrl(role: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://neture.co.kr';
    const rolePaths: Record<string, string> = {
      supplier: '/supplier/dashboard',
      seller: '/seller/dashboard',
      partner: '/partner/dashboard'
    };
    return `${baseUrl}${rolePaths[role] || '/dashboard'}`;
  }

  private calculateCooldownHours(reapplyAfter: Date): number {
    const now = new Date();
    const diff = reapplyAfter.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60));
  }

  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Email template rendering methods

  private async renderEnrollmentCreatedTemplate(data: {
    userName: string;
    role: string;
    enrollmentId: string;
    statusUrl: string;
    createdAt: string;
  }): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>역할 신청 접수 완료</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .info-box strong { color: #667eea; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); }
    .button:hover { box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4); }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
    .next-steps { margin: 20px 0; }
    .step { margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; }
    .step-number { display: inline-block; width: 28px; height: 28px; background-color: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 28px; margin-right: 10px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 역할 신청이 접수되었습니다</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.userName}님!</h2>
      <p><strong>${data.role}</strong> 역할 신청이 성공적으로 접수되었습니다.</p>

      <div class="info-box">
        <p><strong>신청 ID:</strong> ${data.enrollmentId}</p>
        <p><strong>신청 역할:</strong> ${data.role}</p>
        <p><strong>접수 시각:</strong> ${data.createdAt}</p>
      </div>

      <div class="next-steps">
        <h3>다음 단계:</h3>
        <div class="step">
          <span class="step-number">1</span>
          <strong>검토 대기</strong> - 관리자가 신청 내용을 검토합니다 (보통 1-2 영업일 소요)
        </div>
        <div class="step">
          <span class="step-number">2</span>
          <strong>결과 통지</strong> - 검토 완료 시 이메일로 결과를 알려드립니다
        </div>
        <div class="step">
          <span class="step-number">3</span>
          <strong>역할 활성화</strong> - 승인 시 즉시 새로운 기능을 사용할 수 있습니다
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${data.statusUrl}" class="button">신청 상태 확인하기</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        신청 상태는 언제든지 위 링크를 통해 확인하실 수 있습니다.
      </p>
    </div>
    <div class="footer">
      <p><strong>Neture Platform</strong></p>
      <p>이 이메일은 Neture 플랫폼에서 자동으로 발송되었습니다.</p>
      <p>문의사항이 있으시면 고객 지원팀으로 연락 주세요.</p>
      <p>&copy; ${new Date().getFullYear()} Neture. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private async renderEnrollmentHeldTemplate(data: {
    userName: string;
    role: string;
    enrollmentId: string;
    holdReason: string;
    requestedFields: string[];
    statusUrl: string;
    supportUrl: string;
  }): Promise<string> {
    const fieldsHtml = data.requestedFields.length > 0
      ? `<ul>${data.requestedFields.map(field => `<li>${this.getFieldDisplayName(field)}</li>`).join('')}</ul>`
      : '';

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>역할 신청 보류</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .warning-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .warning-box strong { color: #d97706; }
    .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3); }
    .button:hover { box-shadow: 0 6px 12px rgba(245, 158, 11, 0.4); }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏸️ 역할 신청이 보류되었습니다</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.userName}님</h2>
      <p><strong>${data.role}</strong> 역할 신청을 검토하던 중 추가 정보가 필요하여 신청이 일시 보류되었습니다.</p>

      <div class="warning-box">
        <p><strong>보류 사유:</strong></p>
        <p>${data.holdReason}</p>
      </div>

      ${data.requestedFields.length > 0 ? `
      <div class="info-box">
        <p><strong>업데이트가 필요한 정보:</strong></p>
        ${fieldsHtml}
      </div>
      ` : ''}

      <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin-top: 0;"><strong>다음 조치가 필요합니다:</strong></p>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>요청된 정보를 준비합니다</li>
          <li>아래 버튼을 클릭하여 신청서를 업데이트합니다</li>
          <li>업데이트 완료 후 재검토가 진행됩니다</li>
        </ol>
      </div>

      <div style="text-align: center;">
        <a href="${data.statusUrl}" class="button">신청서 업데이트하기</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        문의사항이 있으시면 <a href="${data.supportUrl}" style="color: #667eea;">고객 지원팀</a>으로 연락 주세요.
      </p>
    </div>
    <div class="footer">
      <p><strong>Neture Platform</strong></p>
      <p>이 이메일은 Neture 플랫폼에서 자동으로 발송되었습니다.</p>
      <p>&copy; ${new Date().getFullYear()} Neture. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private async renderEnrollmentApprovedTemplate(data: {
    userName: string;
    role: string;
    enrollmentId: string;
    approvalNote: string;
    dashboardUrl: string;
    approvedAt: string;
  }): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>역할 신청 승인!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .success-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .success-box strong { color: #059669; }
    .info-box { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 6px; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); }
    .button:hover { box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4); }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
    .feature-list { margin: 20px 0; }
    .feature { margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; display: flex; align-items: start; }
    .feature-icon { font-size: 24px; margin-right: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 축하합니다! 역할 신청이 승인되었습니다</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.userName}님!</h2>
      <p><strong>${data.role}</strong> 역할 신청이 승인되었습니다. 이제 모든 기능을 사용하실 수 있습니다!</p>

      <div class="success-box">
        <p><strong>✓ 승인 완료</strong></p>
        <p><strong>승인 시각:</strong> ${data.approvedAt}</p>
        ${data.approvalNote ? `<p><strong>관리자 메시지:</strong> ${data.approvalNote}</p>` : ''}
      </div>

      <div class="feature-list">
        <h3>이제 사용 가능한 기능:</h3>
        ${this.getRoleFeatures(data.role)}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">대시보드로 이동하기</a>
      </div>

      <div class="info-box">
        <p style="margin-top: 0;"><strong>💡 시작하기:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>대시보드에서 프로필 설정을 완료하세요</li>
          <li>가이드를 참고하여 첫 번째 작업을 시작하세요</li>
          <li>궁금한 점은 고객 지원팀에 문의하세요</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p><strong>Neture Platform</strong></p>
      <p>Neture 플랫폼을 선택해 주셔서 감사합니다.</p>
      <p>궁금하신 사항은 언제든지 고객 지원팀으로 문의해 주세요.</p>
      <p>&copy; ${new Date().getFullYear()} Neture. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private async renderEnrollmentRejectedTemplate(data: {
    userName: string;
    role: string;
    enrollmentId: string;
    rejectReason: string;
    reapplyAfter?: string;
    cooldownHours?: number;
    supportUrl: string;
  }): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>역할 신청 결과</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background-color: #ffffff; padding: 40px 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
    .error-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .error-box strong { color: #dc2626; }
    .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .warning-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); }
    .button:hover { box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4); }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>역할 신청 결과 안내</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.userName}님</h2>
      <p>귀하의 <strong>${data.role}</strong> 역할 신청을 검토한 결과, 현재로서는 승인이 어렵다는 결정을 내리게 되었습니다.</p>

      <div class="error-box">
        <p><strong>거부 사유:</strong></p>
        <p>${data.rejectReason}</p>
      </div>

      ${data.reapplyAfter ? `
      <div class="warning-box">
        <p><strong>⏰ 재신청 가능 시기:</strong></p>
        <p>${data.reapplyAfter} 이후에 다시 신청하실 수 있습니다</p>
        ${data.cooldownHours ? `<p style="color: #666; font-size: 14px;">약 ${data.cooldownHours}시간 대기</p>` : ''}
      </div>
      ` : ''}

      <div class="info-box">
        <p style="margin-top: 0;"><strong>다음 단계:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>거부 사유를 확인하고 필요한 개선사항을 파악하세요</li>
          ${data.reapplyAfter ? '<li>대기 기간 동안 필요한 서류나 정보를 준비하세요</li>' : '<li>필요한 서류나 정보를 준비하세요</li>'}
          <li>준비가 완료되면 다시 신청해 주세요</li>
          <li>궁금한 점은 고객 지원팀에 문의하세요</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${data.supportUrl}" class="button">고객 지원 문의하기</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666; background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
        <strong>참고:</strong> 이 결정에 대해 문의사항이 있으시거나, 추가 정보를 제공하고 싶으시다면 언제든지 고객 지원팀으로 연락 주세요. 기꺼이 도와드리겠습니다.
      </p>
    </div>
    <div class="footer">
      <p><strong>Neture Platform</strong></p>
      <p>보다 나은 서비스를 제공하기 위해 노력하겠습니다.</p>
      <p>&copy; ${new Date().getFullYear()} Neture. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getRoleFeatures(role: string): string {
    const features: Record<string, string[]> = {
      supplier: [
        '📦 상품 등록 및 재고 관리',
        '📊 매출 및 정산 내역 조회',
        '🚚 배송 관리 및 추적',
        '💬 판매자와 실시간 소통'
      ],
      seller: [
        '🛍️ 상품 판매 및 관리',
        '💰 수익 분석 대시보드',
        '📈 매출 통계 및 리포트',
        '🤝 공급자 연결 및 협업'
      ],
      partner: [
        '🎯 마케팅 캠페인 관리',
        '💎 커미션 추적 및 정산',
        '📱 프로모션 도구 사용',
        '📊 성과 분석 리포트'
      ]
    };

    const roleFeatures = features[role.toLowerCase()] || [
      '✓ 모든 기본 기능 사용',
      '✓ 대시보드 접근',
      '✓ 프로필 관리',
      '✓ 고객 지원 우선 응대'
    ];

    return roleFeatures
      .map(feature => `<div class="feature"><div class="feature-icon"></div><div>${feature}</div></div>`)
      .join('');
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      companyName: '회사명',
      taxId: '사업자등록번호',
      businessEmail: '사업자 이메일',
      businessPhone: '사업자 연락처',
      businessAddress: '사업장 주소',
      storeName: '상점명',
      storeUrl: '상점 URL',
      salesChannel: '판매 채널',
      partnerType: '파트너 유형',
      platform: '플랫폼',
      channelUrl: '채널 URL',
      followerCount: '팔로워 수'
    };
    return fieldNames[field] || field;
  }
}

// Export singleton instance
export const enrollmentEmailService = EnrollmentEmailService.getInstance();
