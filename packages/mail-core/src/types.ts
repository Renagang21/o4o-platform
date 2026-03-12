// Mail Core Types

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  data?: EmailTemplateData;
  html?: string;
  text?: string;
}

export interface EmailTemplateData {
  name: string;
  actionUrl: string;
  supportEmail: string;
  companyName: string;
  year: number;
}

export interface VerificationEmailData extends EmailTemplateData {
  verificationCode?: string;
}

export interface PasswordResetEmailData extends EmailTemplateData {
  resetCode?: string;
  expiresIn?: string;
}

export interface MailLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface MailServiceConfig {
  /** TypeORM DataSource for DB-backed SMTP settings and EmailLog (optional) */
  dataSource?: any;
  /** Logger instance (defaults to console) */
  logger?: MailLogger;
  /** Override templates directory path */
  templatesPath?: string;
}
