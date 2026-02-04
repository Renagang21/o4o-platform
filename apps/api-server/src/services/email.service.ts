import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions, EmailTemplateData } from '../types/email-auth.js';
import logger from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';

export class EmailService {
  private transporter: Transporter | null = null;
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    // Check if email service should be enabled
    const envValue = process.env.EMAIL_SERVICE_ENABLED;
    logger.info(`EMAIL_SERVICE_ENABLED=${envValue}`);
    this.isEnabled = envValue !== 'false';
    
    if (this.isEnabled) {
      logger.info('Email service is enabled, creating transporter...');
      this.transporter = this.createTransport();
    } else {
      logger.info('Email service is disabled via EMAIL_SERVICE_ENABLED environment variable');
    }
  }

  private createTransport(): Transporter | null {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      NODE_ENV,
      EMAIL_SERVICE_ENABLED
    } = process.env;

    // Check if email service is explicitly disabled
    if (EMAIL_SERVICE_ENABLED === 'false') {
      logger.info('Email service disabled by configuration');
      return null;
    }

    // Development mode: Use ethereal email for testing
    if (NODE_ENV === 'development' && !SMTP_HOST) {
      logger.info('Email service running in development mode with console output');
      return nodemailer.createTransport({
        jsonTransport: true
      });
    }

    // Check if all required SMTP settings are provided
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      logger.warn('SMTP configuration incomplete. Email service will be disabled.');
      logger.warn('Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      logger.warn('To disable this warning, set EMAIL_SERVICE_ENABLED=false');
      return null;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: SMTP_SECURE === 'true',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        },
        // Add timeout settings to prevent hanging
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
      });
      
      logger.info('Email transporter created with SMTP settings');
      return transporter;
    } catch (error) {
      logger.error('Failed to create email transporter:', error);
      return null;
    }
  }

  async initialize(): Promise<void> {
    // Skip initialization if service is disabled
    if (!this.isEnabled) {
      logger.info('Email service initialization skipped (service disabled)');
      return;
    }

    // Skip if transporter wasn't created
    if (!this.transporter) {
      logger.warn('Email service initialization skipped (no transporter available)');
      this.isInitialized = false;
      return;
    }

    try {
      // Test the connection with timeout
      const verifyPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email service verification timeout')), 10000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      this.isInitialized = true;
      logger.info('Email service initialized and verified successfully');
    } catch (error: any) {
      logger.error('Failed to initialize email service:', {
        message: error.message,
        code: error.code,
        hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
      });
      this.isInitialized = false;
      // Disable the transporter to prevent further attempts
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    // Check if email service is available
    if (!this.isEnabled) {
      logger.debug('Email service is disabled, skipping email send', {
        to: options.to,
        subject: options.subject
      });
      return { success: false, error: 'Email service is disabled' };
    }

    if (!this.transporter) {
      logger.warn('Email transporter not available, skipping email send', {
        to: options.to,
        subject: options.subject
      });
      return { success: false, error: 'Email transporter not configured' };
    }

    try {
      const { to, subject, template, data, html: directHtml, text: directText } = options;
      
      let mailOptions: any = {
        from: `"${process.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM || 'O4O Platform'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@o4o.com'}>`,
        to,
        subject
      };

      // Use direct HTML/text if provided, otherwise use template
      if (directHtml || directText) {
        mailOptions.html = directHtml;
        mailOptions.text = directText || (directHtml ? this.htmlToText(directHtml) : undefined);
      } else if (template && data) {
        // Get email template
        const html = await this.renderTemplate(template, data);
        mailOptions.html = html;
        mailOptions.text = this.htmlToText(html);
      } else {
        return { success: false, error: 'No email content provided' };
      }

      // Send email with timeout
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout')), 30000)
      );
      
      const info = await Promise.race([sendPromise, timeoutPromise]) as any;
      
      // Log in development mode
      if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
        logger.info('Development email sent:', {
          to,
          subject,
          messageId: info.messageId,
          preview: nodemailer.getTestMessageUrl(info)
        });
        if (info.message) {
          logger.debug('Email content preview available');
        }
      } else {
        logger.info('Email sent successfully:', {
          to,
          subject,
          messageId: info.messageId
        });
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to send email:', {
        message: error.message,
        code: error.code,
        to: options.to,
        subject: options.subject
      });
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  private async renderTemplate(templateName: string, data: EmailTemplateData): Promise<string> {
    const templates: Record<string, (data: EmailTemplateData) => string> = {
      verification: this.verificationEmailTemplate,
      passwordReset: this.passwordResetTemplate,
      welcome: this.welcomeEmailTemplate,
      accountLocked: this.accountLockedTemplate
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    return template(data);
  }

  private verificationEmailTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 인증</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4A90E2; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.companyName}</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.name}님!</h2>
      <p>회원가입을 환영합니다. 아래 버튼을 클릭하여 이메일 주소를 인증해주세요.</p>
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">이메일 인증하기</a>
      </div>
      <p>버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="word-break: break-all; color: #666;">${data.actionUrl}</p>
      <p style="margin-top: 30px;">이 링크는 24시간 동안 유효합니다.</p>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private passwordResetTemplate(data: EmailTemplateData & { expiresIn?: string }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비밀번호 재설정</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #E74C3C; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #E74C3C; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>비밀번호 재설정</h1>
    </div>
    <div class="content">
      <h2>안녕하세요, ${data.name}님!</h2>
      <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요.</p>
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">비밀번호 재설정</a>
      </div>
      <p>버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="word-break: break-all; color: #666;">${data.actionUrl}</p>
      <div class="warning">
        <p><strong>보안 알림:</strong></p>
        <p>이 요청을 하지 않으셨다면 이 이메일을 무시하세요. 귀하의 비밀번호는 변경되지 않습니다.</p>
      </div>
      <p>이 링크는 ${data.expiresIn || '1시간'} 동안 유효합니다.</p>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private welcomeEmailTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>환영합니다!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #27AE60; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #27AE60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .features { margin: 30px 0; }
    .feature { margin: 15px 0; padding-left: 30px; position: relative; }
    .feature:before { content: "✓"; position: absolute; left: 0; color: #27AE60; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>환영합니다! 🎉</h1>
    </div>
    <div class="content">
      <h2>${data.name}님, ${data.companyName}에 오신 것을 환영합니다!</h2>
      <p>이메일 인증이 완료되었습니다. 이제 모든 서비스를 자유롭게 이용하실 수 있습니다.</p>
      
      <div class="features">
        <h3>이용 가능한 서비스:</h3>
        <div class="feature">모든 콘텐츠 접근</div>
        <div class="feature">프로필 커스터마이징</div>
        <div class="feature">소셜 기능 사용</div>
        <div class="feature">프리미엄 기능 체험</div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">서비스 시작하기</a>
      </div>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private accountLockedTemplate(data: EmailTemplateData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>계정 보안 알림</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F39C12; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background-color: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #F39C12; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>계정 보안 알림 ⚠️</h1>
    </div>
    <div class="content">
      <h2>${data.name}님</h2>
      <div class="alert">
        <p><strong>보안 알림:</strong> 비정상적인 로그인 시도가 감지되어 귀하의 계정이 일시적으로 잠겼습니다.</p>
      </div>
      <p>계정 보안을 위해 다음 조치를 취해주세요:</p>
      <ol>
        <li>아래 버튼을 클릭하여 계정을 확인하세요</li>
        <li>비밀번호를 재설정하세요</li>
        <li>2단계 인증을 활성화하세요</li>
      </ol>
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="button">계정 확인하기</a>
      </div>
      <p>이 활동이 본인의 것이 아니라면 즉시 고객 지원팀에 연락해주세요.</p>
    </div>
    <div class="footer">
      <p>이 이메일은 ${data.companyName}에서 발송되었습니다.</p>
      <p>문의사항이 있으시면 ${data.supportEmail}로 연락주세요.</p>
      <p>&copy; ${data.year} ${data.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Send user approval email
  async sendUserApprovalEmail(to: string, data: { userName: string; userEmail: string; userRole: string; approvalDate: string; notes?: string }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/userApproved.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{userEmail}}/g, data.userEmail)
        .replace(/{{userRole}}/g, data.userRole)
        .replace(/{{approvalDate}}/g, data.approvalDate)
        .replace(/{{notes}}/g, data.notes || '')
        .replace(/{{loginUrl}}/g, process.env.FRONTEND_URL || 'https://admin.neture.co.kr');
      
      // Remove notes section if no notes provided
      if (!data.notes) {
        htmlTemplate = htmlTemplate.replace(/{{#if notes}}[\s\S]*?{{\/if}}/g, '');
      }
      
      await this.sendEmail({
        to,
        subject: '계정 승인 완료 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send approval email:', error);
      throw error;
    }
  }

  // Send user rejection email
  async sendUserRejectionEmail(to: string, data: { userName: string; rejectReason: string }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/userRejected.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{rejectReason}}/g, data.rejectReason)
        .replace(/{{supportUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`);
      
      await this.sendEmail({
        to,
        subject: '계정 승인 거부 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send rejection email:', error);
      throw error;
    }
  }

  // Send account suspension email
  async sendAccountSuspensionEmail(to: string, data: { 
    userName: string; 
    suspendReason: string; 
    suspendedDate: string;
    suspendDuration?: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/accountSuspended.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{suspendReason}}/g, data.suspendReason)
        .replace(/{{suspendedDate}}/g, data.suspendedDate)
        .replace(/{{suspendDuration}}/g, data.suspendDuration || '')
        .replace(/{{appealUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support/appeal`);
      
      // Remove duration section if not provided
      if (!data.suspendDuration) {
        htmlTemplate = htmlTemplate.replace(/{{#if suspendDuration}}[\s\S]*?{{\/if}}/g, '');
      }
      
      await this.sendEmail({
        to,
        subject: '계정 정지 알림 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send suspension email:', error);
      throw error;
    }
  }

  // Send account reactivation email
  async sendAccountReactivationEmail(to: string, data: { 
    userName: string; 
    reactivatedDate: string;
    notes?: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/accountReactivated.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{reactivatedDate}}/g, data.reactivatedDate)
        .replace(/{{notes}}/g, data.notes || '')
        .replace(/{{loginUrl}}/g, process.env.FRONTEND_URL || 'https://admin.neture.co.kr')
        .replace(/{{termsUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/terms`)
        .replace(/{{policyUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/policy`);
      
      // Remove notes section if no notes provided
      if (!data.notes) {
        htmlTemplate = htmlTemplate.replace(/{{#if notes}}[\s\S]*?{{\/if}}/g, '');
      }
      
      await this.sendEmail({
        to,
        subject: '계정 재활성화 완료 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send reactivation email:', error);
      throw error;
    }
  }

  // Send commission calculated email
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
    const templatePath = path.join(__dirname, '../templates/email/commissionCalculated.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{vendorName}}/g, data.vendorName)
        .replace(/{{orderDate}}/g, data.orderDate)
        .replace(/{{orderId}}/g, data.orderId)
        .replace(/{{orderAmount}}/g, data.orderAmount)
        .replace(/{{commissionRate}}/g, data.commissionRate.toString())
        .replace(/{{commissionAmount}}/g, data.commissionAmount)
        .replace(/{{settlementDate}}/g, data.settlementDate)
        .replace(/{{pendingAmount}}/g, data.pendingAmount)
        .replace(/{{settlementStatus}}/g, data.settlementStatus)
        .replace(/{{dashboardUrl}}/g, `${process.env.FRONTEND_URL || 'https://admin.neture.co.kr'}/dashboard/commissions`);
      
      await this.sendEmail({
        to,
        subject: '💰 커미션 계산 완료 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send commission calculated email:', error);
      throw error;
    }
  }

  // Send settlement request email
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
    const templatePath = path.join(__dirname, '../templates/email/settlementRequest.html');
    
    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{recipientName}}/g, data.recipientName)
        .replace(/{{requestId}}/g, data.requestId)
        .replace(/{{requestDate}}/g, data.requestDate)
        .replace(/{{settlementPeriod}}/g, data.settlementPeriod)
        .replace(/{{transactionCount}}/g, data.transactionCount.toString())
        .replace(/{{settlementAmount}}/g, data.settlementAmount)
        .replace(/{{bankName}}/g, data.bankName)
        .replace(/{{accountNumber}}/g, data.accountNumber)
        .replace(/{{accountHolder}}/g, data.accountHolder)
        .replace(/{{reviewDeadline}}/g, data.reviewDeadline)
        .replace(/{{expectedPaymentDate}}/g, data.expectedPaymentDate)
        .replace(/{{settlementUrl}}/g, `${process.env.FRONTEND_URL || 'https://admin.neture.co.kr'}/settlements/${data.requestId}`);
      
      await this.sendEmail({
        to,
        subject: '📊 정산 요청 접수 - Neture Platform',
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send settlement request email:', error);
      throw error;
    }
  }

  /**
   * P4: Send role application submitted email to user
   */
  async sendRoleApplicationSubmittedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    businessNumber: string;
    appliedAt: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/roleApplicationSubmitted.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{businessNumber}}/g, data.businessNumber)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{dashboardUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/apply`);

      await this.sendEmail({
        to,
        subject: `[Neture] ${data.roleName} 역할 신청이 접수되었습니다`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send role application submitted email:', error);
      throw error;
    }
  }

  /**
   * P4: Send role application notification to admin
   */
  async sendRoleApplicationAdminNotificationEmail(to: string, data: {
    userName: string;
    userEmail: string;
    roleName: string;
    businessName: string;
    businessNumber: string;
    appliedAt: string;
    note?: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/roleApplicationAdminNotification.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{userEmail}}/g, data.userEmail)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{businessNumber}}/g, data.businessNumber)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{note}}/g, data.note || '')
        .replace(/{{reviewUrl}}/g, `${process.env.ADMIN_URL || 'https://admin.neture.co.kr'}/dashboard/admin/role-applications`);

      // Remove note section if no note provided
      if (!data.note) {
        htmlTemplate = htmlTemplate.replace(/{{#if note}}[\s\S]*?{{\/if}}/g, '');
      }

      await this.sendEmail({
        to,
        subject: `[Admin Alert] 새로운 ${data.roleName} 역할 신청 - ${data.userName}`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send role application admin notification email:', error);
      throw error;
    }
  }

  /**
   * P4: Send role application approved email to user
   */
  async sendRoleApplicationApprovedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    approvedAt: string;
    workspaceUrl: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/roleApplicationApproved.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{approvedAt}}/g, data.approvedAt)
        .replace(/{{workspaceUrl}}/g, data.workspaceUrl);

      await this.sendEmail({
        to,
        subject: `🎉 [Neture] ${data.roleName} 역할 신청이 승인되었습니다!`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send role application approved email:', error);
      throw error;
    }
  }

  /**
   * P4: Send role application rejected email to user
   */
  async sendRoleApplicationRejectedEmail(to: string, data: {
    userName: string;
    roleName: string;
    businessName: string;
    appliedAt: string;
    rejectedAt: string;
    reason?: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/roleApplicationRejected.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{rejectedAt}}/g, data.rejectedAt)
        .replace(/{{reason}}/g, data.reason || '')
        .replace(/{{supportUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`)
        .replace(/{{reapplyUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/apply`);

      // Remove reason section if no reason provided
      if (!data.reason) {
        htmlTemplate = htmlTemplate.replace(/{{#if reason}}[\s\S]*?{{\/if}}/g, '');
      }

      await this.sendEmail({
        to,
        subject: `[Neture] ${data.roleName} 역할 신청 결과 안내`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send role application rejected email:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
   * Send service application notification to operator
   */
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
    const templatePath = path.join(__dirname, '../templates/email/serviceApplicationOperatorNotification.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      // Replace placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{serviceName}}/g, data.serviceName)
        .replace(/{{applicantName}}/g, data.applicantName)
        .replace(/{{applicantEmail}}/g, data.applicantEmail)
        .replace(/{{applicantPhone}}/g, data.applicantPhone || '')
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{businessName}}/g, data.businessName || '')
        .replace(/{{businessNumber}}/g, data.businessNumber || '')
        .replace(/{{pharmacyName}}/g, data.pharmacyName || '')
        .replace(/{{licenseNumber}}/g, data.licenseNumber || '')
        .replace(/{{note}}/g, data.note || '')
        .replace(/{{reviewUrl}}/g, data.reviewUrl);

      // Remove optional sections if data not provided
      if (!data.applicantPhone) {
        htmlTemplate = htmlTemplate.replace(/{{#if applicantPhone}}[\s\S]*?{{\/if}}/g, '');
      }
      if (!data.businessName) {
        htmlTemplate = htmlTemplate.replace(/{{#if businessName}}[\s\S]*?{{\/if}}/g, '');
      }
      if (!data.businessNumber) {
        htmlTemplate = htmlTemplate.replace(/{{#if businessNumber}}[\s\S]*?{{\/if}}/g, '');
      }
      if (!data.pharmacyName) {
        htmlTemplate = htmlTemplate.replace(/{{#if pharmacyName}}[\s\S]*?{{\/if}}/g, '');
      }
      if (!data.licenseNumber) {
        htmlTemplate = htmlTemplate.replace(/{{#if licenseNumber}}[\s\S]*?{{\/if}}/g, '');
      }
      if (!data.note) {
        htmlTemplate = htmlTemplate.replace(/{{#if note}}[\s\S]*?{{\/if}}/g, '');
      }

      await this.sendEmail({
        to,
        subject: `[${data.serviceName}] 새로운 서비스 이용 신청 - ${data.applicantName}`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send service application operator notification email:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
   * Send service application confirmation to applicant
   */
  async sendServiceApplicationSubmittedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    applicantEmail: string;
    appliedAt: string;
    supportEmail: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/serviceApplicationSubmitted.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{serviceName}}/g, data.serviceName)
        .replace(/{{applicantName}}/g, data.applicantName)
        .replace(/{{applicantEmail}}/g, data.applicantEmail)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{supportEmail}}/g, data.supportEmail);

      await this.sendEmail({
        to,
        subject: `[${data.serviceName}] 서비스 이용 신청이 접수되었습니다`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send service application submitted email:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
   * Send service application approved email
   */
  async sendServiceApplicationApprovedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    approvedAt: string;
    serviceUrl: string;
    supportEmail: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/serviceApplicationApproved.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{serviceName}}/g, data.serviceName)
        .replace(/{{applicantName}}/g, data.applicantName)
        .replace(/{{approvedAt}}/g, data.approvedAt)
        .replace(/{{serviceUrl}}/g, data.serviceUrl)
        .replace(/{{supportEmail}}/g, data.supportEmail);

      await this.sendEmail({
        to,
        subject: `[${data.serviceName}] 서비스 이용 신청이 승인되었습니다!`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send service application approved email:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
   * Send service application rejected email
   */
  async sendServiceApplicationRejectedEmail(to: string, data: {
    serviceName: string;
    applicantName: string;
    rejectedAt: string;
    rejectionReason?: string;
    supportEmail: string;
  }): Promise<void> {
    const templatePath = path.join(__dirname, '../templates/email/serviceApplicationRejected.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{serviceName}}/g, data.serviceName)
        .replace(/{{applicantName}}/g, data.applicantName)
        .replace(/{{rejectedAt}}/g, data.rejectedAt)
        .replace(/{{rejectionReason}}/g, data.rejectionReason || '')
        .replace(/{{supportEmail}}/g, data.supportEmail);

      // Remove reason section if no reason provided
      if (!data.rejectionReason) {
        htmlTemplate = htmlTemplate.replace(/{{#if rejectionReason}}[\s\S]*?{{\/if}}/g, '');
      }

      await this.sendEmail({
        to,
        subject: `[${data.serviceName}] 서비스 이용 신청 결과 안내`,
        html: htmlTemplate,
        text: this.htmlToText(htmlTemplate)
      });
    } catch (error) {
      logger.error('Failed to send service application rejected email:', error);
      throw error;
    }
  }

  // Public method to check if email service is available
  isServiceAvailable(): boolean {
    return this.isEnabled && this.isInitialized && this.transporter !== null;
  }

  // Public method to get service status
  getServiceStatus(): { enabled: boolean; initialized: boolean; available: boolean } {
    return {
      enabled: this.isEnabled,
      initialized: this.isInitialized,
      available: this.isServiceAvailable()
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();