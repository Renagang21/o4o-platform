/**
 * HubContentLibraryPage - 플랫폼 콘텐츠 라이브러리
 *
 * WO-O4O-HUB-CONTENT-LIBRARY-V1
 * WO-O4O-KPA-CONTENT-HUB-LIST-UX-REFINE-V1: 카드→테이블, 탭 확장, 검색, 복사 UX 개선
 *
 * Hub 공용공간에서 플랫폼이 제공하는 CMS 콘텐츠를 탐색하고
 * "내 매장에 복사" 버튼으로 자신의 매장 자산에 추가하는 페이지.
 *
 * 사용 API:
 *   - cmsApi.getContents() : 플랫폼 CMS 콘텐츠 목록 조회
 *   - assetSnapshotApi.copy() : 콘텐츠를 내 매장에 복사
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { cmsApi, type CmsContent } from '../../api/cms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';

// ============================================
// 타입 필터 정의
// ============================================

type ContentTypeFilter = 'all' | 'notice' | 'news' | 'guide' | 'knowledge' | 'event' | 'promo';

const TYPE_TABS: { key: ContentTypeFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지사항' },
  { key: 'news', label: '뉴스' },
  { key: 'guide', label: '가이드' },
  { key: 'knowledge', label: '지식자료' },
  { key: 'event', label: '이벤트' },
  { key: 'promo', label: '프로모션' },
];

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  notice: { bg: '#fef3c7', text: '#92400e' },
  news: { bg: '#d1fae5', text: '#065f46' },
  guide: { bg: '#dbeafe', text: '#1e40af' },
  knowledge: { bg: '#ede9fe', text: '#5b21b6' },
  event: { bg: '#ffedd5', text: '#9a3412' },
  promo: { bg: '#fce7f3', text: '#9d174d' },
};

const PAGE_LIMIT = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 전`;
  const minutes = Math.floor(diff / (1000 * 60));
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

// ============================================
// 컴포넌트
// ============================================

export function HubContentLibraryPage() {
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContents = useCallback(async (type: ContentTypeFilter, pageOffset: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await cmsApi.getContents({
        serviceKey: 'kpa',
        type: type === 'all' ? undefined : type,
        status: 'published',
        search: search || undefined,
        limit: PAGE_LIMIT,
        offset: pageOffset,
      });
      setContents(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || '콘텐츠 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(typeFilter, offset, searchQuery);
  }, [fetchContents, typeFilter, offset, searchQuery]);

  const handleTypeChange = (type: ContentTypeFilter) => {
    setTypeFilter(type);
    setOffset(0);
    setCopiedId(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setOffset(0);
    setCopiedId(null);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setOffset(0);
  };

  const handleCopy = async (content: CmsContent) => {
    setCopyingId(content.id);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: content.id,
        assetType: 'cms',
      });
      toast.success(`"${content.title}" 복사 완료`);
      setCopiedId(content.id);
    } catch (e: any) {
      toast.error(e.message || '복사에 실패했습니다.');
    } finally {
      setCopyingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setOffset((p - 1) * PAGE_LIMIT);
    setCopiedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const hasFilters = !!searchQuery || typeFilter !== 'all';

  return (
    <div style={s.container}>
      {/* Hero */}
      <header style={s.hero}>
        <h1 style={s.heroTitle}>플랫폼 콘텐츠</h1>
        <p style={s.heroDesc}>
          본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.
        </p>
      </header>

      {/* Search */}
      <form style={s.searchForm} onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="제목 또는 요약 검색"
          style={s.searchInput}
        />
        <button type="submit" style={s.searchBtn}>검색</button>
      </form>

      {/* Type Filter Tabs */}
      <div style={s.filterBar}>
        <div style={s.categories}>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTypeChange(tab.key)}
              style={{
                ...s.catBtn,
                ...(typeFilter === tab.key ? s.catBtnActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div style={s.activeFilters}>
          <span style={s.activeLabel}>
            {searchQuery && `"${searchQuery}" `}
            {typeFilter !== 'all' && TYPE_TABS.find(t => t.key === typeFilter)?.label}
          </span>
          <button onClick={() => { handleClearSearch(); setTypeFilter('all'); }} style={s.clearBtn}>
            초기화
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead><tr>
              <th style={{ ...s.th, width: '80px' }}>유형</th>
              <th style={s.th}>제목</th>
              <th style={{ ...s.th, width: '200px' }}>요약</th>
              <th style={{ ...s.th, width: '100px' }}>작성일</th>
              <th style={{ ...s.th, width: '120px' }}></th>
            </tr></thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i}><td colSpan={5} style={s.td}>
                  <div style={{ height: '14px', backgroundColor: colors.neutral200, borderRadius: '4px', width: `${50 + i * 8}%` }} />
                </td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={s.emptyState}>
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button onClick={() => fetchContents(typeFilter, offset, searchQuery)} style={s.retryButton}>
            다시 시도
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          {/* Info bar */}
          <div style={s.infoBar}>
            <span style={s.totalCount}>
              {hasFilters ? `검색 결과 ${total}건` : `총 ${total}개의 콘텐츠`}
            </span>
            {totalPages > 1 && (
              <span style={s.pageInfo}>{currentPage} / {totalPages} 페이지</span>
            )}
          </div>

          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '80px' }}>유형</th>
                  <th style={s.th}>제목</th>
                  <th style={{ ...s.th, width: '200px' }}>요약</th>
                  <th style={{ ...s.th, width: '100px' }}>작성일</th>
                  <th style={{ ...s.th, width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {contents.length > 0 ? contents.map(item => {
                  const badgeColor = TYPE_BADGE_COLORS[item.type] || { bg: '#f1f5f9', text: '#475569' };
                  const isCopying = copyingId === item.id;
                  const isCopied = copiedId === item.id;

                  return (
                    <tr key={item.id} style={item.isPinned ? s.pinnedRow : s.row}>
                      <td style={{ ...s.td, width: '80px', textAlign: 'center' }}>
                        <span style={{ ...s.typeBadge, backgroundColor: badgeColor.bg, color: badgeColor.text }}>
                          {TYPE_TABS.find(t => t.key === item.type)?.label || item.type}
                        </span>
                        {item.isPinned && <span style={s.pinnedBadge}>고정</span>}
                      </td>
                      <td style={s.td}>
                        <span style={s.titleText}>{item.title}</span>
                      </td>
                      <td style={{ ...s.td, width: '200px', color: colors.neutral500, fontSize: '13px' }}>
                        <span style={s.summaryText}>{item.summary || '-'}</span>
                      </td>
                      <td style={{ ...s.td, width: '100px', color: colors.neutral400, fontSize: '13px' }}>
                        {formatDate(item.publishedAt || item.createdAt)}
                      </td>
                      <td style={{ ...s.td, width: '120px', textAlign: 'center' }}>
                        {isCopied ? (
                          <Link to="/store/content" style={s.goToStoreLink}>
                            작업하러 가기
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleCopy(item)}
                            disabled={isCopying}
                            style={{
                              ...s.copyButton,
                              opacity: isCopying ? 0.6 : 1,
                              cursor: isCopying ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isCopying ? '복사 중...' : '내 매장에 복사'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} style={s.emptyCell}>
                      {hasFilters ? (
                        <>
                          <p style={s.emptyTitle}>검색 결과가 없습니다</p>
                          <button onClick={() => { handleClearSearch(); setTypeFilter('all'); }} style={s.emptyBtn}>
                            전체 목록 보기
                          </button>
                        </>
                      ) : (
                        <p style={s.emptyTitle}>현재 제공되는 콘텐츠가 없습니다</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => goToPage(1)} disabled={currentPage === 1}
                style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}>&laquo;</button>
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                style={{ ...s.pageBtn, ...(currentPage === 1 ? s.pageBtnDisabled : {}) }}>&lsaquo;</button>
              {pageNumbers.map(p => (
                <button key={p} onClick={() => goToPage(p)}
                  style={{ ...s.pageBtn, ...(p === currentPage ? s.pageBtnActive : {}) }}>{p}</button>
              ))}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}>&rsaquo;</button>
              <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                style={{ ...s.pageBtn, ...(currentPage === totalPages ? s.pageBtnDisabled : {}) }}>&raquo;</button>
            </div>
          )}
        </>
      )}

      {/* Guide notice */}
      <div style={s.notice}>
        <span style={s.noticeIcon}>💡</span>
        <span>
          복사된 콘텐츠는{' '}
          <Link to="/store/content" style={{ color: colors.primary }}>내 매장 &gt; 자산 관리</Link>
          에서 게시 상태를 관리할 수 있습니다.
        </span>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },

  // Hero
  hero: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  heroDesc: {
    margin: '6px 0 0',
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  // Search
  searchForm: { display: 'flex', gap: '8px', marginBottom: '12px' },
  searchInput: {
    flex: 1, padding: '8px 14px', fontSize: '14px', border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px', outline: 'none', backgroundColor: colors.white, boxSizing: 'border-box',
  } as React.CSSProperties,
  searchBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 500, color: colors.white,
    backgroundColor: colors.primary, border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
  } as React.CSSProperties,

  // Filter
  filterBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap', marginBottom: '8px',
  } as React.CSSProperties,
  categories: { display: 'flex', gap: '8px', flexWrap: 'wrap' } as React.CSSProperties,
  catBtn: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    border: `1px solid ${colors.neutral300}`, borderRadius: '20px',
    backgroundColor: colors.white, color: colors.neutral700, cursor: 'pointer',
  } as React.CSSProperties,
  catBtnActive: {
    backgroundColor: colors.primary, borderColor: colors.primary, color: colors.white,
  },
  activeFilters: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe',
    marginBottom: '8px',
  },
  activeLabel: { fontSize: '13px', color: '#1d4ed8' },
  clearBtn: {
    fontSize: '12px', color: '#1d4ed8', background: 'none', border: 'none',
    cursor: 'pointer', textDecoration: 'underline', padding: '2px 4px',
  } as React.CSSProperties,

  // Table
  tableWrapper: {
    backgroundColor: colors.white, borderRadius: '8px', border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden', marginBottom: '8px',
  },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } as React.CSSProperties,
  th: {
    padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: colors.neutral500,
    backgroundColor: colors.neutral50, borderBottom: `1px solid ${colors.neutral200}`, textAlign: 'left',
  } as React.CSSProperties,
  td: {
    padding: '12px', fontSize: '14px', color: colors.neutral900, borderBottom: `1px solid ${colors.neutral100}`,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  } as React.CSSProperties,
  row: { transition: 'background-color 0.1s' },
  pinnedRow: { backgroundColor: '#fffbeb', transition: 'background-color 0.1s' },

  // Badges
  typeBadge: {
    display: 'inline-block', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
    borderRadius: '4px',
  },
  pinnedBadge: {
    display: 'inline-block', padding: '1px 6px', fontSize: '10px', fontWeight: 600,
    color: '#b45309', backgroundColor: '#fef3c7', borderRadius: '3px', marginLeft: '4px',
  },
  titleText: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  summaryText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,

  // Info bar
  infoBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', marginBottom: '4px',
  },
  totalCount: { fontSize: '13px', color: colors.neutral500 },
  pageInfo: { fontSize: '13px', color: colors.neutral400 },

  // Copy button
  copyButton: {
    padding: '5px 12px', fontSize: '12px', fontWeight: 600,
    color: colors.white, backgroundColor: colors.primary,
    border: 'none', borderRadius: '6px', transition: 'opacity 0.15s',
  },
  goToStoreLink: {
    fontSize: '12px', fontWeight: 600, color: colors.primary,
    textDecoration: 'none',
  },

  // Pagination
  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '24px 0',
  },
  pageBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '36px', height: '36px', padding: '0 8px',
    fontSize: '14px', fontWeight: 500, color: colors.neutral600,
    backgroundColor: colors.white, border: `1px solid ${colors.neutral200}`, borderRadius: '6px',
    cursor: 'pointer', transition: 'all 0.15s',
  } as React.CSSProperties,
  pageBtnActive: { backgroundColor: colors.primary, color: colors.white, borderColor: colors.primary },
  pageBtnDisabled: { color: colors.neutral300, cursor: 'default', opacity: 0.5 },

  // Empty / Error
  emptyState: {
    textAlign: 'center' as const, padding: '60px 20px', fontSize: '0.9rem', color: colors.neutral400,
  },
  emptyCell: { padding: '60px 20px', textAlign: 'center' } as React.CSSProperties,
  emptyTitle: { fontSize: '15px', color: colors.neutral500, margin: '0 0 12px 0' },
  emptyBtn: {
    display: 'inline-flex', alignItems: 'center', padding: '8px 18px',
    fontSize: '13px', fontWeight: 600, color: colors.white, backgroundColor: colors.primary,
    textDecoration: 'none', borderRadius: '6px', border: 'none', cursor: 'pointer',
  },
  retryButton: {
    marginTop: '12px', padding: '6px 16px', fontSize: '0.8125rem',
    color: colors.primary, backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`, borderRadius: '6px', cursor: 'pointer',
  },

  // Notice
  notice: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '18px 22px', backgroundColor: colors.primary + '08',
    borderRadius: '10px', border: `1px solid ${colors.primary}20`,
    fontSize: '0.875rem', color: colors.neutral600, lineHeight: 1.5, marginTop: '24px',
  },
  noticeIcon: {
    fontSize: '18px', flexShrink: 0,
  },
};
