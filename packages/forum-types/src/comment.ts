import type { BaseEntity } from '@o4o/types';
import type { ForumPost } from './post';

export enum CommentStatus {
  PUBLISHED = 'published',
  PENDING = 'pending',
  DELETED = 'deleted'
}

export interface ForumComment extends BaseEntity {
  postId: string;
  authorId: string;
  content: string;
  status: CommentStatus;
  
  // Hierarchy
  parentId?: string;
  depth: number;
  
  // Statistics
  likeCount: number;
  replyCount: number;
  
  // Metadata
  isEdited: boolean;
  editedAt?: Date | string;
  deletedAt?: Date | string;
  deletedBy?: string;
  deletionReason?: string;
  
  // Relations
  post?: ForumPost;
  author?: any; // User type
  parent?: ForumComment;
  replies?: ForumComment[];
  authorName?: string; // Denormalized
}

export interface CommentFormData {
  content: string;
  parentId?: string;
}

export interface CommentUpdateData {
  content: string;
}

export interface CommentFilters {
  postId?: string;
  authorId?: string;
  status?: CommentStatus;
  parentId?: string | null;
  includeReplies?: boolean;
  sortBy?: 'createdAt' | 'likeCount' | 'replyCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CommentTree extends ForumComment {
  replies: CommentTree[];
}