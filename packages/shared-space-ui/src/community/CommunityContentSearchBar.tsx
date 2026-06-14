/**
 * CommunityContentSearchBar — O4O 표준 커뮤니티 콘텐츠 검색 입력 primitive
 *
 * WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-PHASE2-V1
 *
 * KPA 콘텐츠 목록 검색창(제목·내용·태그)을 service-neutral 순수 입력 component 로 추출.
 * - 디바운스/조회/page 리셋 등은 소비처(wrapper) 책임. 본 component 는 입력 표시만.
 * - controlled: value/onChange. onClear 제공 시 X 버튼 노출.
 */

import { type CSSProperties } from 'react';
import { Search, X } from 'lucide-react';

export interface CommunityContentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  maxWidth?: number | string;
  ariaLabel?: string;
}

export function CommunityContentSearchBar({
  value,
  onChange,
  onClear,
  placeholder = '제목, 내용, 태그로 검색',
  maxWidth = 448,
  ariaLabel = '콘텐츠 검색',
}: CommunityContentSearchBarProps) {
  return (
    <div style={{ ...styles.wrap, maxWidth }}>
      <Search style={styles.searchIcon} aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={styles.input}
      />
      {onClear && value && (
        <button type="button" onClick={onClear} aria-label="검색 초기화" style={styles.clearBtn}>
          <X style={styles.clearIcon} aria-hidden />
        </button>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { position: 'relative', width: '100%' },
  searchIcon: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    width: 16, height: 16, color: '#94a3b8', pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '10px 36px', fontSize: '0.875rem',
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer',
  },
  clearIcon: { width: 16, height: 16 },
};

export default CommunityContentSearchBar;
