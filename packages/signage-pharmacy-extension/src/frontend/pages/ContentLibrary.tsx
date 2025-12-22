/**
 * Content Library Page
 *
 * Browse and select content for the pharmacy signage.
 * Features:
 * - View available content
 * - Filter by category (건강정보, 제품홍보, 안내/공지)
 * - Select/deselect content for use
 */

import React, { useState } from 'react';
import { useContent } from '../hooks/usePharmacySignage.js';
import type { ContentCategory, PharmacyContentDto } from '../../backend/dto/index.js';

const CATEGORY_LABELS: Record<ContentCategory, string> = {
  'health-info': '건강정보',
  'product-promo': '제품홍보',
  'announcement': '안내/공지',
  'seasonal': '시즌 콘텐츠',
  'other': '기타',
};

interface ContentCardProps {
  content: PharmacyContentDto;
  onToggleSelect: (id: string, selected: boolean) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ content, onToggleSelect }) => {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleToggle = async () => {
    setIsSelecting(true);
    await onToggleSelect(content.id, !content.isSelected);
    setIsSelecting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        {content.durationSeconds && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {Math.floor(content.durationSeconds / 60)}:{(content.durationSeconds % 60).toString().padStart(2, '0')}
          </span>
        )}

        {/* Selection indicator */}
        {content.isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate">{content.name}</h3>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {CATEGORY_LABELS[content.category] || content.category}
          </span>
          {content.provider && (
            <span className="text-xs text-gray-500">{content.provider}</span>
          )}
        </div>

        {/* Select Button */}
        <button
          onClick={handleToggle}
          disabled={isSelecting}
          className={`mt-3 w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            content.isSelected
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isSelecting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSelecting ? '처리 중...' : content.isSelected ? '선택됨' : '선택하기'}
        </button>
      </div>
    </div>
  );
};

export const ContentLibrary: React.FC = () => {
  const {
    content,
    total,
    filter,
    setFilter,
    loading,
    error,
    refresh,
    toggleSelection,
  } = useContent();

  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const handleCategoryFilter = (category: ContentCategory | '') => {
    setFilter({
      ...filter,
      category: category || undefined,
      page: 1,
    });
  };

  const handleSearch = (search: string) => {
    setFilter({
      ...filter,
      search: search || undefined,
      page: 1,
    });
  };

  const handleSelectedOnlyToggle = () => {
    const newValue = !showSelectedOnly;
    setShowSelectedOnly(newValue);
    setFilter({
      ...filter,
      selectedOnly: newValue,
      page: 1,
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={refresh} className="mt-2 text-sm text-red-600 underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">콘텐츠 라이브러리</h1>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="콘텐츠 검색..."
              value={filter.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCategoryFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !filter.category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleCategoryFilter(key as ContentCategory)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter.category === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Selected Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSelectedOnly}
              onChange={handleSelectedOnlyToggle}
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">선택된 콘텐츠만</span>
          </label>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
              <div className="bg-white p-4 rounded-b-lg">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : content.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {content.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                onToggleSelect={toggleSelection}
              />
            ))}
          </div>

          {/* Results Count */}
          <div className="mt-6 text-center text-sm text-gray-500">
            총 {total}개의 콘텐츠
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">콘텐츠 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            {showSelectedOnly
              ? '선택된 콘텐츠가 없습니다.'
              : '사용 가능한 콘텐츠가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;
