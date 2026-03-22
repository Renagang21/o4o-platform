/**
 * Mail Transport Service — SMTP transport lifecycle, send, audit, status
 *
 * WO-O4O-MAIL-SERVICE-SPLIT-V1
 * Extracted from mail.service.ts
 *
 * Responsibilities:
 *   - SMTP transport creation (ENV + DB fallback)
 *   - Transport initialization and verification
 *   - Actual email sending via nodemailer
 *   - EmailLog audit trail (fire-and-forget)
 *   - Connection test and service status
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer/index.js';
import { SmtpSettings } from './entities/SmtpSettings.js';
import { EmailLog } from './entities/EmailLog.js';
import type { MailLogger, MailServiceConfig } from './types.js';

const defaultLogger: MailLogger = {
  info: (msg, ...args) => console.log(`[mail-core] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[mail-core] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[mail-core] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[mail-core] ${msg}`, ...args),
};

export class MailTransportService {
  private _transporter: Transporter | null = null;
  private _isInitialized: boolean = false;
  private _isEnabled: boolean = false;
  private dataSource: any;
  private logger: MailLogger;

  constructor(config?: MailServiceConfig) {
    this.dataSource = config?.dataSource || null;
    this.logger = config?.logger || defaultLogger;

    // Check if email service should be enabled
    const envValue = process.env.EMAIL_SERVICE_ENABLED;
    this.logger.info(`EMAIL_SERVICE_ENABLED=${envValue}`);
    this._isEnabled = envValue !== 'false';

    if (this._isEnabled) {
      this.logger.info('Email service is enabled, creating transporter...');
      this._transporter = this.createTransportFromEnv();
    } else {
      this.logger.info('Email service is disabled via EMAIL_SERVICE_ENABLED environment variable');
    }
  }

  // ── Getters (used by facade) ──

  get enabled(): boolean {
    return this._isEnabled;
  }

  get initialized(): boolean {
    return this._isInitialized;
  }

  // ── Transport creation ──

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

  // ── Lifecycle ──

  async initialize(): Promise<void> {
    // Skip initialization if service is disabled
    if (!this._isEnabled) {
      this.logger.info('Email service initialization skipped (service disabled)');
      return;
    }

    // Try DB-backed SMTP settings first (DB → ENV fallback)
    if (!this._transporter) {
      const dbTransporter = await this.createTransportFromDb();
      if (dbTransporter) {
        this._transporter = dbTransporter;
        this.logger.info('Email transporter created from DB SmtpSettings');
      }
    }

    // Skip if transporter wasn't created from either source
    if (!this._transporter) {
      this.logger.warn('Email service initialization skipped (no transporter available)');
      this._isInitialized = false;
      return;
    }

    try {
      // Test the connection with timeout
      const verifyPromise = this._transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email service verification timeout')), 10000)
      );

      await Promise.race([verifyPromise, timeoutPromise]);
      this._isInitialized = true;
      this.logger.info('Email service initialized and verified successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize email service:', {
        message: error.message,
        code: error.code,
        hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
      });
      this._isInitialized = false;
      // Disable the transporter to prevent further attempts
      this._transporter = null;
    }
  }

  // ── Send ──

  /**
   * Send email via transporter with timeout
   * Returns nodemailer send info on success
   */
  async send(mailOptions: Mail.Options): Promise<any> {
    const sendPromise = this._transporter!.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), 30000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    // Log in development mode
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      this.logger.info('Development email sent:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: (info as any).messageId,
        preview: nodemailer.getTestMessageUrl(info as any)
      });
    } else {
      this.logger.info('Email sent successfully:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: (info as any).messageId
      });
    }

    return info;
  }

  // ── Audit ──

  /**
   * Record email send attempt to EmailLog table (fire-and-forget)
   */
  async logEmail(
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

  // ── Status ──

  async testConnection(): Promise<boolean> {
    if (!this._isEnabled || !this._transporter) return false;
    try {
      await this._transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  isServiceAvailable(): boolean {
    return this._isEnabled && this._isInitialized && this._transporter !== null;
  }

  getServiceStatus(): { enabled: boolean; initialized: boolean; available: boolean } {
    return {
      enabled: this._isEnabled,
      initialized: this._isInitialized,
      available: this.isServiceAvailable()
    };
  }
}
