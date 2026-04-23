/**
 * ResourcesHubPage — 자료실 (파일 보관소 + 검색 중심)
 *
 * WO-KPA-RESOURCES-HUB-SIMPLIFICATION-V1
 *
 * 검색 + 파일 리스트 + 다운로드. 분류/태그/좋아요 제거.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BaseTable, BaseDetailDrawer, ContentPagination } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { Search, Plus, ExternalLink, FileText, Download, File } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { resourcesApi } from '../../api';
import type { ResourceItem } from '../../api/resources';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function isExternal(item: ResourceItem): boolean {
  return item.source_type === 'external';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ResourcesHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  const [drawerItem, setDrawerItem] = useState<ResourceItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  // Sync input with URL
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await resourcesApi.list({
          page: currentPage,
          limit: 20,
          search: searchQuery || undefined,
          sort: 'latest',
        });
        const data = res.data;
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      } catch (err) {
        console.warn('Resources API error:', err);
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentPage, searchQuery]);

  // ─── Search ──────────────────────────────────────────────────────────────

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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchParams(prev => {
        if (searchInput) prev.set('search', searchInput);
        else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }
  };

  // ─── Pagination ──────────────────────────────────────────────────────────

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev; });
  };

  // ─── Drawer ──────────────────────────────────────────────────────────────

  const openDrawer = async (item: ResourceItem) => {
    setDrawerItem(item);
    setDrawerLoading(true);
    try {
      const res = await resourcesApi.getDetail(item.id);
      setDrawerItem(res.data);
      resourcesApi.trackView(item.id).catch(() => {});
    } catch {
      // Keep summary data
    } finally {
      setDrawerLoading(false);
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────

  const columns: O4OColumn<ResourceItem>[] = [
    {
      key: 'title',
      header: '파일명 / 제목',
      width: '40%',
      render: (_v, row) => (
        <span style={{ color: '#111827', fontWeight: 500, cursor: 'pointer' }}>{row.title}</span>
      ),
      onCellClick: (row) => openDrawer(row),
      sortable: true,
    },
    {
      key: 'summary',
      header: '설명',
      width: '28%',
      render: (_v, row) => (
        <span style={{
          color: '#6B7280', fontSize: 13,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block', maxWidth: 260,
        }}>
          {row.summary || '-'}
        </span>
      ),
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
    {
      key: '_actions' as any,
      header: '다운로드',
      width: 96,
      align: 'center',
      render: (_v, row) => {
        if (!row.source_url) {
          return <span style={{ color: '#D1D5DB', fontSize: 12 }}>-</span>;
        }
        const ext = isExternal(row);
        return (
          <a
            href={row.source_url}
            target={ext ? '_blank' : '_self'}
            rel="noopener noreferrer"
            download={!ext ? (row.source_file_name || true) : undefined}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px',
              background: '#EFF6FF', color: '#2563EB',
              borderRadius: 6, fontSize: 12, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {ext ? <ExternalLink size={12} /> : <Download size={12} />}
            {ext ? '바로가기' : '다운로드'}
          </a>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

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

      {/* Search */}
      <div style={st.searchWrap}>
        <Search size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="자료를 검색하세요 (제목, 내용, 등록자)"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          style={st.searchInput}
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
          <p style={{ color: '#6B7280', marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 자료가 없습니다.'}
          </p>
          {!searchQuery && (
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>자료를 등록해 보세요.</p>
          )}
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
        footer={drawerItem?.source_url ? (
          <a
            href={drawerItem.source_url}
            target={isExternal(drawerItem) ? '_blank' : '_self'}
            rel="noopener noreferrer"
            download={!isExternal(drawerItem) ? (drawerItem.source_file_name || true) : undefined}
            style={{ ...st.drawerDownloadBtn, textDecoration: 'none' }}
          >
            {isExternal(drawerItem) ? <ExternalLink size={16} /> : <Download size={16} />}
            {isExternal(drawerItem) ? '바로가기' : '다운로드'}
          </a>
        ) : undefined}
      >
        {drawerItem && (
          <div>
            {/* Meta */}
            <div style={st.drawerMeta}>
              {drawerItem.author_name && (
                <span style={{ color: '#374151', fontSize: 13 }}>{drawerItem.author_name}</span>
              )}
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>{formatDate(drawerItem.created_at)}</span>
              <span style={{ color: '#9CA3AF', fontSize: 13 }}>조회 {drawerItem.view_count ?? 0}</span>
            </div>

            {/* Summary */}
            {drawerItem.summary && (
              <div style={st.drawerSummary}>
                {drawerItem.summary}
              </div>
            )}

            {/* Body */}
            {drawerItem.body && (
              <div style={st.drawerBody}>
                {drawerItem.body}
              </div>
            )}

            {/* Blocks */}
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
              <div style={st.drawerAttachment}>
                {isExternal(drawerItem) ? (
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
    marginBottom: 24,
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
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    background: '#fff',
    marginBottom: 20,
    maxWidth: 520,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#111827',
    width: '100%',
    background: 'transparent',
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
  drawerSummary: {
    padding: '12px 16px',
    background: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.6,
  },
  drawerBody: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 1.8,
    marginBottom: 16,
    whiteSpace: 'pre-wrap' as const,
  },
  drawerAttachment: {
    padding: '12px 16px',
    background: '#EFF6FF',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  drawerDownloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default ResourcesHubPage;
