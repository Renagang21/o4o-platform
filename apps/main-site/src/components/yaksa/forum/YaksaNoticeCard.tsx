/**
 * YaksaNoticeCard - Notice/Announcement Card Component
 *
 * Displays important announcements with priority indicators.
 */

'use client';

import { yaksaStyles } from './theme';
import type { YaksaPost } from '@/lib/yaksa/forum-data';

interface YaksaNoticeCardProps {
  post: YaksaPost;
  compact?: boolean;
  showOrganization?: boolean;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: '#fef2f2', text: '#dc2626', label: '긴급' },
  important: { bg: '#fffbeb', text: '#d97706', label: '중요' },
  normal: { bg: '#f0f9ff', text: '#0284c7', label: '공지' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

export function YaksaNoticeCard({
  post,
  compact = false,
  showOrganization = false,
}: YaksaNoticeCardProps) {
  const priority = post.metadata?.priority || 'normal';
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <a
      href={`/yaksa/forum/post/${post.slug}`}
      className={`block rounded-lg border transition-all hover:shadow-md ${
        compact ? 'p-3' : 'p-4'
      }`}
      style={{
        ...yaksaStyles.card,
        borderLeftWidth: '4px',
        borderLeftColor: priorityStyle.text,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Priority Badge */}
        <div
          className="flex-shrink-0 px-2 py-1 rounded text-xs font-semibold"
          style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text }}
        >
          {priorityStyle.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4
            className={`font-medium line-clamp-2 ${compact ? 'text-sm' : ''}`}
            style={yaksaStyles.textPrimary}
          >
            {post.isPinned && (
              <span className="mr-1" title="고정글">
                📌
              </span>
            )}
            {post.title}
          </h4>

          {/* Excerpt (non-compact only) */}
          {!compact && post.excerpt && (
            <p
              className="text-sm line-clamp-2 mt-1"
              style={yaksaStyles.textSecondary}
            >
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-3 mt-2 text-xs flex-wrap"
            style={yaksaStyles.textMuted}
          >
            {showOrganization && post.organizationName && (
              <span className="font-medium" style={{ color: 'var(--yaksa-primary)' }}>
                {post.organizationName}
              </span>
            )}
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            {post.commentCount > 0 && <span>댓글 {post.commentCount}</span>}
          </div>
        </div>

        {/* New Badge */}
        {isNewPost(post.createdAt) && (
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--yaksa-critical)', color: '#ffffff' }}
          >
            NEW
          </span>
        )}
      </div>
    </a>
  );
}

function isNewPost(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours < 24;
}

export default YaksaNoticeCard;
