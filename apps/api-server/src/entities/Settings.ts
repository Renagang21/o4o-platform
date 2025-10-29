import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AccessControlSettings } from '@o4o/types';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'jsonb', nullable: true })
  value: GeneralSettings | ReadingSettings | ThemeSettings | EmailSettings | PermalinkSettings | AccessControlSettings | Record<string, unknown> | null;

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

export interface PermalinkSettings {
  structure: string; // "/%postname%/" | "/%year%/%monthnum%/%postname%/" 등
  categoryBase: string; // "category" (카테고리 URL 베이스)
  tagBase: string; // "tag" (태그 URL 베이스)
  customStructures?: {
    post?: string;
    page?: string;
    category?: string;
    tag?: string;
  };
  // SEO 및 성능 최적화 옵션
  removeStopWords: boolean; // "the", "and" 등 불용어 제거
  maxUrlLength: number; // URL 최대 길이 (기본값: 75)
  autoFlushRules: boolean; // 설정 변경 시 자동으로 rewrite rules flush
  enableSeoWarnings: boolean; // SEO 관련 경고 표시
}