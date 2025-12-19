/**
 * OrganizationNoticeSection
 *
 * Phase 3: [1] 지부/분회 공지 (최상단)
 *
 * 표시:
 * - 공지 제목
 * - 등록일
 * - pinned 표시
 *
 * 상태:
 * - 데이터 없음 → "공지 없음"
 * - 실패 → 섹션 비활성
 */

import { Link } from 'react-router-dom';
import { Bell, Pin, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@o4o/ui';
import type { OrganizationNoticeSummary } from '@/lib/api/member';

interface OrganizationNoticeSectionProps {
  data: OrganizationNoticeSummary | null;
  isLoading?: boolean;
}

export function OrganizationNoticeSection({ data, isLoading }: OrganizationNoticeSectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            지부/분회 공지
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
            <Bell className="h-5 w-5" />
            지부/분회 공지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            공지사항을 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.notices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            지부/분회 공지
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">공지 없음</p>
        </CardContent>
      </Card>
    );
  }

  // Normal state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          지부/분회 공지
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.notices.map((notice) => (
            <li key={notice.noticeId}>
              <Link
                to={`/forum/post/${notice.noticeId}`}
                className="flex items-start gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                {notice.isPinned && (
                  <Pin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notice.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{formatDate(notice.createdAt)}</span>
                    {notice.communityName && (
                      <span className="text-blue-600">{notice.communityName}</span>
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '오늘';
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  }
}
