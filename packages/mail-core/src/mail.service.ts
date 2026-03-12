import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';
import path from 'path';
import fs from 'fs/promises';
import { SmtpSettings } from './entities/SmtpSettings.js';
import { EmailLog } from './entities/EmailLog.js';
import type { EmailOptions, EmailTemplateData, MailLogger, MailServiceConfig } from './types.js';

const defaultLogger: MailLogger = {
  info: (msg, ...args) => console.log(`[mail-core] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[mail-core] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[mail-core] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[mail-core] ${msg}`, ...args),
};

export class MailService {
  private transporter: Transporter | null = null;
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;
  private templatesPath: string;
  private dataSource: any;
  private logger: MailLogger;

  constructor(config?: MailServiceConfig) {
    this.dataSource = config?.dataSource || null;
    this.logger = config?.logger || defaultLogger;
    this.templatesPath = config?.templatesPath || path.join(__dirname, '..', 'templates', 'email');

    // Check if email service should be enabled
    const envValue = process.env.EMAIL_SERVICE_ENABLED;
    this.logger.info(`EMAIL_SERVICE_ENABLED=${envValue}`);
    this.isEnabled = envValue !== 'false';

    if (this.isEnabled) {
      this.logger.info('Email service is enabled, creating transporter...');
      this.transporter = this.createTransportFromEnv();
    } else {
      this.logger.info('Email service is disabled via EMAIL_SERVICE_ENABLED environment variable');
    }
  }

  private createTransportFromEnv(): Transporter | null {
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
      this.logger.info('Email service disabled by configuration');
      return null;
    }

    // Development mode: Use ethereal email for testing
    if (NODE_ENV === 'development' && !SMTP_HOST) {
      this.logger.info('Email service running in development mode with console output');
      return nodemailer.createTransport({
        jsonTransport: true
      });
    }

