/**
 * ContentMetaBar - 콘텐츠 카드 하단 메타 영역
 *
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1
 *
 * 표시 내용:
 * - 배지: [추천] [공지/혜택/뉴스] [운영자/공급자/사용자]
 * - 통계: 👁 조회수, 👍 좋아요, 날짜
 *
 * 배지 클릭 시 필터/정렬 트리거
 */

import React from 'react';
import { ContentBadge, RecommendedBadge, SourceBadge, ContentSourceType } from './ContentBadge';

// Content types (inline to avoid module resolution issues)
export type ContentType = 'notice' | 'hero' | 'promo' | 'news' | 'featured' | 'event';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  notice: '공지사항',
  hero: '배너',
  promo: '혜택/쿠폰',
  news: '뉴스',
  featured: '추천',
  event: '이벤트',
};

export interface ContentMetaBarProps {
  // 배지
  isRecommended?: boolean;
  contentType?: ContentType;
  sourceType?: ContentSourceType;

  // 통계
  viewCount?: number;
  likeCount?: number;
  date?: string | Date;

  // 클릭 이벤트
  onRecommendedClick?: () => void;
  onTypeClick?: (type: ContentType) => void;
  onSourceClick?: (source: ContentSourceType) => void;
  onViewsClick?: () => void;

  // 활성 필터 상태
  activeFilters?: {
    recommended?: boolean;
    type?: ContentType;
    source?: ContentSourceType;
    sort?: 'views';
  };

  // 레이아웃
  layout?: 'inline' | 'stacked';
  size?: 'sm' | 'md';
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}천`;
  }
  return num.toLocaleString();
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? '방금 전' : `${diffMins}분 전`;
    }
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;

  // 날짜 표시
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${month}.${day}`;
  }
  return `${year}.${month}.${day}`;
}

export function ContentMetaBar({
  isRecommended,
  contentType,
  sourceType,
  viewCount,
  likeCount,
  date,
  onRecommendedClick,
  onTypeClick,
  onSourceClick,
  onViewsClick,
  activeFilters,
  layout = 'stacked',
  size = 'sm',
}: ContentMetaBarProps) {
  const hasBadges = isRecommended || contentType || sourceType;
  const hasStats = viewCount !== undefined || likeCount !== undefined || date;

  if (!hasBadges && !hasStats) return null;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: layout === 'stacked' ? 'column' : 'row',
    gap: layout === 'stacked' ? '6px' : '12px',
    alignItems: layout === 'inline' ? 'center' : 'flex-start',
  };

  const badgesStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  };

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: size === 'sm' ? '12px' : '13px',
    color: '#6B7280',
  };

  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    cursor: onViewsClick ? 'pointer' : 'default',
  };

  return (
    <div style={containerStyle}>
      {/* 배지 영역 */}
      {hasBadges && (
        <div style={badgesStyle}>
          {isRecommended && (
            <RecommendedBadge
              onClick={onRecommendedClick}
              active={activeFilters?.recommended}
              size={size}
            />
          )}
          {contentType && (
            <ContentBadge
              label={CONTENT_TYPE_LABELS[contentType]}
              variant="type"
              onClick={onTypeClick ? () => onTypeClick(contentType) : undefined}
              active={activeFilters?.type === contentType}
              size={size}
            />
          )}
          {sourceType && (
            <SourceBadge
              sourceType={sourceType}
              onClick={onSourceClick ? () => onSourceClick(sourceType) : undefined}
              active={activeFilters?.source === sourceType}
              size={size}
            />
          )}
        </div>
      )}

      {/* 통계 영역 */}
      {hasStats && (
        <div style={statsStyle}>
          {viewCount !== undefined && (
            <span
              style={statItemStyle}
              onClick={onViewsClick}
              title={onViewsClick ? '조회순 정렬' : undefined}
            >
              <span>👁</span>
              <span>{formatNumber(viewCount)}</span>
            </span>
          )}
          {likeCount !== undefined && (
            <span style={statItemStyle}>
              <span>👍</span>
              <span>{formatNumber(likeCount)}</span>
            </span>
          )}
          {date && (
            <span style={{ color: '#9CA3AF' }}>
              · {formatDate(date)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
