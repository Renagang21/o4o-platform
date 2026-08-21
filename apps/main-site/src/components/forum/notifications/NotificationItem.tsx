/**
 * NotificationItem - Single Notification Display
 * Phase 13: Forum Notification System
 */

'use client';


// WO-O4O-CI-FRONTEND-TYPECHECK-BASELINE-RECOVERY-V1
// date-fns 는 저장소 전역에서 제거됐고 어떤 workspace 도 선언하지 않는다(TS2307 원인).
// 같은 forum 컴포넌트들(ForumCommentSection / ForumHome 등)이 이미 쓰는 로컬 상대시간
// 헬퍼와 동일한 형식으로 대체한다.
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

// Notification type from API
export interface ForumNotification {
  id: string;
  userId: string;
  actorId?: string;
  type: 'comment' | 'reply' | 'mention' | 'like' | 'bookmark' | 'approve' | 'reject' | 'pending_review' | 'category_update';
  postId?: string;
  commentId?: string;
  organizationId?: string;
  targetType?: 'post' | 'comment';
  metadata?: {
    postTitle?: string;
    postSlug?: string;
    commentExcerpt?: string;
    actorName?: string;
    actorAvatar?: string;
    categoryName?: string;
    rejectionReason?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  message?: string;
  actor?: {
    id: string;
    name?: string;
    avatar?: string;
  };
}

interface NotificationItemProps {
  notification: ForumNotification;
  onRead?: (id: string) => void;
  onClick?: (notification: ForumNotification) => void;
  compact?: boolean;
}

// Icon mapping for notification types
const NOTIFICATION_ICONS: Record<string, string> = {
  comment: '💬',
  reply: '↩️',
  mention: '@',
  like: '❤️',
  bookmark: '🔖',
  approve: '✅',
  reject: '❌',
  pending_review: '📋',
  category_update: '📢',
};

export function NotificationItem({
  notification,
  onRead,
  onClick,
  compact = false,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead && onRead) {
      onRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const icon = NOTIFICATION_ICONS[notification.type] || '🔔';
  const actorName = notification.metadata?.actorName || notification.actor?.name || '누군가';
  const actorAvatar = notification.metadata?.actorAvatar || notification.actor?.avatar;

  // Format time
  const timeAgo = formatRelativeTime(notification.createdAt);

  return (
    <button
      onClick={handleClick}
      className={`
        w-full text-left p-3 transition-colors
        ${notification.isRead
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50 hover:bg-blue-100'
        }
        ${compact ? 'py-2' : 'py-3'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar or Icon */}
        <div className={`
          flex-shrink-0 rounded-full flex items-center justify-center
          ${compact ? 'w-8 h-8 text-sm' : 'w-10 h-10'}
          ${notification.isRead ? 'bg-gray-100' : 'bg-blue-100'}
        `}>
          {actorAvatar ? (
            <img
              src={actorAvatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`
            ${compact ? 'text-sm' : 'text-sm'}
            ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}
          `}>
            {notification.message || getDefaultMessage(notification, actorName)}
          </p>

          {/* Post title excerpt for context */}
          {!compact && notification.metadata?.postTitle && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              "{notification.metadata.postTitle}"
            </p>
          )}

          {/* Timestamp */}
          <p className={`
            ${compact ? 'text-xs' : 'text-xs'} text-gray-400 mt-1
          `}>
            {timeAgo}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <span className="w-2 h-2 bg-blue-500 rounded-full block" />
          </div>
        )}
      </div>
    </button>
  );
}

// Default message generator based on notification type
function getDefaultMessage(notification: ForumNotification, actorName: string): string {
  const postTitle = notification.metadata?.postTitle || '게시글';

  switch (notification.type) {
    case 'comment':
      return `${actorName}님이 "${postTitle}"에 댓글을 남겼습니다.`;
    case 'reply':
      return `${actorName}님이 회원님의 댓글에 답글을 남겼습니다.`;
    case 'mention':
      return `${actorName}님이 회원님을 언급했습니다.`;
    case 'like':
      return notification.targetType === 'comment'
        ? `${actorName}님이 회원님의 댓글을 좋아합니다.`
        : `${actorName}님이 "${postTitle}"을(를) 좋아합니다.`;
    case 'bookmark':
      return `${actorName}님이 "${postTitle}"을(를) 북마크했습니다.`;
    case 'approve':
      return `"${postTitle}" 게시글이 승인되었습니다.`;
    case 'reject':
      return `"${postTitle}" 게시글이 반려되었습니다.`;
    case 'pending_review':
      return `새 게시글 "${postTitle}"이(가) 검토 대기 중입니다.`;
    case 'category_update':
      return `${notification.metadata?.categoryName || '관심 게시판'}에 새 글이 올라왔습니다.`;
    default:
      return '새 알림이 있습니다.';
  }
}

export default NotificationItem;
