import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { User } from './User.js';

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  version!: string;

  @Column({ nullable: true })
  author?: string;

  @Column({ nullable: true })
  authorUrl?: string;

  @Column({ nullable: true })
  screenshot?: string;

  @Column({ nullable: true })
  demoUrl?: string;

  @Column({ default: 'external' })
  type!: 'builtin' | 'external' | 'custom';

  @Column({ default: 'inactive' })
  status!: 'active' | 'inactive' | 'maintenance';

  @Column({ default: false })
  isPremium!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  @Column({ type: 'json', nullable: true })
  features?: string[];

  @Column({ type: 'json', nullable: true })
  requiredPlugins?: string[];

  @Column({ type: 'json', nullable: true })
  colorSchemes?: {
    name: string;
    colors: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
  }[];

  @Column({ type: 'json', nullable: true })
  layoutOptions?: {
    containerWidth?: string;
    sidebarPosition?: 'left' | 'right' | 'none';
    headerLayout?: 'default' | 'centered' | 'transparent';
    footerLayout?: 'default' | 'minimal' | 'extended';
  };

  @Column({ type: 'json', nullable: true })
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    headingFont?: string;
  };

  @Column({ type: 'json', nullable: true })
  customCss?: string;

  @Column({ type: 'json', nullable: true })
  customJs?: string;

  @Column({ type: 'json', nullable: true })
  templateFiles?: {
    name: string;
    path: string;
    type: 'template' | 'partial' | 'widget';
    content?: string;
  }[];

  @Column({ default: 0 })
  downloads!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ default: 0 })
  reviewCount!: number;

  @Column({ nullable: true })
  lastUpdate?: Date;

  @Column({ type: 'json', nullable: true })
  changelog?: {
    version: string;
    date: Date;
    changes: string[];
  }[];

  @Column({ nullable: true })
  license?: string;

  @Column({ type: 'json', nullable: true })
  supportedLanguages?: string[];

  @Column({ default: false })
  isChildTheme!: boolean;

  @Column({ nullable: true })
  parentThemeId?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy?: User;

  @Column({ nullable: true })
  uploadedById?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('theme_installations')
export class ThemeInstallation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  themeId!: string;

  @Column()
  siteId!: string;

  @Column({ default: 'installed' })
  status!: 'installed' | 'active' | 'updating' | 'error';

  @Column({ nullable: true })
  activatedAt?: Date;

  @Column({ type: 'json', nullable: true })
  customizations?: any;

  @Column({ type: 'json', nullable: true })
  backupData?: any;

  @CreateDateColumn()
  installedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}