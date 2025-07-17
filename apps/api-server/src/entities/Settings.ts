import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  value: any;

  @Column({ type: 'varchar', length: 50 })
  type!: string; // 'general', 'reading', 'theme', 'email', etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Setting types
export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  defaultUserRole: string;
  requireEmailVerification: boolean;
  enableApiAccess: boolean;
  apiRateLimit: number;
}

export interface ReadingSettings {
  homepageType: 'latest_posts' | 'static_page';
  homepageId?: string;
  postsPerPage: number;
  showSummary: 'full' | 'excerpt';
  excerptLength: number;
}

export interface ThemeSettings {
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
  darkMode: boolean;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
}