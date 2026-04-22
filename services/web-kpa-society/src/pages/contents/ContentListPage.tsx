/**
 * ContentListPage — 콘텐츠 허브 목록
 *
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 * WO-KPA-CONTENT-UX-REFINEMENT-V1: 테이블 뷰 + 내 콘텐츠 필터 + 행 액션(보기/수정/링크복사)
 *
 * 탭(전체/참여 프로그램/정보 콘텐츠) + 검색 + 정렬 + 내 콘텐츠 필터
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { contentApi, type ContentItem, type ContentListParams } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { key: '', label: '전체' },
  { key: 'participation', label: '참여 프로그램' },
  { key: 'information', label: '정보 콘텐츠' },
] as const;

const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'views', label: '조회순' },
] as const;

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: '공개', bg: '#dcfce7', color: '#166534' },
  draft: { label: '초안', bg: '#fef3c7', color: '#92400e' },
  private: { label: '비공개', bg: '#f1f5f9', color: '#475569' },
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  participation: '참여 프로그램',
  information: '정보 콘텐츠',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ContentListPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('type') || '';
  const initialSort = (searchParams.get('sort') || 'latest') as 'latest' | 'popular' | 'views';
  const initialMy = searchParams.get('my') === 'true';

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sort, setSort] = useState(initialSort);
  const [myOnly, setMyOnly] = useState(initialMy);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: ContentListParams = { page, limit: 20, sort };
      if (activeTab) params.content_type = activeTab;
      if (searchTerm) params.search = searchTerm;
      if (myOnly && isAuthenticated) params.my = 'true';

      const res = await contentApi.list(params);
      if (res.success) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, activeTab, searchTerm, myOnly, isAuthenticated]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Sync URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (activeTab) p.set('type', activeTab);
    if (sort !== 'latest') p.set('sort', sort);
    if (myOnly) p.set('my', 'true');
    setSearchParams(p, { replace: true });
  }, [activeTab, sort, myOnly, setSearchParams]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleCopyLink = (item: ContentItem) => {
    const url = `${window.location.origin}/content/${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(item.id);
      toast.success('링크가 복사되었습니다');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      toast.error('복사에 실패했습니다');
    });
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>콘텐츠</h1>
          <p style={styles.subtitle}>커뮤니티 콘텐츠를 탐색하고 참여하세요</p>
        </div>
        {isAuthenticated && (
          <Link to="/content/new" style={styles.writeButton}>
            + 콘텐츠 제작
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div style={styles.filterRow}>
        {/* My content toggle */}
        {isAuthenticated && (
          <button
            onClick={() => { setMyOnly(!myOnly); setPage(1); }}
            style={{
              ...styles.filterToggle,
              ...(myOnly ? styles.filterToggleActive : {}),
            }}
          >
            {myOnly ? '● 내 콘텐츠' : '○ 내 콘텐츠'}
          </button>
        )}

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as any); setPage(1); }}
          style={styles.select}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {/* Search */}
        <div style={styles.searchWrap}>
          <input
            type="text"
            placeholder="제목, 작성자 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchBtn}>검색</button>
        </div>
      </div>

      {/* Content Table */}
      <div style={styles.tableWrap}>
        {loading && items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {myOnly ? '작성한 콘텐츠가 없습니다' : '등록된 콘텐츠가 없습니다'}
            </p>
            {isAuthenticated && (
              <Link to="/content/new" style={styles.emptyLink}>첫 콘텐츠 작성하기</Link>
            )}
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={{ ...styles.th, width: '40%' }}>제목</th>
                  <th style={{ ...styles.th, width: '10%' }}>구분</th>
                  <th style={{ ...styles.th, width: '10%' }}>작성자</th>
                  <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>추천</th>
                  <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>상태</th>
                  <th style={{ ...styles.th, width: '10%' }}>수정일</th>
                  <th style={{ ...styles.th, width: '14%', textAlign: 'center' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const statusBadge = STATUS_BADGE[item.status] || STATUS_BADGE.draft;
                  const isOwner = user?.id === item.created_by;

                  return (
                    <tr key={item.id} style={styles.tr}>
                      {/* 제목 */}
                      <td style={styles.td}>
                        <Link to={`/content/${item.id}`} style={styles.titleLink}>
                          {item.title}
                        </Link>
                        {item.sub_type && (
                          <span style={styles.subTypeBadge}>{item.sub_type}</span>
                        )}
                      </td>
                      {/* 구분 */}
                      <td style={styles.td}>
                        <span style={styles.typeBadge}>
                          {CONTENT_TYPE_LABEL[item.content_type] || item.content_type}
                        </span>
                      </td>
                      {/* 작성자 */}
                      <td style={styles.td}>
                        <span style={styles.authorText}>{item.author_name || '익명'}</span>
                      </td>
                      {/* 추천 */}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.statText}>{item.like_count}</span>
                      </td>
                      {/* 상태 */}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      {/* 수정일 */}
                      <td style={styles.td}>
                        <span style={styles.dateText}>{formatDate(item.updated_at)}</span>
                      </td>
                      {/* 액션 */}
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={styles.actionGroup}>
                          <button
                            onClick={() => navigate(`/content/${item.id}`)}
                            style={styles.actionBtn}
                            title="보기"
                          >
                            보기
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => navigate(`/content/${item.id}/edit`)}
                              style={styles.actionBtn}
                              title="수정"
                            >
                              수정
                            </button>
                          )}
                          <button
                            onClick={() => handleCopyLink(item)}
                            style={{
                              ...styles.actionBtn,
                              ...(copiedId === item.id ? styles.actionBtnCopied : {}),
                            }}
                            title="링크 복사"
                          >
                            {copiedId === item.id ? '복사됨' : '링크'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <span style={styles.pageInfo}>총 {total}개</span>
                <div style={styles.pageButtons}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={styles.pageBtn}
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    return start + i;
                  }).filter(p => p <= totalPages).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        ...styles.pageBtn,
                        ...(page === p ? styles.pageBtnActive : {}),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={styles.pageBtn}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '4px 0 0',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterToggle: {
    padding: '8px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  filterToggleActive: {
    color: '#2563eb',
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    fontWeight: 600,
  },
  select: {
    padding: '8px 12px',
    fontSize: '0.8125rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    color: '#334155',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  searchWrap: {
    display: 'flex',
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.8125rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    backgroundColor: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  tableWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thead: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '12px 16px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textAlign: 'left',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '12px 16px',
    fontSize: '0.8125rem',
    color: '#334155',
    verticalAlign: 'middle',
  },
  titleLink: {
    color: '#1e293b',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    lineHeight: 1.4,
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: 4,
    whiteSpace: 'nowrap',
  },
  subTypeBadge: {
    display: 'inline-block',
    marginLeft: 6,
    padding: '2px 6px',
    fontSize: '0.625rem',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    borderRadius: 3,
  },
  authorText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  statText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 4,
  },
  dateText: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  actionGroup: {
    display: 'flex',
    gap: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '4px 10px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.1s',
    whiteSpace: 'nowrap',
  },
  actionBtnCopied: {
    color: '#16a34a',
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0,
  },
  emptyLink: {
    display: 'inline-block',
    marginTop: 12,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid #f1f5f9',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  pageButtons: {
    display: 'flex',
    gap: 4,
  },
  pageBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
  },
};

export default ContentListPage;
