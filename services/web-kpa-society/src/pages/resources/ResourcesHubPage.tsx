/**
 * ResourcesHubPage — 자료실 (테이블 기반 자료 목록)
 *
 * WO-KPA-RESOURCE-HUB-RESTRUCTURE-V1
 *
 * kpa_contents 테이블 기반. BaseTable + BaseDetailDrawer.
 * 검색 / 자료 종류 필터 / 좋아요 / 복사 / Drawer 상세 조회.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { BaseTable, BaseDetailDrawer, ContentSortButtons, ContentPagination } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { Search, Plus, Heart, Copy, ExternalLink, FileText, Image, Link2, File } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { resourcesApi } from '../../api';
import type { ResourceItem } from '../../api/resources';

// ─── Constants ──────────────────────────────────────────────────────────────

const SUB_TYPE_FILTERS = [
  { value: '', label: '전체' },
  { value: 'image', label: '이미지' },
  { value: 'file', label: '파일' },
  { value: 'document', label: '문서' },
  { value: 'url', label: 'URL' },
] as const;

const SUB_TYPE_LABELS: Record<string, string> = {
  image: '이미지',
  file: '파일',
  document: '문서',
  url: 'URL',
};

const SUB_TYPE_COLORS: Record<string, string> = {
  image: '#8B5CF6',
  file: '#2563EB',
  document: '#059669',
  url: '#D97706',
};

type SortType = 'latest' | 'popular' | 'views';
const SORT_OPTIONS: SortType[] = ['latest', 'popular', 'views'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function deriveSubType(item: ResourceItem): string {
  if (item.sub_type) return item.sub_type;
  if (item.source_type === 'external') return 'url';
  if (item.source_type === 'upload') {
    const ext = (item.source_file_name || item.source_url || '').toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)/.test(ext)) return 'image';
    return 'file';
  }
  return 'document';
}

function subTypeIcon(type: string) {
  switch (type) {
    case 'image': return <Image size={13} />;
    case 'file': return <File size={13} />;
    case 'url': return <Link2 size={13} />;
    default: return <FileText size={13} />;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResourcesHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sort, setSort] = useState<SortType>('latest');
  const [subTypeFilter, setSubTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  // Drawer
  const [drawerItem, setDrawerItem] = useState<ResourceItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Search debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  // ─── Data Loading ───────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [currentPage, searchQuery, sort, subTypeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await resourcesApi.list({
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
        sub_type: subTypeFilter || undefined,
        sort,
      });
      const data = res.data;
      const list = data.items || [];
      setItems(list);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
      // Init liked state
      const liked = new Set<string>();
      list.forEach((item: any) => { if (item.isRecommendedByMe) liked.add(item.id); });
      setLikedIds(liked);
    } catch (err) {
      console.warn('Resources API error:', err);
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // ─── Search ─────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        if (value) prev.set('search', value);
        else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }, 500);
  };

  // ─── Pagination & Sort ──────────────────────────────────────────

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev; });
  };

  const handleSortChange = (newSort: SortType) => {
    setSort(newSort);
    setSearchParams(prev => { prev.set('page', '1'); return prev; });
  };

  const handleSubTypeChange = (value: string) => {
    setSubTypeFilter(value);
    setSearchParams(prev => { prev.set('page', '1'); return prev; });
  };

  // ─── Like Toggle (Optimistic) ───────────────────────────────────

  const handleLike = useCallback(async (id: string) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    setLikingId(id);
    const wasLiked = likedIds.has(id);
    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(id) : next.add(id);
      return next;
    });
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, like_count: item.like_count + (wasLiked ? -1 : 1) }
        : item
    ));
    // Update drawer if showing same item
    if (drawerItem?.id === id) {
      setDrawerItem(prev => prev ? { ...prev, like_count: prev.like_count + (wasLiked ? -1 : 1), isRecommendedByMe: !wasLiked } : prev);
    }
    try {
      await resourcesApi.toggleRecommend(id);
    } catch {
      // Rollback
      setLikedIds(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(id) : next.delete(id);
        return next;
      });
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, like_count: item.like_count + (wasLiked ? 1 : -1) }
          : item
      ));
      if (drawerItem?.id === id) {
        setDrawerItem(prev => prev ? { ...prev, like_count: prev.like_count + (wasLiked ? 1 : -1), isRecommendedByMe: wasLiked } : prev);
      }
    }
    setLikingId(null);
  }, [user, likedIds, navigate, location, drawerItem]);

  // ─── Drawer ─────────────────────────────────────────────────────

  const openDrawer = async (item: ResourceItem) => {
    setDrawerItem(item);
    setDrawerLoading(true);
    try {
      const res = await resourcesApi.getDetail(item.id);
      setDrawerItem(res.data);
      if (res.data.isRecommendedByMe) {
        setLikedIds(prev => new Set(prev).add(item.id));
      }
      // Track view
      resourcesApi.trackView(item.id).catch(() => {});
    } catch {
      // Keep summary data
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!drawerItem) return;
    const text = drawerItem.body || drawerItem.summary || drawerItem.title;
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // ─── Table Columns ──────────────────────────────────────────────

  const columns: O4OColumn<ResourceItem>[] = [
    {
      key: 'title',
      header: '제목',
      width: '40%',
      render: (_v, row) => (
        <span style={{ color: '#111827', fontWeight: 500, cursor: 'pointer' }}>{row.title}</span>
      ),
      onCellClick: (row) => openDrawer(row),
      sortable: true,
    },
    {
      key: 'sub_type',
      header: '자료 종류',
      width: 100,
      align: 'center',
      render: (_v, row) => {
        const type = deriveSubType(row);
        const color = SUB_TYPE_COLORS[type] || '#6B7280';
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 4,
            fontSize: 12, fontWeight: 500,
            color, background: `${color}14`,
          }}>
            {subTypeIcon(type)}
            {SUB_TYPE_LABELS[type] || type}
          </span>
        );
      },
    },
    {
      key: 'tags',
      header: '태그',
      width: '18%',
      render: (_v, row) => {
        if (!row.tags?.length) return <span style={{ color: '#d1d5db' }}>-</span>;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{
                fontSize: 11, color: '#6B7280', background: '#F3F4F6',
                borderRadius: 3, padding: '1px 6px',
              }}>#{tag}</span>
            ))}
            {row.tags.length > 3 && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{row.tags.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'author_name',
      header: '등록자',
      width: 100,
      render: (_v, row) => (
        <span style={{ color: '#374151', fontSize: 13 }}>{row.author_name || '-'}</span>
      ),
      sortable: true,
    },
    {
      key: 'like_count',
      header: '좋아요',
      width: 80,
      align: 'center',
      render: (_v, row) => {
        const liked = likedIds.has(row.id);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleLike(row.id); }}
            disabled={likingId === row.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: liked ? 600 : 400,
              color: liked ? '#DC2626' : '#9CA3AF',
              padding: '2px 4px',
              opacity: likingId === row.id ? 0.5 : 1,
            }}
          >
            <Heart size={14} fill={liked ? '#DC2626' : 'none'} />
            {row.like_count}
          </button>
        );
      },
      sortable: true,
      sortAccessor: (row) => row.like_count,
    },
    {
      key: 'created_at',
      header: '등록일',
      width: 100,
      align: 'center',
      render: (_v, row) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>{formatDate(row.created_at)}</span>
      ),
      sortable: true,
      sortAccessor: (row) => new Date(row.created_at).getTime(),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div style={st.container}>
      {/* Header */}
      <div style={st.header}>
        <div>
          <h1 style={st.title}>자료실</h1>
          <p style={st.subtitle}>회원들이 함께 이용하는 공동자료실입니다.</p>
        </div>
        {isOperator && (
          <button onClick={() => navigate('/operator/resources/new')} style={st.createBtn}>
            <Plus size={16} />
            자료 등록
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div style={st.toolbar}>
        <div style={st.searchWrap}>
          <Search size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="제목, 내용, 태그, 등록자 검색"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            style={st.searchInput}
          />
        </div>
        <div style={st.filterTabs}>
          {SUB_TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleSubTypeChange(f.value)}
              style={{
                ...st.filterTab,
                ...(subTypeFilter === f.value ? st.filterTabActive : {}),
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div style={{ marginBottom: 16 }}>
        <ContentSortButtons
          value={sort}
          onChange={handleSortChange as any}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={st.loadingWrap}>
          <div style={st.spinner} />
          <style>{`@keyframes o4o-res-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#6B7280', marginTop: 12 }}>자료를 불러오는 중...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={st.empty}>
          <FileText size={40} color="#D1D5DB" />
          <p style={{ color: '#6B7280', marginTop: 12, fontSize: 15 }}>
            {searchQuery || subTypeFilter ? '검색 결과가 없습니다.' : '등록된 자료가 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <BaseTable
            columns={columns}
            data={items}
            rowKey={(row) => row.id}
            tableId="kpa-resources"
            onRowClick={(row) => openDrawer(row)}
            emptyMessage="등록된 자료가 없습니다."
            rowClassName={() => 'cursor-pointer'}
          />

          <div style={{ marginTop: 20 }}>
            <ContentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showItemRange
              totalItems={totalItems}
              pageSize={20}
            />
          </div>
        </>
      )}

      {/* Detail Drawer */}
      <BaseDetailDrawer
        open={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        title={drawerItem?.title}
        width="60vw"
        loading={drawerLoading}
        footer={drawerItem ? (
          <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between' }}>
            <button
              onClick={() => handleLike(drawerItem.id)}
              disabled={likingId === drawerItem.id}
              style={{
                ...st.drawerBtn,
                color: likedIds.has(drawerItem.id) ? '#DC2626' : '#6B7280',
                fontWeight: likedIds.has(drawerItem.id) ? 600 : 400,
              }}
            >
              <Heart size={16} fill={likedIds.has(drawerItem.id) ? '#DC2626' : 'none'} />
              좋아요 {drawerItem.like_count}
            </button>
            <button onClick={handleCopy} style={{ ...st.drawerBtn, color: '#2563EB' }}>
              <Copy size={16} />
              {copyFeedback ? '복사됨!' : '복사'}
            </button>
          </div>
        ) : undefined}
      >
        {drawerItem && (
          <div>
            {/* Meta */}
            <div style={st.drawerMeta}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                color: SUB_TYPE_COLORS[deriveSubType(drawerItem)] || '#6B7280',
                background: `${SUB_TYPE_COLORS[deriveSubType(drawerItem)] || '#6B7280'}14`,
              }}>
                {subTypeIcon(deriveSubType(drawerItem))}
                {SUB_TYPE_LABELS[deriveSubType(drawerItem)] || deriveSubType(drawerItem)}
              </span>
              {drawerItem.author_name && (
                <span style={{ color: '#374151', fontSize: 13 }}>{drawerItem.author_name}</span>
              )}
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>{formatDate(drawerItem.created_at)}</span>
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>
                조회 {drawerItem.view_count ?? 0}
              </span>
            </div>

            {/* Tags */}
            {drawerItem.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {drawerItem.tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: 12, color: '#4B5563', background: '#F3F4F6',
                    borderRadius: 4, padding: '3px 8px',
                  }}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Summary (memo) */}
            {drawerItem.summary && (
              <div style={{
                padding: '12px 16px', background: '#F9FAFB', borderRadius: 8,
                marginBottom: 16, fontSize: 14, color: '#374151', lineHeight: 1.6,
              }}>
                {drawerItem.summary}
              </div>
            )}

            {/* Body */}
            {drawerItem.body && (
              <div style={{
                fontSize: 14, color: '#1F2937', lineHeight: 1.8,
                marginBottom: 16, whiteSpace: 'pre-wrap',
              }}>
                {drawerItem.body}
              </div>
            )}

            {/* Blocks (structured content) */}
            {drawerItem.blocks?.length > 0 && !drawerItem.body && (
              <div style={{ marginBottom: 16 }}>
                {drawerItem.blocks.map((block: any, i: number) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    {block.type === 'text' && (
                      <p style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.7, margin: 0 }}>{block.content}</p>
                    )}
                    {block.type === 'image' && block.url && (
                      <img src={block.url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
                    )}
                    {block.type === 'list' && (
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        {block.items?.map((item: string, j: number) => (
                          <li key={j} style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.7 }}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attachment */}
            {drawerItem.source_url && (
              <div style={{
                padding: '12px 16px', background: '#EFF6FF', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {drawerItem.source_type === 'external' ? (
                  <>
                    <ExternalLink size={16} color="#2563EB" />
                    <a href={drawerItem.source_url} target="_blank" rel="noopener noreferrer"
                       style={{ color: '#2563EB', fontSize: 13, wordBreak: 'break-all' }}>
                      {drawerItem.source_url}
                    </a>
                  </>
                ) : (
                  <>
                    <File size={16} color="#2563EB" />
                    <a href={drawerItem.source_url} target="_blank" rel="noopener noreferrer"
                       style={{ color: '#2563EB', fontSize: 13 }}>
                      {drawerItem.source_file_name || '첨부파일 보기'}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 48px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    margin: 0,
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    background: '#fff',
    flex: '1 1 280px',
    maxWidth: 400,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#111827',
    width: '100%',
    background: 'transparent',
  },
  filterTabs: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    background: '#F3F4F6',
    color: '#6B7280',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    background: '#2563EB',
    color: '#fff',
    fontWeight: 500,
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #E5E7EB',
    borderTopColor: '#6366F1',
    borderRadius: '50%',
    animation: 'o4o-res-spin 0.8s linear infinite',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  drawerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  drawerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    cursor: 'pointer',
  },
};
