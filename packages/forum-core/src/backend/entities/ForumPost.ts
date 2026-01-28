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
import { ForumCategory } from './ForumCategory.js';
import type { Block } from '@o4o/types';
import type { ForumPostMetadata } from '../types/index.js';

/**
 * 게시글 생명주기 상태 (Core 기준, 확장 금지)
 *
 * Core는 "승인/공개 관점"까지만 책임진다.
 * App/Extension 고유 상태(예: GlycoPharm ForumStatus)는 각 서비스에서 별도 정의한다.
 *
 * @remarks 값을 추가·삭제하려면 반드시 Phase 승인이 필요하다.
 */
export enum PostStatus {
  /** 작성 중 — 비공개, 작성자만 조회 가능 */
  DRAFT = 'draft',
  /** 공개 — 정상 노출 */
  PUBLISHED = 'publish',
  /** 승인 대기 — requireApproval 카테고리에서 사용 */
  PENDING = 'pending',
  /** 반려 — 운영자가 거부 */
  REJECTED = 'rejected',
  /** 보관 — 공개 목록에서 숨김, 직접 링크로 조회 가능 */
  ARCHIVED = 'archived'
}

/**
 * 게시글 콘텐츠 성격 분류 (Core 기준, 확장 금지)
 *
 * App에서 추가 유형이 필요한 경우 자체 매핑으로 처리한다.
 * (예: GlycoPharm 'normal'|'notice' → App-level PostType)
 *
 * @remarks 값을 추가·삭제하려면 반드시 Phase 승인이 필요하다.
 */
export enum PostType {
  /** 일반 토론 (기본값) */
  DISCUSSION = 'discussion',
  /** 질문 */
  QUESTION = 'question',
  /** 공지사항 */
  ANNOUNCEMENT = 'announcement',
  /** 투표 */
  POLL = 'poll',
  /** 가이드/안내 */
  GUIDE = 'guide'
}

@Entity('forum_post')
@Index(['categoryId', 'status', 'isPinned', 'createdAt'])
@Index(['organizationId', 'status', 'createdAt'])
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 250, unique: true })
  slug!: string;

  @Column({ type: 'jsonb', default: [] })
  content!: Block[];

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'enum', enum: PostType, default: PostType.DISCUSSION })
  type!: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED })
  status!: PostStatus;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ name: 'is_organization_exclusive', type: 'boolean', default: false })
  isOrganizationExclusive!: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ type: 'boolean', default: false })
  isLocked!: boolean;

  @Column({ type: 'boolean', default: true })
  allowComments!: boolean;

  // WO-NETURE-EXTERNAL-CONTACT-V1: Show author's contact info on this post
  @Column({ name: 'show_contact_on_post', type: 'boolean', default: false })
  showContactOnPost!: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'int', default: 0 })
  commentCount!: number;

  @Column({ type: 'int', default: 0 })
  likeCount!: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ForumPostMetadata;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'last_comment_at', type: 'timestamp', nullable: true })
  lastCommentAt?: Date;

  @Column({ name: 'last_comment_by', type: 'uuid', nullable: true })
  lastCommentBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne('ForumCategory', { lazy: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Promise<ForumCategory>;

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author?: any; // Type resolved at runtime via TypeORM

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'last_comment_by' })
  lastCommenter?: any; // Type resolved at runtime via TypeORM

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: any; // Type will be resolved at runtime

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
    if (this.authorId === userId && !this.isLocked) return true;
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
    this.publishedAt = new Date();
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