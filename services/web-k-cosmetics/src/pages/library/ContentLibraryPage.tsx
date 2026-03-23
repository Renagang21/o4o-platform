/**
 * ContentLibraryPage — K-Cosmetics 콘텐츠 라이브러리
 *
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
 *
 * Route: /library/content
 * API: GET /api/v1/hub/contents?serviceKey=k-cosmetics&sourceDomain=cms
 */

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { dashboardCopyApi } from '../../lib/api/dashboardCopy';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'guide', label: '가이드' },
  { key: 'knowledge', label: '지식' },
  { key: 'promo', label: '프로모션' },
  { key: 'news', label: '뉴스' },
] as const;

const PAGE_SIZE = 12;

export default function ContentLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    dashboardCopyApi.getCopiedSourceIds(user.id)
      .then(ids => setCopiedIds(new Set(ids)))
      .catch(() => {});
  }, [user?.id]);

  const handleCopy = async (e: React.MouseEvent, item: HubContentItemResponse) => {
    e.stopPropagation();
    if (!user?.id || copyingId) return;
    setCopyingId(item.id);
    try {
      await dashboardCopyApi.copyAsset({
        sourceType: 'hub_content',
        sourceId: item.id,
        targetDashboardId: user.id,
      });
      setCopiedIds(prev => new Set(prev).add(item.id));
      if (confirm('내 콘텐츠에 복사되었습니다.\n내 콘텐츠로 이동하시겠습니까?')) {
        navigate('/my-content');
      }
    } catch (err: any) {
      alert(err.message || '복사 중 오류가 발생했습니다.');
    } finally {
      setCopyingId(null);
    }
  };

  const fetchContents = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await hubContentApi.list({
        sourceDomain: 'cms',
        page: p,
        limit: PAGE_SIZE,
      });
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      setTotalPages(res?.pagination?.totalPages ?? 1);
      setTotal(res?.pagination?.total ?? list.length);
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(page);
  }, [page, fetchContents]);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  const handleItemClick = (item: HubContentItemResponse) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank', 'noopener');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Client-side type filter
  const filteredItems = activeType === 'all'
    ? items
    : items.filter(item => item.cmsType === activeType);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/community" style={styles.backLink}>
          ← 커뮤니티
        </Link>
        <h1 style={styles.heading}>콘텐츠 라이브러리</h1>
        <p style={styles.subtitle}>K-Cosmetics 콘텐츠를 한눈에 확인하세요</p>
      </div>

      {/* Type Filter */}
      <div style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleTypeChange(f.key)}
            style={{
              ...styles.filterButton,
              ...(activeType === f.key ? styles.filterButtonActive : {}),
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && total > 0 && (
        <p style={styles.count}>{total}개의 콘텐츠</p>
      )}

      {/* Content List */}
      {loading ? (
        <div style={styles.center}>
          <p style={{ color: '#94a3b8' }}>불러오는 중...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={styles.center}>
          <span style={{ fontSize: 40, color: '#e2e8f0' }}>📄</span>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 12 }}>등록된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredItems.map((item) => {
            const img = item.thumbnailUrl || item.imageUrl || null;
            const hasLink = !!item.linkUrl;
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  ...styles.card,
                  cursor: hasLink ? 'pointer' : 'default',
                  opacity: hasLink ? 1 : 0.8,
                }}
              >
                {img ? (
                  <div style={styles.cardThumb}>
                    <img
                      src={img}
                      alt={item.title}
                      style={styles.cardImg}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div style={{ ...styles.cardThumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 32, color: '#e2e8f0' }}>📄</span>
                  </div>
                )}
                <div style={styles.cardBody}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {item.cmsType && (
                      <span style={styles.badge}>{item.cmsType}</span>
                    )}
                    {item.isPinned && (
                      <span style={styles.pinnedBadge}>추천</span>
                    )}
                  </div>
                  <p style={styles.cardTitle}>{item.title}</p>
                  {item.description && (
                    <p style={styles.cardDesc}>{item.description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <p style={styles.cardDate}>{formatDate(item.createdAt)}</p>
                    {user && (
                      <button
                        onClick={(e) => handleCopy(e, item)}
                        disabled={copiedIds.has(item.id) || copyingId === item.id}
                        style={{
                          ...styles.copyButton,
                          ...(copiedIds.has(item.id) || copyingId === item.id ? styles.copyButtonDisabled : {}),
                        }}
                      >
                        {copiedIds.has(item.id) ? '✓ 가져옴' : copyingId === item.id ? '복사 중...' : '↓ 내 콘텐츠로'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageButton, opacity: page <= 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...styles.pageButton, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 16px',
  },
  backLink: {
    fontSize: 13,
    color: '#64748b',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    transition: 'background-color 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#DB2777',
    color: 'white',
  },
  count: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  cardThumb: {
    width: '100%',
    height: 140,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardBody: {
    padding: '10px 14px 12px',
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
  },
  pinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#fdf2f8',
    color: '#DB2777',
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '0 0 6px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  cardDate: {
    fontSize: 10,
    color: '#cbd5e1',
    margin: 0,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
  },
  pageButton: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  copyButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 500,
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#fdf2f8',
    color: '#DB2777',
    transition: 'background-color 0.2s',
  },
  copyButtonDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    cursor: 'default',
  },
};
