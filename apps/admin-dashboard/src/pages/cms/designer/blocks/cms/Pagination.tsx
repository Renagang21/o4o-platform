/**
 * CMS Block - Pagination
 *
 * Pagination - Page navigation for lists
 */

export interface PaginationProps {
  style?: 'default' | 'simple' | 'rounded';
  showFirstLast?: boolean;
  maxPages?: number;
  prevLabel?: string;
  nextLabel?: string;
  activeColor?: string;
}

export default function Pagination({
  style = 'default',
  showFirstLast = true,
  maxPages = 5,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  activeColor = '#3b82f6',
}: PaginationProps) {
  const currentPage = 3;
  const totalPages = 10;

  // Sample page numbers to display
  const pageNumbers = [1, 2, 3, 4, 5];

  const baseButtonClass = style === 'rounded'
    ? 'px-4 py-2 rounded-full'
    : 'px-4 py-2 rounded';

  if (style === 'simple') {
    return (
      <nav className="py-4" aria-label="Pagination">
        <div className="mb-2 p-2 bg-teal-50 border border-teal-200 rounded text-xs text-teal-700">
          📄 Pagination: Dynamic based on query results
        </div>
        <div className="flex justify-between items-center">
          <a
            href="#"
            className="px-6 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            ← {prevLabel}
          </a>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <a
            href="#"
            className="px-6 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {nextLabel} →
          </a>
        </div>
      </nav>
    );
  }

  // Default and rounded styles
  return (
    <nav className="py-4" aria-label="Pagination">
      <div className="mb-2 p-2 bg-teal-50 border border-teal-200 rounded text-xs text-teal-700">
        📄 Pagination: Dynamic based on query results • Max {maxPages} pages shown
      </div>
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {showFirstLast && (
          <a
            href="#"
            className={`${baseButtonClass} bg-white border border-gray-300 hover:bg-gray-50 transition-colors`}
          >
            First
          </a>
        )}

        <a
          href="#"
          className={`${baseButtonClass} bg-white border border-gray-300 hover:bg-gray-50 transition-colors`}
        >
          ← {prevLabel}
        </a>

        {pageNumbers.map(page => (
          <a
            key={page}
            href="#"
            className={`${baseButtonClass} border transition-colors ${
              page === currentPage
                ? 'text-white font-semibold'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            style={page === currentPage ? { backgroundColor: activeColor, borderColor: activeColor } : undefined}
          >
            {page}
          </a>
        ))}

        <a
          href="#"
          className={`${baseButtonClass} bg-white border border-gray-300 hover:bg-gray-50 transition-colors`}
        >
          {nextLabel} →
        </a>

        {showFirstLast && (
          <a
            href="#"
            className={`${baseButtonClass} bg-white border border-gray-300 hover:bg-gray-50 transition-colors`}
          >
            Last
          </a>
        )}
      </div>
    </nav>
  );
}
