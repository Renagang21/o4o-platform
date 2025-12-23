import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { CustomPost } from './CustomPost.js';
import type { User } from './User.js';

export interface RevisionChanges {
  title?: { from: string; to: string };
  content?: { from: any; to: any };
  status?: { from: string; to: string };
  excerpt?: { from: string; to: string };
  seo?: { from: any; to: any };
  customFields?: { from: any; to: any };
  [key: string]: any;
}

@Entity('post_revisions')
@Index(['postId', 'createdAt'])
@Index(['postId', 'revisionNumber'])
export class PostRevision {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  postId!: string;

  @ManyToOne('CustomPost', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: CustomPost;

  @Column({ type: 'int' })
  revisionNumber!: number;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @Column({ type: 'varchar', length: 50 })
  revisionType!: 'manual' | 'autosave' | 'publish' | 'restore';

  // Snapshot of post content at this revision
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'json' })
  content!: any;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ type: 'json', nullable: true })
  seo?: any;

  @Column({ type: 'json', nullable: true })
  customFields?: any;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  postMeta?: any;

  // Change tracking
  @Column({ type: 'json', nullable: true })
  changes?: RevisionChanges;

  @Column({ type: 'text', nullable: true })
  changeDescription?: string; // User-provided description of changes

  @Column({ type: 'boolean', default: false })
  isRestorePoint!: boolean; // Mark important revisions

  @Column({ type: 'int', nullable: true })
  wordCount?: number;

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
    
    if (this.changes.excerpt) {
      summaryParts.push('excerpt updated');
    }

    return summaryParts.length > 0 
      ? summaryParts.join(', ')
      : 'Minor changes';
  }

  // Helper method to check if this revision represents a major change
  isMajorChange(): boolean {
    if (!this.changes) return false;
    
    return !!(
      this.changes.title || 
      this.changes.status || 
      (this.changes.content && this.isContentSignificantlyChanged())
    );
  }

  private isContentSignificantlyChanged(): boolean {
    if (!this.changes?.content) return false;
    
    const fromText = this.extractTextFromContent(this.changes.content.from);
    const toText = this.extractTextFromContent(this.changes.content.to);
    
    // Consider it significant if more than 10% of content changed
    const maxLength = Math.max(fromText.length, toText.length);
    const similarity = this.calculateSimilarity(fromText, toText);
    
    return similarity < 0.9 && maxLength > 100;
  }

  private extractTextFromContent(content: any): string {
    if (!content || !content.blocks) return '';
    
    return content.blocks
      .filter((block: any) => block.type === 'paragraph' || block.type === 'header')
      .map((block: any) => block.data?.text || '')
      .join(' ');
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}