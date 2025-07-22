import type { BaseEntity } from '@o4o/types';

export interface ForumLike extends BaseEntity {
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
}

export interface ForumBookmark extends BaseEntity {
  userId: string;
  postId: string;
  notes?: string;
  tags?: string[];
}

export interface ForumReport extends BaseEntity {
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: Date | string;
  resolution?: string;
}

export enum ReportReason {
  SPAM = 'spam',
  OFFENSIVE = 'offensive',
  MISLEADING = 'misleading',
  OFF_TOPIC = 'off_topic',
  COPYRIGHT = 'copyright',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface BookmarkResponse {
  bookmarked: boolean;
  bookmarkId?: string;
}