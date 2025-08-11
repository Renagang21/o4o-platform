import { __ } from '@wordpress/i18n';
/**
 * Pagination Component
 * 
 * Multiple pagination styles for the CPT/ACF Loop block
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import { Button, Spinner, SelectControl, RangeControl } from '@wordpress/components';
import { chevronLeft, chevronRight } from '@wordpress/icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  paginationType: 'numbers' | 'loadmore' | 'infinite' | 'none';
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  paginationType,
  isLoading = false,
  onLoadMore,
  hasMore = true,
}: PaginationProps) => {
  switch (paginationType) {
    case 'loadmore':
      return (
        <LoadMorePagination
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore || (() => onPageChange(currentPage + 1))}
        />
      );
    
    case 'infinite':
      return (
        <InfiniteScrollPagination
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore || (() => onPageChange(currentPage + 1))}
        />
      );
    
    case 'numbers':
    default:
      return (
        <NumbersPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      );
  }
};

// Numbers Pagination Component
const NumbersPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading,
}: Omit<PaginationProps, 'paginationType' | 'onLoadMore' | 'hasMore'>) => {
  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const delta = 2; // Number of pages to show on each side of current page
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    // Always show first page
    range.push(1);

    // Calculate range around current page
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    // Always show last page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Add dots where needed
    range.forEach((i) => {
      if (typeof i === 'number' && l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      if (typeof i === 'number') {
        l = i;
      }
    });

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();
  const currentPageNum = Number(currentPage);
  const startItem = (currentPageNum - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPageNum * itemsPerPage, totalItems);

  return (
    <nav 
      className="o4o-cpt-acf-loop__pagination o4o-cpt-acf-loop__pagination--numbers"
      aria-label={'Posts navigation'}
    >
      <div className="o4o-cpt-acf-loop__pagination-info">
        {'Showing'} {startItem}-{endItem} {'of'} {totalItems} {'items'}
      </div>

      <div className="o4o-cpt-acf-loop__pagination-controls">
        {/* Previous button */}
        <Button
          variant="tertiary"
          icon={chevronLeft}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          label={'Previous page'}
        >
          {'Previous'}
        </Button>

        {/* Page numbers */}
        <div className="o4o-cpt-acf-loop__pagination-numbers">
          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <span 
                  key={`dots-${index}`}
                  className="o4o-cpt-acf-loop__pagination-dots"
                >
                  {pageNumber}
                </span>
              );
            }

            const page = pageNumber as number;
            const isActive = page === currentPage;

            return (
              <Button
                key={page}
                variant={isActive ? 'primary' : 'tertiary'}
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className={`o4o-cpt-acf-loop__pagination-number ${
                  isActive ? 'is-active' : ''
                }`}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="tertiary"
          icon={chevronRight}
          iconPosition="right"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          label={'Next page'}
        >
          {'Next'}
        </Button>
      </div>
    </nav>
  );
};

// Load More Pagination Component
const LoadMorePagination = ({
  isLoading,
  hasMore,
  onLoadMore,
}: {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) => {
  if (!hasMore) {
    return (
      <div className="o4o-cpt-acf-loop__pagination o4o-cpt-acf-loop__pagination--loadmore">
        <p className="o4o-cpt-acf-loop__pagination-end">
          {'No more posts to load'}
        </p>
      </div>
    );
  }

  return (
    <div className="o4o-cpt-acf-loop__pagination o4o-cpt-acf-loop__pagination--loadmore">
      <Button
        variant="primary"
        onClick={onLoadMore}
        disabled={isLoading}
        className="o4o-cpt-acf-loop__loadmore-button"
      >
        {isLoading ? (
          <>
            <Spinner />
            <span style={{ marginLeft: '8px' }}>{'Loading...'}</span>
          </>
        ) : (
          'Load More Posts'
        )}
      </Button>
    </div>
  );
};

// Infinite Scroll Pagination Component
const InfiniteScrollPagination = ({
  isLoading,
  hasMore,
  onLoadMore,
}: {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) => {
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Intersection Observer callback
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry.isIntersecting);
    },
    []
  );

  // Set up Intersection Observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection]);

  // Trigger load more when intersecting
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, isLoading, onLoadMore]);

  return (
    <div 
      ref={observerTarget}
      className="o4o-cpt-acf-loop__pagination o4o-cpt-acf-loop__pagination--infinite"
    >
      {isLoading && (
        <div className="o4o-cpt-acf-loop__pagination-loader">
          <Spinner />
          <span>{'Loading more posts...'}</span>
        </div>
      )}
      
      {!hasMore && (
        <p className="o4o-cpt-acf-loop__pagination-end">
          {__('You\'ve reached the end', 'o4o')}
        </p>
      )}
    </div>
  );
};

// Pagination Settings Component for Inspector Controls
export const PaginationSettings = ({
  paginationType,
  postsPerPage,
  onTypeChange,
  onPostsPerPageChange,
}: {
  paginationType: string;
  postsPerPage: number;
  onTypeChange: (type: string) => void;
  onPostsPerPageChange: (count: number) => void;
}) => {
  return (
    <>
      <SelectControl
        label={'Pagination Type'}
        value={paginationType as any}
        options={[
          { label: 'Page Numbers', value: 'numbers' },
          { label: 'Load More Button', value: 'loadmore' },
          { label: 'Infinite Scroll', value: 'infinite' },
          { label: 'No Pagination', value: 'none' },
        ]}
        onChange={onTypeChange}
        help={'Choose how users navigate through posts'}
      />

      {paginationType !== 'none' && (
        <RangeControl
          label={'Posts Per Page'}
          value={postsPerPage}
          onChange={(value: number | undefined) => value !== undefined && onPostsPerPageChange(value)}
          min={1}
          max={50}
          step={1}
          help={'Number of posts to display per page'}
        />
      )}
    </>
  );
};