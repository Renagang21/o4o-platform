/**
 * Pagination - 페이지네이션 컴포넌트
 */

import { colors } from '../../styles/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
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

  return (
    <nav style={styles.container}>
      <button
        style={{
          ...styles.button,
          ...(currentPage === 1 ? styles.buttonDisabled : {}),
        }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        이전
      </button>

      <div style={styles.pages}>
        {getPageNumbers().map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={index}
              style={{
                ...styles.pageButton,
                ...(page === currentPage ? styles.pageButtonActive : {}),
              }}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ) : (
            <span key={index} style={styles.ellipsis}>
              {page}
            </span>
          )
        )}
      </div>

      <button
        style={{
          ...styles.button,
          ...(currentPage === totalPages ? styles.buttonDisabled : {}),
        }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        다음
      </button>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px 0',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pages: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pageButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  pageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  ellipsis: {
    padding: '0 8px',
    color: colors.neutral500,
  },
};
