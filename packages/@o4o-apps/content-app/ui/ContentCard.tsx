/**
 * ContentCard Component
 *
 * 콘텐츠 카드 UI 컴포넌트
 * - 소유 주체 표시
 * - 상태/유형 배지
 * - 공유/링크 버튼
 */

import type {
  Content,
  ContentOwnerType,
  ContentType,
  ContentStatus,
} from '../types/ContentTypes.js';
import {
  OWNER_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  STATUS_LABELS,
} from '../types/ContentTypes.js';

interface ContentCardProps {
  content: Content;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function ContentCard({ content, onView, onEdit, onShare }: ContentCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOwnerTypeColor = (ownerType: ContentOwnerType) => {
    switch (ownerType) {
      case 'platform':
        return 'bg-purple-100 text-purple-800';
      case 'organization':
        return 'bg-blue-100 text-blue-800';
      case 'business':
        return 'bg-orange-100 text-orange-800';
      case 'individual':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 대표 이미지 영역 */}
      {content.imageUrl ? (
        <img
          src={content.imageUrl}
          alt={content.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <span className="text-5xl">{CONTENT_TYPE_ICONS[content.type]}</span>
        </div>
      )}

      <div className="p-4">
        {/* 배지 영역: 상태, 유형, 소유 주체 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(content.status)}`}>
            {STATUS_LABELS[content.status]}
          </span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
            {CONTENT_TYPE_LABELS[content.type]}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getOwnerTypeColor(content.owner.type)}`}>
            {OWNER_TYPE_LABELS[content.owner.type]}
          </span>
        </div>

        {/* 제목 및 요약 */}
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
          {content.title}
        </h3>
        {content.summary && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {content.summary}
          </p>
        )}

        {/* 소유자 정보 */}
        <div className="mt-3 flex items-center text-sm text-gray-500">
          <span className="mr-1.5">👤</span>
          <span>{content.owner.name}</span>
        </div>

        {/* 태그 */}
        {content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                #{tag}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                +{content.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 사용처 표시 */}
        {content.usedIn.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            📍 {content.usedIn.length}개 서비스에서 사용 중
          </div>
        )}

        {/* 수정일 */}
        <div className="mt-2 text-xs text-gray-400">
          수정: {formatDate(content.updatedAt)}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onView?.(content.id)}
            className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            보기
          </button>
          <button
            onClick={() => onEdit?.(content.id)}
            className="flex-1 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            수정
          </button>
          <button
            onClick={() => onShare?.(content.id)}
            className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            title="공유"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContentCard;
