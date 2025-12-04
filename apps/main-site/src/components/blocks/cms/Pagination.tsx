/**
 * Pagination Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { useSearchParams } from 'react-router-dom';

export const PaginationBlock = ({ node }: BlockRendererProps) => {
  const {
    style = 'default',
    showFirstLast = true,
    data,
  } = node.props;

  const [searchParams] = useSearchParams();
  const currentPage = data?.currentPage || 1;
  const totalPages = data?.totalPages || 1;
  const hasNext = data?.hasNext || false;
  const hasPrev = data?.hasPrev || false;

  if (totalPages <= 1) {
    return null;
  }

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `?${params.toString()}`;
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <a
          key={i}
          href={getPageUrl(i)}
          className={`px-4 py-2 ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } ${style === 'rounded' ? 'rounded-full' : 'rounded'} border border-gray-300`}
        >
          {i}
        </a>
      );
    }
    return pages;
  };

  if (style === 'simple') {
    return (
      <div className="flex justify-between items-center py-4">
        <a
          href={hasPrev ? getPageUrl(currentPage - 1) : '#'}
          className={`px-4 py-2 ${
            hasPrev ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 pointer-events-none'
          }`}
        >
          ← Previous
        </a>
        <span className="text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <a
          href={hasNext ? getPageUrl(currentPage + 1) : '#'}
          className={`px-4 py-2 ${
            hasNext ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 pointer-events-none'
          }`}
        >
          Next →
        </a>
      </div>
    );
  }

  // Default and rounded styles
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {showFirstLast && currentPage > 1 && (
        <a href={getPageUrl(1)} className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">
          First
        </a>
      )}
      <a
        href={hasPrev ? getPageUrl(currentPage - 1) : '#'}
        className={`px-4 py-2 rounded border border-gray-300 ${
          hasPrev ? 'hover:bg-gray-50' : 'opacity-50 pointer-events-none'
        }`}
      >
        ← Prev
      </a>
      {renderPageNumbers()}
      <a
        href={hasNext ? getPageUrl(currentPage + 1) : '#'}
        className={`px-4 py-2 rounded border border-gray-300 ${
          hasNext ? 'hover:bg-gray-50' : 'opacity-50 pointer-events-none'
        }`}
      >
        Next →
      </a>
      {showFirstLast && currentPage < totalPages && (
        <a
          href={getPageUrl(totalPages)}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        >
          Last
        </a>
      )}
    </div>
  );
};
