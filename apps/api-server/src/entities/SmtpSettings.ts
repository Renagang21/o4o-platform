import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('smtp_settings')
export class SmtpSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'varchar', nullable: true })
  fromName?: string;

  @Column({ type: 'varchar', nullable: true })
  fromEmail?: string;

  @Column({ type: 'varchar', nullable: true })
  replyToEmail?: string;

  // SMTP Server Settings
  @Column({ type: 'varchar', nullable: true })
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

  @Column({ type: 'varchar', nullable: true })
  username?: string;

  @Column({ type: 'varchar', nullable: true })
  password?: string;

  // OAuth2 Settings (for Gmail, Outlook)
  @Column({ type: 'varchar', nullable: true })
  clientId?: string;

  @Column({ type: 'varchar', nullable: true })
  clientSecret?: string;

  @Column({ type: 'varchar', nullable: true })
  refreshToken?: string;

  @Column({ type: 'varchar', nullable: true })
  accessToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiry?: Date;

  // Email Provider Presets
  @Column({
    type: 'enum',
    enum: ['custom', 'gmail', 'outlook', 'sendgrid', 'mailgun', 'ses', 'naver', 'daum'],
    default: 'custom'
  })
  provider!: string;

  // API Key for services like SendGrid, Mailgun
  @Column({ type: 'varchar', nullable: true })
  apiKey?: string;

  @Column({ type: 'varchar', nullable: true })
  apiSecret?: string;

  // AWS SES specific
  @Column({ type: 'varchar', nullable: true })
  region?: string;

  // Rate Limiting
  @Column({ type: 'int', default: 100 })
  maxEmailsPerHour!: number;

  @Column({ type: 'int', default: 10 })
  maxEmailsPerMinute!: number;

  // Testing
  @Column({ type: 'varchar', nullable: true })
  testEmailAddress?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastTestDate?: Date;

  @Column({ type: 'boolean', default: false })
  lastTestSuccess!: boolean;

  @Column({ type: 'text', nullable: true })
  lastTestError?: string;

  // Logging
  @Column({ type: 'boolean', default: false })
  enableLogging!: boolean;

  @Column({ type: 'boolean', default: false })
  logErrors!: boolean;

  // Email Templates Default Settings
  @Column({ type: 'text', nullable: true })
  headerHtml?: string;

  @Column({ type: 'text', nullable: true })
  footerHtml?: string;

  @Column({ type: 'text', nullable: true })
  signatureHtml?: string;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}