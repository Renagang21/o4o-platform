import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ForumCategory } from './ForumCategory';
import { User } from './User';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'publish',
  PENDING = 'pending',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

export enum PostType {
  DISCUSSION = 'discussion',
  QUESTION = 'question',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
  GUIDE = 'guide'
}

@Entity('forum_post')
@Index(['categoryId', 'status', 'isPinned', 'created_at'])
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 250, unique: true })
  slug!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'enum', enum: PostType, default: PostType.DISCUSSION })
  type!: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED })
  status!: PostStatus;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'uuid' })
  authorId!: string;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ type: 'boolean', default: true })
  allowComments!: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  commentCount!: number;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastCommentAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  lastCommentBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => ForumCategory, { lazy: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Promise<ForumCategory>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lastCommentBy' })
  lastCommenter?: User;

  // Note: OneToMany relationship with ForumComment removed to prevent circular dependency
  // Use ForumCommentRepository.find({ where: { postId: post.id } }) to get comments

  // Methods
  canUserView(userRole: string): boolean {
    if (this.status !== PostStatus.PUBLISHED) {
      return ['admin', 'manager'].includes(userRole);
    }
    return true;
  }

  canUserEdit(userId: string, userRole: string): boolean {
    if (['admin', 'manager'].includes(userRole)) return true;
    if (this.author_id === userId && !this.isLocked) return true;
    return false;
  }

  canUserComment(userRole: string): boolean {
    if (this.isLocked || !this.allowComments) return false;
    return true;
  }

  incrementViewCount(): void {
    this.viewCount++;
  }

  incrementCommentCount(userId: string): void {
    this.commentCount++;
    this.lastCommentAt = new Date();
    this.lastCommentBy = userId;
  }

  decrementCommentCount(): void {
    this.commentCount = Math.max(0, this.commentCount - 1);
  }

  publish(): void {
    this.status = PostStatus.PUBLISHED;
    this.published_at = new Date();
  }

  generateSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }
}