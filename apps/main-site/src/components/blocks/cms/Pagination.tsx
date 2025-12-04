/**
 * Pagination Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';

export const PaginationBlock = ({ node }: BlockRendererProps) => {
  const {
    currentPage = 1,
    totalPages = 10,
    style = 'default',
    showFirstLast = true,
  } = node.props;

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
        <button
          key={i}
          className={`px-4 py-2 ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } ${style === 'rounded' ? 'rounded-full' : 'rounded'} border border-gray-300`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  if (style === 'simple') {
    return (
      <div className="flex justify-between items-center">
        <button className="px-4 py-2 text-blue-600 hover:text-blue-700" disabled={currentPage === 1}>
          ← Previous
        </button>
        <span className="text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button className="px-4 py-2 text-blue-600 hover:text-blue-700" disabled={currentPage === totalPages}>
          Next →
        </button>
      </div>
    );
  }

  // Default and rounded styles
  return (
    <div className="flex items-center justify-center gap-2">
      {showFirstLast && currentPage > 1 && (
        <button className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">First</button>
      )}
      <button
        className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        disabled={currentPage === 1}
      >
        ← Prev
      </button>
      {renderPageNumbers()}
      <button
        className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        disabled={currentPage === totalPages}
      >
        Next →
      </button>
      {showFirstLast && currentPage < totalPages && (
        <button className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">Last</button>
      )}
    </div>
  );
};
