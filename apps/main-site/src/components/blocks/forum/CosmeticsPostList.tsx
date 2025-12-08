/**
 * CosmeticsPostList Block Renderer
 *
 * Renders a list of cosmetics forum posts with advanced filtering.
 * Supports skinType, concerns, brand, and productId filtering.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { useState, useEffect } from 'react';
import { BlockRendererProps } from '../BlockRenderer';
import { forumStyles } from './theme';

// Skin type options
const SKIN_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'dry', label: '건성' },
  { value: 'oily', label: '지성' },
  { value: 'combination', label: '복합성' },
  { value: 'sensitive', label: '민감성' },
  { value: 'normal', label: '중성' },
] as const;

// Skin concerns options
const SKIN_CONCERNS = [
  { value: '여드름', label: '여드름' },
  { value: '주름', label: '주름/노화' },
  { value: '미백', label: '미백/톤업' },
  { value: '모공', label: '모공' },
  { value: '탄력', label: '탄력' },
  { value: '건조함', label: '건조함' },
  { value: '민감성', label: '민감성' },
  { value: '색소침착', label: '색소침착' },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'commented', label: '댓글순' },
  { value: 'recommended', label: '추천순' },
] as const;

const SKIN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  dry: { bg: '#fef3c7', text: '#b45309' },
  oily: { bg: '#dbeafe', text: '#1e40af' },
  combination: { bg: '#e0e7ff', text: '#3730a3' },
  sensitive: { bg: '#fce7f3', text: '#9d174d' },
  normal: { bg: '#dcfce7', text: '#166534' },
};

interface CosmeticsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  categoryId: string;
  categoryName?: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  tags?: string[];
  metadata?: {
    extensions?: {
      neture?: {
        skinType?: string;
        concerns?: string[];
        productId?: string;
        productName?: string;
        brand?: string;
        rating?: number;
        ingredients?: string[];
      };
    };
    neture?: {
      skinType?: string;
      concerns?: string[];
      productId?: string;
      productName?: string;
      brand?: string;
      rating?: number;
    };
  };
}

interface CosmeticsFilters {
  skinType: string;
  concerns: string[];
  brand: string;
  sort: string;
  search: string;
}

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

function getCosmeticsData(post: CosmeticsPost) {
  return post.metadata?.extensions?.neture || post.metadata?.neture || {};
}

const SkinTypeBadge = ({ skinType }: { skinType: string }) => {
  const colors = SKIN_TYPE_COLORS[skinType] || { bg: '#f3f4f6', text: '#374151' };
  const label = SKIN_TYPES.find((t) => t.value === skinType)?.label || skinType;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
};

const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ color: star <= rating ? '#fbbf24' : '#d1d5db' }}
        >
          ★
        </span>
      ))}
    </span>
  );
};

const CosmeticsPostCard = ({
  post,
  viewMode,
}: {
  post: CosmeticsPost;
  viewMode: 'list' | 'card' | 'gallery';
}) => {
  const cosmetics = getCosmeticsData(post);
  const isListMode = viewMode === 'list';

  return (
    <a
      href={`/forum/post/${post.slug}`}
      className={`block rounded-lg border p-4 transition-shadow hover:shadow-md ${isListMode ? '' : 'h-full'}`}
      style={forumStyles.card}
    >
      <div className={isListMode ? 'flex items-start gap-4' : ''}>
        {/* Author Avatar */}
        <div
          className={`rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0 ${isListMode ? 'w-10 h-10' : 'w-8 h-8 mb-3'}`}
          style={forumStyles.avatar}
        >
          {post.authorAvatar ? (
            <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            post.authorName?.charAt(0).toUpperCase() || 'U'
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges Row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.isPinned && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={forumStyles.badgePinned}
              >
                고정
              </span>
            )}
            {cosmetics.skinType && <SkinTypeBadge skinType={cosmetics.skinType} />}
            {cosmetics.rating && <RatingStars rating={cosmetics.rating} />}
          </div>

          {/* Title */}
          <h3 className="font-semibold truncate" style={forumStyles.heading}>
            {post.title}
          </h3>

          {/* Product Info */}
          {(cosmetics.productName || cosmetics.brand) && (
            <p className="text-sm mt-1" style={{ color: 'var(--forum-primary)' }}>
              {cosmetics.brand && <span>{cosmetics.brand}</span>}
              {cosmetics.brand && cosmetics.productName && ' - '}
              {cosmetics.productName && <span>{cosmetics.productName}</span>}
            </p>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm mt-1 line-clamp-2" style={forumStyles.text}>
              {post.excerpt}
            </p>
          )}

          {/* Concerns Tags */}
          {cosmetics.concerns && cosmetics.concerns.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {cosmetics.concerns.slice(0, 4).map((concern) => (
                <span
                  key={concern}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--forum-bg-highlight)',
                    color: 'var(--forum-primary)',
                  }}
                >
                  {concern}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs" style={forumStyles.textMuted}>
            <span>{post.authorName || '익명'}</span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            <span>댓글 {post.commentCount}</span>
            {post.likeCount > 0 && <span style={{ color: 'var(--forum-like-active)' }}>❤️ {post.likeCount}</span>}
          </div>
        </div>
      </div>
    </a>
  );
};

