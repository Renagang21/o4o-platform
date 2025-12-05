import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { View } from './View.js';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived'
}

export interface PageVersion {
  version: number;
  content: Record<string, any>;
  updatedBy: string;
  updatedAt: Date;
}

@Entity('pages')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['publishedAt'])
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // URL path (e.g., 'about-us', 'contact')

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'uuid', nullable: true, name: 'viewid' })
  viewId?: string; // Associated View template

  @ManyToOne('View', { nullable: true })
  @JoinColumn({ name: 'viewid' })
  view?: View;

  @Column({ type: 'jsonb' })
  content: Record<string, any>; // Page-specific data (fills View bindings)

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'publishedat' })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduledat' })
  scheduledAt?: Date; // For scheduled publishing

  @Column({ type: 'jsonb', nullable: true })
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  versions?: PageVersion[]; // Version history

  @Column({ type: 'integer', default: 1, name: 'currentversion' })
  currentVersion: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'siteid' })
  siteId?: string; // Multi-site support

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;

  // Helper Methods
  isPublished(): boolean {
    return this.status === PageStatus.PUBLISHED &&
           (!this.publishedAt || this.publishedAt <= new Date());
  }

  publish(publishedBy: string): void {
    this.status = PageStatus.PUBLISHED;
    this.publishedAt = new Date();

    // Save current version
    if (!this.versions) this.versions = [];
    this.versions.push({
      version: this.currentVersion,
      content: this.content,
      updatedBy: publishedBy,
      updatedAt: new Date()
    });
  }

  schedule(scheduledAt: Date): void {
    this.status = PageStatus.SCHEDULED;
    this.scheduledAt = scheduledAt;
  }

  revertToVersion(versionNumber: number): boolean {
    const version = this.versions?.find(v => v.version === versionNumber);
    if (!version) return false;

    this.content = version.content;
    this.currentVersion = versionNumber;
    return true;
  }
}
