/**
 * B2BRevenueSection — B2B 매출 기회 블록 (테이블형)
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: 카드→HubList→테이블 전환
 *
 * Hub 핵심 블록. B2BPreviewItem을 테이블 형식으로 렌더링.
 * 컬럼: 상품명 / 공급사 / 카테고리 / 상태 / 등록일 / 액션
 * 정렬: 모든 컬럼 클릭 정렬 (asc/desc 토글)
 * 검색: 상품명, 공급사, 카테고리 통합 검색
 * items가 비어있으면 null 반환 (optional section).
 */

import { useState, useMemo } from 'react';
import type { B2BPreviewItem, B2BRevenueSectionProps } from '../types.js';

type SortKey = 'name' | 'supplier' | 'category' | 'status' | 'date';
type SortOrder = 'asc' | 'desc';

function getSortValue(item: B2BPreviewItem, key: SortKey): string {
  switch (key) {
    case 'name': return item.name || '';
    case 'supplier': return item.supplierName || '';
    case 'category': return item.badge || '';
    case 'status': return item.status?.label || '';
    case 'date': return item.date || '';
  }
}

export function B2BRevenueSection({ items, title, ctaLabel, onCtaClick }: B2BRevenueSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [search, setSearch] = useState('');

  const filteredAndSorted = useMemo(() => {
    let result = items;

    // 검색 필터
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.supplierName || '').toLowerCase().includes(q) ||
        (item.badge || '').toLowerCase().includes(q) ||
        (item.status?.label || '').toLowerCase().includes(q),
      );
    }

    // 정렬
    if (sortKey) {
      const dir = sortOrder === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        return va.localeCompare(vb, 'ko') * dir;
      });
    }

    return result;
  }, [items, search, sortKey, sortOrder]);

  if (items.length === 0) return null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div style={styles.wrapper}>
      {/* Section Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>{title || 'B2B'}</h2>
        {ctaLabel && onCtaClick && (
          <button onClick={onCtaClick} style={styles.ctaButton}>
            {ctaLabel} &rarr;
          </button>
        )}
      </div>

      {/* Search + Count */}
      <div style={styles.toolbar}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="상품명, 공급사, 카테고리 검색..."
          style={styles.searchInput}
        />
        <span style={styles.resultCount}>
          총 {filteredAndSorted.length}건
        </span>
      </div>

      {/* Table */}
      <div style={styles.tableCard}>
        {/* Table Header */}
        <div style={styles.tableHeader}>
          <span style={{ ...styles.th, flex: 2, cursor: 'pointer' }} onClick={() => handleSort('name')}>
            상품명{sortIndicator('name')}
          </span>
          <span style={{ ...styles.th, flex: 1.2, cursor: 'pointer' }} onClick={() => handleSort('supplier')}>
            공급사{sortIndicator('supplier')}
          </span>
          <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('category')}>
            카테고리{sortIndicator('category')}
          </span>
          <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('status')}>
            상태{sortIndicator('status')}
          </span>
          <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('date')}>
            등록일{sortIndicator('date')}
          </span>
          <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>액션</span>
        </div>

        {/* Table Rows */}
        {filteredAndSorted.length === 0 ? (
          <div style={styles.emptyRow}>
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredAndSorted.map(item => (
            <div key={item.id} style={styles.tableRow}>
              {/* 상품명 */}
              <div style={{ ...styles.td, flex: 2, minWidth: 0 }}>
                <span style={styles.rowTitle}>{item.name}</span>
                {item.description && (
                  <span style={styles.rowDesc}>{item.description}</span>
                )}
              </div>

              {/* 공급사 */}
              <div style={{ ...styles.td, flex: 1.2 }}>
                <div style={styles.supplierCell}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.supplierName || ''} style={styles.supplierLogo} />
                  ) : (
                    <div style={styles.supplierLogoPlaceholder}>
                      {(item.supplierName || '?').charAt(0)}
                    </div>
                  )}
                  <span style={styles.supplierName}>{item.supplierName || '-'}</span>
                </div>
              </div>

              {/* 카테고리 */}
              <div style={{ ...styles.td, flex: 0.8 }}>
                {item.badge && (
                  <span style={styles.categoryBadge}>{item.badge}</span>
                )}
              </div>

              {/* 상태 */}
              <div style={{ ...styles.td, flex: 0.8 }}>
                {item.status ? (
                  <span style={{
                    ...styles.stateBadge,
                    color: item.status.color,
                    backgroundColor: item.status.bg,
                    borderColor: item.status.border,
                  }}>
                    {item.status.label}
                  </span>
                ) : (
                  <span style={styles.noData}>-</span>
                )}
              </div>

              {/* 등록일 */}
              <div style={{ ...styles.td, flex: 0.8 }}>
                <span style={styles.rowDate}>{item.date || '-'}</span>
              </div>

              {/* 액션 */}
              <div style={{ ...styles.td, flex: 1, justifyContent: 'flex-end' }}>
                {item.actionLabel ? (
                  item.actionStyle === 'primary' ? (
                    <button onClick={item.onAction} style={styles.applyButton}>
                      {item.actionLabel}
                    </button>
                  ) : item.actionStyle === 'navigate' ? (
                    <button onClick={item.onAction} style={styles.buttonNavigate}>
                      {item.actionLabel}
                    </button>
                  ) : (
                    <button disabled style={styles.buttonDisabled}>
                      {item.actionLabel}
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// 스타일 (HubB2BCatalogPage 테이블 스타일과 통일)
// ============================================

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '24px 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  ctaButton: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#0d9488',
    backgroundColor: 'transparent',
    border: '1px solid #99f6e4',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
  },
  searchInput: {
    flex: 1,
    maxWidth: '360px',
    padding: '8px 14px',
    fontSize: '0.8125rem',
    color: '#334155',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
  },
  resultCount: {
    fontSize: '0.8125rem',
    color: '#64748b',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '10px 20px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    userSelect: 'none' as const,
  },
  th: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    transition: 'color 0.15s',
  } as React.CSSProperties,
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.1s',
  },
  td: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    color: '#334155',
    paddingRight: '12px',
  } as React.CSSProperties,
  rowTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  rowDesc: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    lineHeight: 1.4,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  rowDate: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  supplierCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  supplierLogo: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    objectFit: 'cover' as const,
  },
  supplierLogoPlaceholder: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: '#f0fdfa',
    color: '#0d9488',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.625rem',
    fontWeight: 700,
  },
  supplierName: {
    fontSize: '0.8125rem',
    color: '#475569',
    fontWeight: 500,
  },
  stateBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
  },
  noData: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  emptyRow: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  applyButton: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#0d9488',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  buttonDisabled: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  buttonNavigate: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};
