// @o4o/mail-core — Mail Core Package

export { MailService } from './mail.service.js';
export { EmailLog } from './entities/EmailLog.js';
export { SmtpSettings } from './entities/SmtpSettings.js';
export type {
  EmailOptions,
  EmailTemplateData,
  VerificationEmailData,
  PasswordResetEmailData,
  MailLogger,
  MailServiceConfig,
} from './types.js';
