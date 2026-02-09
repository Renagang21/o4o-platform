/**
 * ContentSortButtons - 정렬 버튼 그룹
 *
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1
 *
 * 용도: 최신순 / 추천순 / 조회순 정렬
 */

import React from 'react';

// Content types (inline to avoid module resolution issues)
export type ContentSortType = 'latest' | 'featured' | 'views';

const CONTENT_SORT_LABELS: Record<ContentSortType, string> = {
  latest: '최신순',
  featured: '추천순',
  views: '조회순',
};

export interface ContentSortButtonsProps {
  value: ContentSortType;
  onChange: (sort: ContentSortType) => void;
  options?: ContentSortType[];
  size?: 'sm' | 'md';
}

const DEFAULT_OPTIONS: ContentSortType[] = ['latest', 'featured', 'views'];

export function ContentSortButtons({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  size = 'sm',
}: ContentSortButtonsProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: size === 'sm' ? '6px 14px' : '8px 18px',
    fontSize: size === 'sm' ? '13px' : '14px',
    fontWeight: 500,
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: isActive ? '#2563EB' : '#F3F4F6',
    color: isActive ? '#FFFFFF' : '#4B5563',
  });

  return (
    <div style={containerStyle}>
      {options.map((sort) => (
        <button
          key={sort}
          style={getButtonStyle(value === sort)}
          onClick={() => onChange(sort)}
        >
          {CONTENT_SORT_LABELS[sort]}
        </button>
      ))}
    </div>
  );
}
