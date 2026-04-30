/**
 * ForumSearchBar - 포럼 통합 검색바
 *
 * WO-FORUM-SEARCH-FIRST-HUB-UX-V1:
 * - 포럼 + 게시글 통합 검색 입력
 * - 300ms debounce, 최소 2글자
 * - Enter 키 즉시 검색
 */

import { useState, useRef, useEffect } from 'react';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface ForumSearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export function ForumSearchBar({ onSearch, onClear, isSearching }: ForumSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      timerRef.current = setTimeout(() => onSearch(trimmed), 300);
    } else if (trimmed.length === 0 && isSearching) {
      onClear();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      const trimmed = inputValue.trim();
      if (trimmed.length >= 2) {
        onSearch(trimmed);
      }
    }
  }

  function handleClear() {
    setInputValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onClear();
  }

  return (
    <div style={styles.container}>
      <div style={styles.searchWrapper}>
        <SearchIcon />
        <input
          type="text"
          placeholder="포럼 이름 또는 게시글 검색..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={styles.input}
        />
        {inputValue && (
          <button onClick={handleClear} style={styles.clearBtn} aria-label="검색 초기화">
            ×
          </button>
        )}
      </div>
      {inputValue.trim().length === 1 && (
        <p style={styles.hint}>2글자 이상 입력하세요</p>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: colors.neutral400 }}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0 0`,
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
    padding: `${spacing.sm} ${spacing.md}`,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    color: colors.neutral900,
    backgroundColor: 'transparent',
    padding: `${spacing.sm} 0`,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: colors.neutral400,
    cursor: 'pointer',
    padding: spacing.xs,
    lineHeight: 1,
    flexShrink: 0,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: '0.75rem',
    color: colors.neutral400,
    margin: `${spacing.xs} 0 0`,
  },
};
