/**
 * ContentDetailPage Component
 *
 * 콘텐츠 상세 페이지
 * - 콘텐츠 정보 표시
 * - 채널별 미리보기
 * - 공유/편집 도구
 */

import type { Content } from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  STATUS_LABELS,
  VISIBILITY_LABELS,
  OWNER_TYPE_LABELS,
} from '../types/ContentTypes.js';
import { ContentPreview } from './ContentPreview.js';

interface ContentDetailPageProps {
  content: Content;
  loading?: boolean;
  shareLink?: string;
  embedCode?: string;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export function ContentDetailPage({
  content,
  loading = false,
  shareLink,
  embedCode,
  canEdit = false,
  onEdit,
  onDelete,
  onBack,
}: ContentDetailPageProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">콘텐츠를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <button
            onClick={onBack}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2"
          >
            ← 목록으로
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{CONTENT_TYPE_ICONS[content.type]}</span>
            <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(content.status)}`}
            >
              {STATUS_LABELS[content.status]}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
              {CONTENT_TYPE_LABELS[content.type]}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
              {VISIBILITY_LABELS[content.visibility]}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              수정
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 요약 */}
      {content.summary && (
        <p className="text-lg text-gray-600 mb-6">{content.summary}</p>
      )}

      {/* 태그 */}
      {content.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {content.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 본문 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {content.imageUrl && (
          <img
            src={content.imageUrl}
            alt={content.title}
            className="w-full max-h-96 object-cover rounded-lg mb-6"
          />
        )}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
        <div>
          <div className="text-xs text-gray-500 mb-1">소유 주체</div>
          <div className="font-medium text-gray-900">{content.owner.name}</div>
          <div className="text-xs text-gray-500">
            {OWNER_TYPE_LABELS[content.owner.type]}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">생성일</div>
          <div className="font-medium text-gray-900">
            {formatDate(content.createdAt)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">수정일</div>
          <div className="font-medium text-gray-900">
            {formatDate(content.updatedAt)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">사용처</div>
          <div className="font-medium text-gray-900">
            {content.usedIn.length}개 서비스
          </div>
        </div>
      </div>

      {/* 미리보기 및 공유 */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          미리보기 및 공유
        </h2>
        <ContentPreview
          content={content}
          shareLink={shareLink}
          embedCode={embedCode}
        />
      </div>
    </div>
  );
}

export default ContentDetailPage;
