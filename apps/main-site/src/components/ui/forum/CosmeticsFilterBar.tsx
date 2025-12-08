/**
 * CosmeticsFilterBar - Cosmetics-specific filter component
 *
 * Provides filtering by skinType, concerns, brand, and sort options.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  { value: '트러블', label: '트러블' },
  { value: '블랙헤드', label: '블랙헤드' },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'commented', label: '댓글순' },
  { value: 'recommended', label: '추천순' },
] as const;

export interface CosmeticsFilters {
  skinType?: string;
  concerns?: string[];
  brand?: string;
  productId?: string;
  sort?: string;
  search?: string;
}

interface CosmeticsFilterBarProps {
  onFilterChange?: (filters: CosmeticsFilters) => void;
  initialFilters?: CosmeticsFilters;
  showSearch?: boolean;
  showBrandFilter?: boolean;
  compact?: boolean;
}

export function CosmeticsFilterBar({
  onFilterChange,
  initialFilters = {},
  showSearch = true,
  showBrandFilter = false,
  compact = false,
}: CosmeticsFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL or props
  const [filters, setFilters] = useState<CosmeticsFilters>(() => ({
    skinType: searchParams.get('skinType') || initialFilters.skinType || 'all',
    concerns: searchParams.get('concerns')?.split(',').filter(Boolean) || initialFilters.concerns || [],
    brand: searchParams.get('brand') || initialFilters.brand || '',
    productId: searchParams.get('productId') || initialFilters.productId || '',
    sort: searchParams.get('sort') || initialFilters.sort || 'newest',
    search: searchParams.get('q') || initialFilters.search || '',
  }));

  const [showConcernsDropdown, setShowConcernsDropdown] = useState(false);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.skinType && filters.skinType !== 'all') {
      params.set('skinType', filters.skinType);
    }
    if (filters.concerns && filters.concerns.length > 0) {
      params.set('concerns', filters.concerns.join(','));
    }
    if (filters.brand) {
      params.set('brand', filters.brand);
    }
    if (filters.productId) {
      params.set('productId', filters.productId);
    }
    if (filters.sort && filters.sort !== 'newest') {
      params.set('sort', filters.sort);
    }
    if (filters.search) {
      params.set('q', filters.search);
    }

    // Preserve page if exists
    const currentPage = searchParams.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', currentPage);
    }

    setSearchParams(params, { replace: true });
    onFilterChange?.(filters);
  }, [filters]);

  const updateFilter = (key: keyof CosmeticsFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    // Reset page when filter changes
    const params = new URLSearchParams(searchParams);
    params.delete('page');
    setSearchParams(params, { replace: true });
  };

  const toggleConcern = (concern: string) => {
    setFilters((prev) => {
      const current = prev.concerns || [];
      const newConcerns = current.includes(concern)
        ? current.filter((c) => c !== concern)
        : [...current, concern];
      return { ...prev, concerns: newConcerns };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      skinType: 'all',
      concerns: [],
      brand: '',
      productId: '',
      sort: 'newest',
      search: '',
    });
  };

  const hasActiveFilters =
    (filters.skinType && filters.skinType !== 'all') ||
    (filters.concerns && filters.concerns.length > 0) ||
    filters.brand ||
    filters.search;

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateFilter('search', formData.get('search') as string);
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
        <form onSubmit={handleSearchSubmit} className={compact ? 'mb-3' : 'mb-4'}>
          <div className="relative">
            <input
              type="text"
              name="search"
              placeholder="검색어를 입력하세요..."
              defaultValue={filters.search}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 pr-10"
              style={{
                backgroundColor: 'var(--forum-bg-secondary)',
                borderColor: 'var(--forum-border-medium)',
                color: 'var(--forum-text-primary)',
              }}
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--forum-text-muted)' }}
            >
              🔍
            </button>
          </div>
        </form>
      )}

      {/* Filter Chips Row */}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mb-4'}`}>
        {/* Skin Type Selector */}
        <div className="flex flex-wrap gap-1">
          {SKIN_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => updateFilter('skinType', type.value)}
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

      {/* Brand Filter (optional) */}
      {showBrandFilter && (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <input
            type="text"
            placeholder="브랜드 검색..."
            value={filters.brand || ''}
            onChange={(e) => updateFilter('brand', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--forum-bg-secondary)',
              borderColor: 'var(--forum-border-medium)',
              color: 'var(--forum-text-primary)',
            }}
          />
        </div>
      )}

      {/* Sort Options & Clear Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter('sort', option.value)}
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

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs hover:underline"
            style={{ color: 'var(--forum-text-link)' }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--forum-border-light)' }}>
          {filters.skinType && filters.skinType !== 'all' && (
            <FilterChip
              label={`피부타입: ${SKIN_TYPES.find((t) => t.value === filters.skinType)?.label}`}
              onRemove={() => updateFilter('skinType', 'all')}
            />
          )}
          {filters.concerns?.map((concern) => (
            <FilterChip
              key={concern}
              label={concern}
              onRemove={() => toggleConcern(concern)}
            />
          ))}
          {filters.brand && (
            <FilterChip
              label={`브랜드: ${filters.brand}`}
              onRemove={() => updateFilter('brand', '')}
            />
          )}
          {filters.search && (
            <FilterChip
              label={`검색: ${filters.search}`}
              onRemove={() => updateFilter('search', '')}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
      style={{
        backgroundColor: 'var(--forum-bg-highlight)',
        color: 'var(--forum-primary)',
      }}
    >
      {label}
      <button onClick={onRemove} className="ml-1 hover:opacity-70">
        ✕
      </button>
    </span>
  );
}

export default CosmeticsFilterBar;
