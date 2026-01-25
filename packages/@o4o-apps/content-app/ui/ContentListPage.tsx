/**
 * ContentListPage Component
 *
 * 콘텐츠 목록 페이지
 * - 콘텐츠 유형별 필터
 * - 소유 주체별 필터
 * - 상태별 필터
 * - 검색
 */

import { useState } from 'react';
import type {
  Content,
  ContentType,
  ContentStatus,
  ContentOwnerType,
} from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  STATUS_LABELS,
  OWNER_TYPE_LABELS,
} from '../types/ContentTypes.js';
import { ContentCard } from './ContentCard.js';

interface ContentListPageProps {
  contents: Content[];
  loading?: boolean;
  onCreateClick?: () => void;
  onViewContent?: (id: string) => void;
  onEditContent?: (id: string) => void;
  onShareContent?: (id: string) => void;
}

export function ContentListPage({
  contents,
  loading = false,
  onCreateClick,
  onViewContent,
  onEditContent,
  onShareContent,
}: ContentListPageProps) {
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<ContentOwnerType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링된 콘텐츠
  const filteredContents = contents.filter((content) => {
    if (typeFilter && content.type !== typeFilter) return false;
    if (statusFilter && content.status !== statusFilter) return false;
    if (ownerTypeFilter && content.owner.type !== ownerTypeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        content.title.toLowerCase().includes(query) ||
        content.summary?.toLowerCase().includes(query) ||
        content.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

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
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">콘텐츠</h1>
          <p className="mt-1 text-sm text-gray-600">
            콘텐츠를 만들고, 저장하고, 공유하세요
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          새 콘텐츠 만들기
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        {/* 검색 */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="제목, 요약, 태그로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* 유형 필터 */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContentType | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">모든 유형</option>
          {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {CONTENT_TYPE_ICONS[value as ContentType]} {label}
            </option>
          ))}
        </select>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">모든 상태</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* 소유 주체 필터 */}
        <select
          value={ownerTypeFilter}
          onChange={(e) => setOwnerTypeFilter(e.target.value as ContentOwnerType | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">모든 소유 주체</option>
          {Object.entries(OWNER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 결과 요약 */}
      <div className="text-sm text-gray-600">
        총 {filteredContents.length}개의 콘텐츠
      </div>

      {/* 콘텐츠 그리드 */}
      {filteredContents.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <span className="text-5xl">📝</span>
          <p className="mt-4 text-gray-600">콘텐츠가 없습니다</p>
          <p className="mt-2 text-sm text-gray-500">
            새 콘텐츠를 만들어 시작하세요
          </p>
          <button
            onClick={onCreateClick}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            새 콘텐츠 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredContents.map((content) => (
            <ContentCard
              key={content.id}
              content={content}
              onView={onViewContent}
              onEdit={onEditContent}
              onShare={onShareContent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ContentListPage;
