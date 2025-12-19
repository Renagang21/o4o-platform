/**
 * ForumSummarySection
 *
 * Phase 3: [4] 포럼 최신 글
 *
 * 표시:
 * - 최신 글 목록 (제목 + 시간)
 * - 지부/분회 글 구분 표시
 *
 * 이동:
 * - 클릭 시 포럼 해당 게시판
 */

import { Link } from 'react-router-dom';
import { MessageSquare, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@o4o/ui';
import type { ForumSummary } from '@/lib/api/member';

interface ForumSummarySectionProps {
  data: ForumSummary | null;
  isLoading?: boolean;
}

export function ForumSummarySection({ data, isLoading }: ForumSummarySectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            커뮤니티
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error/disabled state
  if (data === null) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="h-5 w-5" />
            커뮤니티
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            커뮤니티 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            커뮤니티
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">최신 글이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  // Normal state
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          커뮤니티
        </CardTitle>
        <Link to="/forum">
          <Button variant="ghost" size="sm" className="text-xs">
            전체보기 <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {data.posts.map((post) => (
            <li key={post.postId}>
              <Link
                to={`/forum/post/${post.postId}`}
                className="flex items-start gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    {post.communityName && (
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">
                        {post.communityName}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '방금';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  }
}