    // Check if all required SMTP settings are provided
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      this.logger.warn('SMTP configuration incomplete. Email service will be disabled.');
      this.logger.warn('Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      this.logger.warn('To disable this warning, set EMAIL_SERVICE_ENABLED=false');
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

      this.logger.info('Email transporter created with SMTP settings');
      return transporter;
    } catch (error) {
      this.logger.error('Failed to create email transporter:', error);
      return null;
    }
  }

  async initialize(): Promise<void> {
    // Skip initialization if service is disabled
    if (!this.isEnabled) {
      this.logger.info('Email service initialization skipped (service disabled)');
      return;
    }

    // Try DB-backed SMTP settings first (DB → ENV fallback)
    if (!this.transporter) {
      const dbTransporter = await this.createTransportFromDb();
      if (dbTransporter) {
        this.transporter = dbTransporter;
        this.logger.info('Email transporter created from DB SmtpSettings');
      }
    }

    // Skip if transporter wasn't created from either source
    if (!this.transporter) {
      this.logger.warn('Email service initialization skipped (no transporter available)');
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
      this.logger.info('Email service initialized and verified successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize email service:', {
        message: error.message,
        code: error.code,
        hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
      });
      this.isInitialized = false;
      // Disable the transporter to prevent further attempts
      this.transporter = null;
    }
  }

  /**
   * Try to create transporter from DB SmtpSettings
   */
  private async createTransportFromDb(): Promise<Transporter | null> {
    try {
      if (!this.dataSource?.isInitialized) return null;

      const smtpRepo = this.dataSource.getRepository(SmtpSettings);
      const dbSettings = await smtpRepo.findOne({ order: { id: 'DESC' } });

      if (!dbSettings?.enabled || !dbSettings.host) return null;

      const transporter = nodemailer.createTransport({
        host: dbSettings.host,
        port: dbSettings.port || 587,
        secure: dbSettings.secure === 'ssl',
        auth: {
          user: dbSettings.username,
          pass: dbSettings.password,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      } as any);

      this.logger.info('Email transporter created from DB SmtpSettings');
      return transporter;
    } catch {
      // DB not ready or SmtpSettings table doesn't exist yet — fall through to ENV
      return null;
    }
  }

  async sendEmail(options: EmailOptions & {
    templateData?: Record<string, any>;
    attachments?: Mail.Attachment[];
  }): Promise<{ success: boolean; error?: string }> {
    // Check if email service is available
    if (!this.isEnabled) {
      this.logger.debug('Email service is disabled, skipping email send', {
        to: options.to,
        subject: options.subject
      });
      return { success: false, error: 'Email service is disabled' };
    }

    if (!this.transporter) {
      this.logger.warn('Email transporter not available, skipping email send', {
        to: options.to,
        subject: options.subject
      });
      return { success: false, error: 'Email transporter not configured' };
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
        mailOptions.text = directText || (directHtml ? this.htmlToText(directHtml) : undefined);
      } else if (template && (data || options.templateData)) {
        // Try file-based template first, then inline fallback
        const rendered = await this.loadTemplateWithFallback(template, options.templateData || data as any);
        mailOptions.html = rendered.html;
        mailOptions.text = rendered.text || (rendered.html ? this.htmlToText(rendered.html) : undefined);
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
        this.logger.info('Development email sent:', {
          to: recipient,
          subject,
          messageId: info.messageId,
          preview: nodemailer.getTestMessageUrl(info)
        });
      } else {
        this.logger.info('Email sent successfully:', {
          to: recipient,
          subject,
          messageId: info.messageId
        });
      }

      // Record to EmailLog (fire-and-forget)
      this.logEmail(recipient, fromEmail, subject, 'sent', info.messageId, template || 'custom').catch(() => {});

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to send email:', {
        message: error.message,
        code: error.code,
        to: options.to,
        subject: options.subject
      });

      // Record failure to EmailLog (fire-and-forget)
      this.logEmail(recipient, fromEmail, options.subject, 'failed', undefined, options.template || 'custom', error.message).catch(() => {});

      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  /**
   * Record email send attempt to EmailLog table (fire-and-forget)
   */
  private async logEmail(
    recipient: string, sender: string, subject: string,
    status: string, messageId?: string, emailType?: string, error?: string
  ): Promise<void> {
    try {
      if (!this.dataSource?.isInitialized) return;
      const logRepo = this.dataSource.getRepository(EmailLog);
      const log = new EmailLog();
      log.recipient = recipient;
      log.sender = sender;
      log.subject = subject;
      log.status = status as any;
      log.messageId = messageId || null as any;
      log.emailType = emailType || null as any;
      log.error = error || null as any;
      log.sentAt = status === 'sent' ? new Date() : null as any;
      await logRepo.save(log);
    } catch {
      // Logging failure should never block email sending
    }
  }

  /**
   * Load template: try file-based first (templates/email/{name}.html),
   * then fall back to inline templates. Replaces {{key}} placeholders.
   */
  private async loadTemplateWithFallback(
    templateName: string,
    data: Record<string, any>,
  ): Promise<{ html: string; text?: string }> {
    // 1. Try file-based template
    try {
      const htmlPath = path.join(this.templatesPath, `${templateName}.html`);
      let html = await fs.readFile(htmlPath, 'utf-8');

      // Try optional text template
      let text: string | undefined;
      try {
        const textPath = path.join(this.templatesPath, `${templateName}.txt`);
        text = await fs.readFile(textPath, 'utf-8');
      } catch { /* text template is optional */ }

      // Replace {{key}} placeholders
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, String(value ?? ''));
        if (text) text = text.replace(regex, String(value ?? ''));
      }

      return { html, text };
    } catch {
      // File not found — fall through to inline
    }

    // 2. Inline template fallback
    const inlineTemplates: Record<string, (d: any) => string> = {
      verification: this.verificationEmailTemplate,
      passwordReset: this.passwordResetTemplate,
      welcome: this.welcomeEmailTemplate,
      accountLocked: this.accountLockedTemplate,
      // Merged from emailService.ts (B)
      'password-reset': (d) => this.wrapSimpleTemplate(`
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${d.resetUrl}">Reset Password</a></p>
        <p>This link will expire in ${d.expiresIn}.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `),
      'email-verification': (d) => this.wrapSimpleTemplate(`
        <h2>Verify Your Email</h2>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${d.verifyUrl}">Verify Email</a></p>
      `),
      'account-approved': (d) => this.wrapSimpleTemplate(`
        <h2>Account Approved!</h2>
        <p>Hi ${d.name},</p>
        <p>Your account has been approved. You can now login to access all features.</p>
        <p><a href="${d.loginUrl}">Login Now</a></p>
      `),
      'account-rejected': (d) => this.wrapSimpleTemplate(`
        <h2>Account Application Update</h2>
        <p>Hi ${d.name},</p>
        <p>Unfortunately, your account application was not approved at this time.</p>
        <p>If you have questions, please contact our support team.</p>
      `),
      'order-confirmation': (d) => this.wrapSimpleTemplate(`
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Order Number: <strong>${d.orderNumber}</strong></p>
        <p>Total: <strong>${d.total}</strong></p>
      `),
      'security-alert': (d) => this.wrapSimpleTemplate(`
        <h2>Security Alert</h2>
        <p>${d.message}</p>
        ${d.recommendation ? `<p><strong>Recommendation:</strong> ${d.recommendation}</p>` : ''}
        ${d.ipAddress ? `<p>IP: ${d.ipAddress}</p>` : ''}
      `),
    };

    const inlineFn = inlineTemplates[templateName];
    if (inlineFn) {
      return { html: inlineFn(data) };
    }

    throw new Error(`Email template "${templateName}" not found`);
  }

  private wrapSimpleTemplate(body: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      h2 { color: #2c3e50; } a { color: #3498db; text-decoration: none; }
    </style></head><body>${body}<hr>
    <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} O4O Platform. All rights reserved.</p>
    </body></html>`;
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

  // ── Business email methods ──

  async sendUserApprovalEmail(to: string, data: { userName: string; userEmail: string; userRole: string; approvalDate: string; notes?: string }): Promise<void> {
    const templatePath = path.join(this.templatesPath, 'userApproved.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{userEmail}}/g, data.userEmail)
        .replace(/{{userRole}}/g, data.userRole)
        .replace(/{{approvalDate}}/g, data.approvalDate)
        .replace(/{{notes}}/g, data.notes || '')
        .replace(/{{loginUrl}}/g, process.env.FRONTEND_URL || 'https://admin.neture.co.kr');

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
      this.logger.error('Failed to send approval email:', error);
      throw error;
    }
  }

  async sendUserRejectionEmail(to: string, data: { userName: string; rejectReason: string }): Promise<void> {
    const templatePath = path.join(this.templatesPath, 'userRejected.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send rejection email:', error);
      throw error;
    }
  }

  async sendAccountSuspensionEmail(to: string, data: {
    userName: string;
    suspendReason: string;
    suspendedDate: string;
    suspendDuration?: string;
  }): Promise<void> {
    const templatePath = path.join(this.templatesPath, 'accountSuspended.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{suspendReason}}/g, data.suspendReason)
        .replace(/{{suspendedDate}}/g, data.suspendedDate)
        .replace(/{{suspendDuration}}/g, data.suspendDuration || '')
        .replace(/{{appealUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support/appeal`);

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
      this.logger.error('Failed to send suspension email:', error);
      throw error;
    }
  }

  async sendAccountReactivationEmail(to: string, data: {
    userName: string;
    reactivatedDate: string;
    notes?: string;
  }): Promise<void> {
    const templatePath = path.join(this.templatesPath, 'accountReactivated.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{reactivatedDate}}/g, data.reactivatedDate)
        .replace(/{{notes}}/g, data.notes || '')
        .replace(/{{loginUrl}}/g, process.env.FRONTEND_URL || 'https://admin.neture.co.kr')
        .replace(/{{termsUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/terms`)
        .replace(/{{policyUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/policy`);

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
      this.logger.error('Failed to send reactivation email:', error);
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
    const templatePath = path.join(this.templatesPath, 'commissionCalculated.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send commission calculated email:', error);
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
    const templatePath = path.join(this.templatesPath, 'settlementRequest.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send settlement request email:', error);
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
    const templatePath = path.join(this.templatesPath, 'roleApplicationSubmitted.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send role application submitted email:', error);
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
    const templatePath = path.join(this.templatesPath, 'roleApplicationAdminNotification.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{userEmail}}/g, data.userEmail)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{businessNumber}}/g, data.businessNumber)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{note}}/g, data.note || '')
        .replace(/{{reviewUrl}}/g, `${process.env.ADMIN_URL || 'https://admin.neture.co.kr'}/dashboard/admin/role-applications`);

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
      this.logger.error('Failed to send role application admin notification email:', error);
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
    const templatePath = path.join(this.templatesPath, 'roleApplicationApproved.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send role application approved email:', error);
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
    const templatePath = path.join(this.templatesPath, 'roleApplicationRejected.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{userName}}/g, data.userName)
        .replace(/{{roleName}}/g, data.roleName)
        .replace(/{{businessName}}/g, data.businessName)
        .replace(/{{appliedAt}}/g, data.appliedAt)
        .replace(/{{rejectedAt}}/g, data.rejectedAt)
        .replace(/{{reason}}/g, data.reason || '')
        .replace(/{{supportUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/support`)
        .replace(/{{reapplyUrl}}/g, `${process.env.FRONTEND_URL || 'https://neture.co.kr'}/apply`);

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
      this.logger.error('Failed to send role application rejected email:', error);
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
    const templatePath = path.join(this.templatesPath, 'serviceApplicationOperatorNotification.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

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
      this.logger.error('Failed to send service application operator notification email:', error);
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
    const templatePath = path.join(this.templatesPath, 'serviceApplicationSubmitted.html');

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
      this.logger.error('Failed to send service application submitted email:', error);
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
    const templatePath = path.join(this.templatesPath, 'serviceApplicationApproved.html');

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
      this.logger.error('Failed to send service application approved email:', error);
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
    const templatePath = path.join(this.templatesPath, 'serviceApplicationRejected.html');

    try {
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');

      htmlTemplate = htmlTemplate
        .replace(/{{serviceName}}/g, data.serviceName)
        .replace(/{{applicantName}}/g, data.applicantName)
        .replace(/{{rejectedAt}}/g, data.rejectedAt)
        .replace(/{{rejectionReason}}/g, data.rejectionReason || '')
        .replace(/{{supportEmail}}/g, data.supportEmail);

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
      this.logger.error('Failed to send service application rejected email:', error);
      throw error;
    }
  }

  // ── Merged from emailService.ts (B) ──

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

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  isServiceAvailable(): boolean {
    return this.isEnabled && this.isInitialized && this.transporter !== null;
  }

  getServiceStatus(): { enabled: boolean; initialized: boolean; available: boolean } {
    return {
      enabled: this.isEnabled,
      initialized: this.isInitialized,
      available: this.isServiceAvailable()
    };
  }
}
