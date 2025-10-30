import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Page } from './Page.js';
import { User } from './User.js';

export interface PageRevisionChanges {
  title?: { from: string; to: string };
  content?: { from: any; to: any };
  status?: { from: string; to: string };
  excerpt?: { from: string; to: string };
  parentId?: { from: string | null; to: string | null };
  menuOrder?: { from: number; to: number };
  showInMenu?: { from: boolean; to: boolean };
  template?: { from: string; to: string };
  [key: string]: any;
}

@Entity('page_revisions')
@Index(['pageId', 'createdAt'])
@Index(['pageId', 'revisionNumber'])
export class PageRevision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  pageId!: string;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page!: Page;

  @Column({ type: 'int' })
  revisionNumber!: number;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'varchar', length: 50 })
  revisionType!: 'manual' | 'autosave' | 'publish' | 'restore';

  // Snapshot of page content at this revision
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'json' })
  content!: any;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Column({ type: 'int' })
  menuOrder!: number;

  @Column({ type: 'boolean' })
  showInMenu!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  template?: string;

  @Column({ type: 'json', nullable: true })
  seo?: any;

  @Column({ type: 'json', nullable: true })
  customFields?: any;

  // Change tracking
  @Column({ type: 'json', nullable: true })
  changes?: PageRevisionChanges;

  @Column({ type: 'text', nullable: true })
  changeDescription?: string;

  @Column({ type: 'boolean', default: false })
  isRestorePoint!: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper method to create diff summary
  getDiffSummary(): string {
    if (!this.changes) return 'No changes recorded';
    
    const summaryParts = [];
    
    if (this.changes.title) {
      summaryParts.push('title updated');
    }
    
    if (this.changes.content) {
      summaryParts.push('content modified');
    }
    
    if (this.changes.status) {
      summaryParts.push(`status changed to ${this.changes.status.to}`);
    }
    
    if (this.changes.parentId) {
      summaryParts.push('parent page changed');
    }
    
    if (this.changes.menuOrder) {
      summaryParts.push('menu order updated');
    }

    return summaryParts.length > 0 
      ? summaryParts.join(', ')
      : 'Minor changes';
  }

  // Helper method to check if this revision represents a structural change
  isStructuralChange(): boolean {
    if (!this.changes) return false;
    
    return !!(
      this.changes.parentId || 
      this.changes.menuOrder || 
      this.changes.showInMenu ||
      this.changes.template
    );
  }
}