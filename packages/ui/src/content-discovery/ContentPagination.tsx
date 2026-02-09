/**
 * ContentPagination - 페이지네이션 컴포넌트
 *
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1
 *
 * 기반: web-kpa-society Pagination.tsx 패턴
 * - Ellipsis 지원 (1...5 6 7...10)
 * - 이전/다음 버튼
 * - 아이템 범위 표시 옵션
 */

import React from 'react';

export interface ContentPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** 아이템 범위 표시 ("1-20 of 150") */
  showItemRange?: boolean;
  totalItems?: number;
  pageSize?: number;
  /** 크기 */
  size?: 'sm' | 'md';
}

export function ContentPagination({
  currentPage,
  totalPages,
  onPageChange,
  showItemRange = false,
  totalItems,
  pageSize = 20,
  size = 'md',
}: ContentPaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
      // 스크롤 상단으로
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 0',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: size === 'sm' ? '13px' : '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const pagesStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const pageButtonStyle: React.CSSProperties = {
    width: size === 'sm' ? '32px' : '36px',
    height: size === 'sm' ? '32px' : '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: size === 'sm' ? '13px' : '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  const pageButtonActiveStyle: React.CSSProperties = {
    ...pageButtonStyle,
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    color: '#FFFFFF',
  };

  const ellipsisStyle: React.CSSProperties = {
    padding: '0 8px',
    color: '#9CA3AF',
  };

  const rangeStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6B7280',
  };

  // 아이템 범위 계산
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || currentPage * pageSize);

  return (
    <div style={containerStyle}>
      {showItemRange && totalItems && (
        <div style={rangeStyle}>
          {startItem}-{endItem} / {totalItems.toLocaleString()}개
        </div>
      )}

      <nav style={navStyle}>
        <button
          style={currentPage === 1 ? buttonDisabledStyle : buttonStyle}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          이전
        </button>

        <div style={pagesStyle}>
          {getPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                style={page === currentPage ? pageButtonActiveStyle : pageButtonStyle}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ) : (
              <span key={index} style={ellipsisStyle}>
                {page}
              </span>
            )
          )}
        </div>

        <button
          style={currentPage === totalPages ? buttonDisabledStyle : buttonStyle}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          다음
        </button>
      </nav>
    </div>
  );
}
