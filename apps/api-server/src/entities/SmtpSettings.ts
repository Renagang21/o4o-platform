import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('smtp_settings')
export class SmtpSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ nullable: true })
  fromName?: string;

  @Column({ nullable: true })
  fromEmail?: string;

  @Column({ nullable: true })
  replyToEmail?: string;

  // SMTP Server Settings
  @Column({ nullable: true })
  host?: string;

  @Column({ type: 'int', nullable: true })
  port?: number;

  @Column({
    type: 'enum',
    enum: ['none', 'tls', 'ssl'],
    default: 'tls'
  })
  secure!: string;

  // Authentication
  @Column({
    type: 'enum',
    enum: ['none', 'plain', 'login', 'oauth2'],
    default: 'login'
  })
  authMethod!: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  password?: string;

  // OAuth2 Settings (for Gmail, Outlook)
  @Column({ nullable: true })
  clientId?: string;

  @Column({ nullable: true })
  clientSecret?: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ nullable: true })
  tokenExpiry?: Date;

  // Email Provider Presets
  @Column({
    type: 'enum',
    enum: ['custom', 'gmail', 'outlook', 'sendgrid', 'mailgun', 'ses', 'naver', 'daum'],
    default: 'custom'
  })
  provider!: string;

  // API Key for services like SendGrid, Mailgun
  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  apiSecret?: string;

  // AWS SES specific
  @Column({ nullable: true })
  region?: string;

  // Rate Limiting
  @Column({ type: 'int', default: 100 })
  maxEmailsPerHour!: number;

  @Column({ type: 'int', default: 10 })
  maxEmailsPerMinute!: number;

  // Testing
  @Column({ nullable: true })
  testEmailAddress?: string;

  @Column({ nullable: true })
  lastTestDate?: Date;

  @Column({ default: false })
  lastTestSuccess!: boolean;

  @Column({ type: 'text', nullable: true })
  lastTestError?: string;

  // Logging
  @Column({ default: false })
  enableLogging!: boolean;

  @Column({ default: false })
  logErrors!: boolean;

  // Email Templates Default Settings
  @Column({ nullable: true })
  headerHtml?: string;

  @Column({ nullable: true })
  footerHtml?: string;

  @Column({ nullable: true })
  signatureHtml?: string;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}