const FilterBar = ({
  filters,
  onFilterChange,
  showSearch,
  compact,
}: {
  filters: CosmeticsFilters;
  onFilterChange: (key: keyof CosmeticsFilters, value: any) => void;
  showSearch: boolean;
  compact: boolean;
}) => {
  const [showConcernsDropdown, setShowConcernsDropdown] = useState(false);

  const toggleConcern = (concern: string) => {
    const current = filters.concerns || [];
    const newConcerns = current.includes(concern)
      ? current.filter((c) => c !== concern)
      : [...current, concern];
    onFilterChange('concerns', newConcerns);
  };

  return (
    <div
      className={`cosmetics-filter-bar rounded-lg border ${compact ? 'p-3' : 'p-4'}`}
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      {/* Search Bar */}
      {showSearch && (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <div className="relative">
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 pr-10"
              style={{
                backgroundColor: 'var(--forum-bg-secondary)',
                borderColor: 'var(--forum-border-medium)',
                color: 'var(--forum-text-primary)',
              }}
            />
          </div>
        </div>
      )}

      {/* Skin Type Selector */}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mb-4'}`}>
        <div className="flex flex-wrap gap-1">
          {SKIN_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onFilterChange('skinType', type.value)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                backgroundColor:
                  filters.skinType === type.value
                    ? 'var(--forum-primary)'
                    : 'var(--forum-bg-tertiary)',
                color:
                  filters.skinType === type.value
                    ? '#ffffff'
                    : 'var(--forum-text-secondary)',
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Concerns Multi-Select */}
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <div className="relative">
          <button
            onClick={() => setShowConcernsDropdown(!showConcernsDropdown)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg border text-left"
            style={{
              backgroundColor: 'var(--forum-bg-secondary)',
              borderColor: 'var(--forum-border-medium)',
              color: 'var(--forum-text-primary)',
            }}
          >
            <span>
              {filters.concerns && filters.concerns.length > 0
                ? `피부 고민: ${filters.concerns.join(', ')}`
                : '피부 고민 선택...'}
            </span>
            <span className="ml-2">{showConcernsDropdown ? '▲' : '▼'}</span>
          </button>

          {showConcernsDropdown && (
            <div
              className="absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
              style={{
                backgroundColor: 'var(--forum-bg-primary)',
                borderColor: 'var(--forum-border-light)',
              }}
            >
              <div className="p-2 grid grid-cols-2 gap-1">
                {SKIN_CONCERNS.map((concern) => (
                  <label
                    key={concern.value}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-opacity-50 transition-colors"
                    style={{
                      backgroundColor: filters.concerns?.includes(concern.value)
                        ? 'var(--forum-bg-highlight)'
                        : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.concerns?.includes(concern.value) || false}
                      onChange={() => toggleConcern(concern.value)}
                      className="rounded border-gray-300"
                      style={{ accentColor: 'var(--forum-primary)' }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: 'var(--forum-text-primary)' }}
                    >
                      {concern.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange('sort', option.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor:
                  filters.sort === option.value
                    ? 'var(--forum-primary)'
                    : 'var(--forum-bg-tertiary)',
                color:
                  filters.sort === option.value
                    ? '#ffffff'
                    : 'var(--forum-text-secondary)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CosmeticsPostListBlock = ({ node }: BlockRendererProps) => {
  const {
    viewMode = 'list',
    postsPerPage = 15,
    showPagination = true,
    showFilter = true,
    showSearch = true,
    compactFilter = false,
    data,
  } = node.props;

  const posts: CosmeticsPost[] = data?.posts || [];
  const pagination = data?.pagination || { currentPage: 1, totalPosts: 0, hasMore: false };

  const [filters, setFilters] = useState<CosmeticsFilters>({
    skinType: 'all',
    concerns: [],
    brand: '',
    sort: 'newest',
    search: '',
  });

  const [filteredPosts, setFilteredPosts] = useState<CosmeticsPost[]>(posts);

  // Client-side filtering (for when data comes pre-loaded)
  useEffect(() => {
    let result = [...posts];

    // Filter by skin type
    if (filters.skinType && filters.skinType !== 'all') {
      result = result.filter((post) => {
        const cosmetics = getCosmeticsData(post);
        return cosmetics.skinType === filters.skinType;
      });
    }

    // Filter by concerns
    if (filters.concerns && filters.concerns.length > 0) {
      result = result.filter((post) => {
        const cosmetics = getCosmeticsData(post);
        if (!cosmetics.concerns) return false;
        return filters.concerns.some((c) => cosmetics.concerns?.includes(c));
      });
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (post) =>
          post.title.toLowerCase().includes(searchLower) ||
          post.excerpt?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'popular':
          return b.viewCount - a.viewCount;
        case 'commented':
          return b.commentCount - a.commentCount;
        case 'recommended':
          return b.likeCount - a.likeCount;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredPosts(result);
  }, [posts, filters]);

  const handleFilterChange = (key: keyof CosmeticsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const displayPosts = filteredPosts.slice(0, postsPerPage);

  if (posts.length === 0) {
    return (
      <div className="cosmetics-theme py-6">
        {showFilter && (
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            showSearch={showSearch}
            compact={compactFilter}
          />
        )}
        <div
          className="text-center py-12 rounded-lg border mt-4"
          style={{ ...forumStyles.bgSecondary, ...forumStyles.borderLight }}
        >
          <p style={forumStyles.textMuted}>게시글이 없습니다.</p>
          <p className="text-sm mt-1" style={forumStyles.textMuted}>
            첫 번째 화장품 리뷰를 작성해보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cosmetics-theme cosmetics-post-list py-6">
      {/* Filter Bar */}
      {showFilter && (
        <div className="mb-6">
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            showSearch={showSearch}
            compact={compactFilter}
          />
        </div>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={forumStyles.textMuted}>
          {filteredPosts.length}개의 게시글
        </p>
      </div>

      {/* Post List */}
      <div
        className={
          viewMode === 'card'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : viewMode === 'gallery'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
              : 'space-y-3'
        }
      >
        {displayPosts.map((post) => (
          <CosmeticsPostCard key={post.id} post={post} viewMode={viewMode} />
        ))}
      </div>

      {/* No Results */}
      {displayPosts.length === 0 && posts.length > 0 && (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ ...forumStyles.bgSecondary, ...forumStyles.borderLight }}
        >
          <p style={forumStyles.textMuted}>필터 조건에 맞는 게시글이 없습니다.</p>
          <button
            onClick={() =>
              setFilters({
                skinType: 'all',
                concerns: [],
                brand: '',
                sort: 'newest',
                search: '',
              })
            }
            className="mt-2 text-sm hover:underline"
            style={{ color: 'var(--forum-text-link)' }}
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* Pagination */}
      {showPagination && (pagination.hasMore || pagination.currentPage > 1) && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {pagination.currentPage > 1 && (
            <a
              href={`?page=${pagination.currentPage - 1}`}
              className="px-4 py-2 rounded-lg transition-colors"
              style={forumStyles.buttonSecondary}
            >
              이전
            </a>
          )}
          <span className="px-4 py-2" style={forumStyles.textMuted}>
            {pagination.currentPage} 페이지
          </span>
          {pagination.hasMore && (
            <a
              href={`?page=${pagination.currentPage + 1}`}
              className="px-4 py-2 rounded-lg transition-colors"
              style={forumStyles.buttonPrimary}
            >
              다음
            </a>
          )}
        </div>
      )}
    </div>
  );
};
