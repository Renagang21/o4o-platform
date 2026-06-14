/**
 * ContentListPage — 회원 콘텐츠 목록 (GlycoPharm wrapper)
 *
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase B)
 *   회원 작성 콘텐츠(`sub_type='content'`) 목록 허브.
 *   검색창은 공통 `CommunityContentSearchBar`(@o4o/shared-space-ui) 사용.
 *   documents-only — 자료실/설문/강좌 섹션 미포함.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CommunityContentSearchBar } from '@o4o/shared-space-ui';
import { contentApi, type ContentItem, type ContentListResponse } from '../../api/content';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
};

export function ContentListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // 검색어 디바운스 + page 리셋
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(() => {
    setLoading(true);
    contentApi.list({ page, limit: 20, search: debouncedSearch || undefined, sort: 'latest' })
      .then((res: ContentListResponse) => {
        if (res.success) {
          setItems((prev) => (page === 1 ? res.data.items : [...prev, ...res.data.items]));
          setTotal(res.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }); }
    catch { return '-'; }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>콘텐츠</h1>
        {isAuthenticated && (
          <button style={styles.writeBtn} onClick={() => navigate('/content/documents/new')}>
            ✏️ 새 글 작성
          </button>
        )}
      </div>

      <div style={styles.searchRow}>
        <CommunityContentSearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
        />
      </div>

      {loading && items.length === 0 ? (
        <p style={styles.muted}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p style={styles.muted}>{debouncedSearch ? '검색 결과가 없습니다.' : '아직 등록된 콘텐츠가 없습니다.'}</p>
      ) : (
        <ul style={styles.list}>
          {items.map((c) => (
            <li key={c.id} style={styles.card}>
              <Link to={`/content/${c.id}`} style={styles.cardLink}>
                <div style={styles.cardTitleRow}>
                  <span style={styles.cardTitle}>{c.title}</span>
                  {c.status !== 'published' && (
                    <span style={styles.statusBadge}>{STATUS_LABEL[c.status] || c.status}</span>
                  )}
                </div>
                {c.summary && <p style={styles.cardSummary}>{c.summary}</p>}
                <div style={styles.cardMeta}>
                  <span>{c.author_name || '익명'}</span>
                  <span style={styles.dot}>·</span>
                  <span>{formatDate(c.created_at)}</span>
                  <span style={styles.dot}>·</span>
                  <span>조회 {c.view_count}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <div style={styles.moreRow}>
          <button style={styles.moreBtn} disabled={loading} onClick={() => setPage((p) => p + 1)}>
            {loading ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 780, margin: '0 auto', padding: '24px 16px 60px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pageTitle: { fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  writeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 16px', fontSize: '0.8125rem',
    fontWeight: 600, color: '#ffffff', backgroundColor: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  searchRow: { marginBottom: 20 },
  muted: { textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '0.9375rem' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardLink: { display: 'block', padding: '16px 20px', textDecoration: 'none', color: 'inherit' },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#0f172a' },
  statusBadge: { fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, backgroundColor: '#fef3c7', color: '#92400e' },
  cardSummary: { fontSize: '0.875rem', color: '#475569', margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: '#94a3b8' },
  dot: { color: '#cbd5e1' },
  moreRow: { textAlign: 'center', marginTop: 20 },
  moreBtn: {
    padding: '10px 24px', fontSize: '0.875rem', fontWeight: 500, color: '#475569',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
  },
};

export default ContentListPage;
