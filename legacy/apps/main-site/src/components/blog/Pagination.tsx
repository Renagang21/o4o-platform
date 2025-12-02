/**
 * Pagination Component
 * Provides various pagination styles for blog archives
 * Supports numbers, prev/next, and infinite scroll patterns
 */

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationSettings {
  enabled: boolean;
  type: 'numbers' | 'prevNext' | 'loadMore' | 'infinite';
  postsPerPage: number;
  showNumbers: boolean;
  showPrevNext: boolean;
  maxVisiblePages: number;
  loadMoreText: string;
  prevText: string;
  nextText: string;
  alignment: 'left' | 'center' | 'right';
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  onLoadMore?: () => void;
  settings: PaginationSettings;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  loading?: boolean;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onLoadMore,
  settings,
  hasNextPage,
  hasPrevPage,
  loading = false,
  className = ''
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore?.();
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasNextPage, onLoadMore]);

  // Generate page numbers array
  const generatePageNumbers = () => {
    const { maxVisiblePages } = settings;
    const pages = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate start and end pages
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // Add visible pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Render numbers pagination
  const renderNumbersPagination = () => {
    const pages = generatePageNumbers();
    
    return (
      <div className="pagination-numbers">
        {/* Previous Button */}
        {settings.showPrevNext && (
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!hasPrevPage || loading}
            className="pagination-btn pagination-prev"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span>{settings.prevText}</span>
          </button>
        )}

        {/* Page Numbers */}
        {settings.showNumbers && (
          <div className="pagination-pages">
            {pages.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="pagination-ellipsis">
                    <MoreHorizontal size={16} />
                  </span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page as number)}
                    disabled={loading}
                    className={`pagination-btn pagination-number ${
                      page === currentPage ? 'active' : ''
                    }`}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Next Button */}
        {settings.showPrevNext && (
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasNextPage || loading}
            className="pagination-btn pagination-next"
            aria-label="Next page"
          >
            <span>{settings.nextText}</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    );
  };

  // Render prev/next only pagination
  const renderPrevNextPagination = () => (
    <div className="pagination-prevnext">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrevPage || loading}
        className="pagination-btn pagination-prev"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
        <span>{settings.prevText}</span>
      </button>

      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage || loading}
        className="pagination-btn pagination-next"
        aria-label="Next page"
      >
        <span>{settings.nextText}</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );

  // Render load more pagination
  const renderLoadMorePagination = () => (
    <div className="pagination-loadmore">
      {hasNextPage && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore || loading}
          className="pagination-btn pagination-loadmore-btn"
          aria-label="Load more posts"
        >
          {isLoadingMore ? 'Loading...' : settings.loadMoreText}
        </button>
      )}
      
      <div className="pagination-info">
        Showing page {currentPage} of {totalPages}
      </div>
    </div>
  );

  // Don't render if disabled or only one page
  if (!settings.enabled || totalPages <= 1) {
    return null;
  }

  // Get alignment class
  const alignmentClass = `pagination-align-${settings.alignment}`;

  return (
    <nav 
      className={`pagination pagination-${settings.type} ${alignmentClass} ${className}`}
      role="navigation"
      aria-label="Blog pagination"
    >
      {settings.type === 'numbers' && renderNumbersPagination()}
      {settings.type === 'prevNext' && renderPrevNextPagination()}
      {settings.type === 'loadMore' && renderLoadMorePagination()}
      
      {/* Pagination Styles */}
      <style>{`
        .pagination {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .pagination-align-left {
          justify-content: flex-start;
        }

        .pagination-align-center {
          justify-content: center;
        }

        .pagination-align-right {
          justify-content: flex-end;
        }

        .pagination-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .pagination-prevnext {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pagination-loadmore {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .pagination-pages {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border: 1px solid #e1e5e9;
          background: white;
          color: #495057;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 40px;
          justify-content: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #d1d5db;
          color: #374151;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8f9fa;
        }

        .pagination-btn.active {
          background: #0073e6;
          border-color: #0073e6;
          color: white;
        }

        .pagination-btn.active:hover {
          background: #005bb5;
          border-color: #005bb5;
        }

        .pagination-number {
          min-width: 40px;
          padding: 8px 12px;
        }

        .pagination-prev,
        .pagination-next {
          font-weight: 600;
        }

        .pagination-loadmore-btn {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          background: #0073e6;
          border-color: #0073e6;
          color: white;
        }

        .pagination-loadmore-btn:hover:not(:disabled) {
          background: #005bb5;
          border-color: #005bb5;
        }

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
          color: #6c757d;
        }

        .pagination-info {
          font-size: 14px;
          color: #6c757d;
          white-space: nowrap;
        }

        /* Loading state */
        .pagination-btn:disabled.loading {
          position: relative;
        }

        .pagination-btn:disabled.loading::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          margin: auto;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .pagination {
            gap: 4px;
          }

          .pagination-btn {
            padding: 6px 8px;
            font-size: 13px;
            min-width: 36px;
          }

          .pagination-number {
            min-width: 36px;
            padding: 6px 8px;
          }

          .pagination-prev span,
          .pagination-next span {
            display: none;
          }

          .pagination-prevnext {
            gap: 12px;
            width: 100%;
            justify-content: space-between;
          }

          .pagination-info {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .pagination-pages {
            flex-wrap: wrap;
            justify-content: center;
            gap: 1px;
          }

          .pagination-btn {
            padding: 6px 10px;
            font-size: 12px;
            min-width: 32px;
          }

          .pagination-number {
            min-width: 32px;
            padding: 6px 10px;
          }

          .pagination-loadmore-btn {
            padding: 10px 20px;
            font-size: 14px;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .pagination-btn {
            border-width: 2px;
          }

          .pagination-btn:focus {
            outline: 2px solid currentColor;
            outline-offset: 2px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .pagination-btn {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Pagination;