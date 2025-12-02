import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

export type PaginationSize = 'sm' | 'md' | 'lg';
export type PaginationVariant = 'outlined' | 'filled' | 'ghost';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: PaginationSize;
  variant?: PaginationVariant;
  className?: string;
  showFirstLast?: boolean;
  siblingCount?: number;
}

const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  variant = 'outlined',
  className,
  showFirstLast = true,
  siblingCount = 1,
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const variantStyles = {
    outlined: 'border border-gray-300 hover:bg-gray-50',
    filled: 'bg-gray-100 hover:bg-gray-200',
    ghost: 'hover:bg-gray-100',
  };

  const activeStyles = {
    outlined: 'border-primary text-primary',
    filled: 'bg-primary text-white hover:bg-primary/90',
    ghost: 'bg-primary/10 text-primary',
  };

  const generatePaginationRange = () => {
    const totalNumbers = siblingCount + 5;
    const totalBlocks = totalNumbers + 2;

    if (totalPages > totalBlocks) {
      const startPage = Math.max(2, currentPage - siblingCount);
      const endPage = Math.min(totalPages - 1, currentPage + siblingCount);

      const pages: (number | string)[] = [];

      if (startPage > 2) {
        pages.push(1, '...');
      } else {
        pages.push(1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages - 1) {
        pages.push('...', totalPages);
      } else {
        pages.push(totalPages);
      }

      return pages;
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const buttonStyles = (isActive: boolean) =>
    twMerge(
      'flex items-center justify-center rounded-md font-medium transition-colors duration-200',
      sizeStyles[size],
      isActive ? activeStyles[variant] : variantStyles[variant],
      'disabled:opacity-50 disabled:cursor-not-allowed'
    );

  return (
    <nav
      className={twMerge('flex items-center justify-center space-x-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={buttonStyles(false)}
          aria-label="First page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      )}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={buttonStyles(false)}
        aria-label="Previous page"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {generatePaginationRange().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && handlePageChange(page)}
          disabled={typeof page !== 'number'}
          className={buttonStyles(page === currentPage)}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={buttonStyles(false)}
        aria-label="Next page"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={buttonStyles(false)}
          aria-label="Last page"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </nav>
  );
};

export default Pagination; 