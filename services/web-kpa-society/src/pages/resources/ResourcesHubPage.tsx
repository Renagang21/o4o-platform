/**
 * ResourcesHubPage — 자료실 (파일 보관소 + 검색 중심)
 *
 * WO-KPA-RESOURCES-HUB-SIMPLIFICATION-V1
 * WO-RESOURCES-HUB-TABLE-PARTIAL-V1: selectable + ActionBar + RowActionMenu 추가
 *
 * 드로어 UX 유지 + 선택/bulk copy 부분 표준화.
 * 👍/💬 미적용 (ResourceItem 타입 미지원).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BaseTable, BaseDetailDrawer, ContentPagination, ActionBar, RowActionMenu } from '@o4o/ui';
import type { O4OColumn, ActionBarAction, RowActionItem } from '@o4o/ui';
import { Search, Plus, ExternalLink, FileText, Download, File, Link2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';
import { resourcesApi } from '../../api';
import { toast } from '@o4o/error-handling';
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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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

  const loadData = useCallback(async () => {
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
  }, [currentPage, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const openDrawer = useCallback(async (item: ResourceItem) => {
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
  }, []);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await resourcesApi.delete(id);
      toast.success('자료가 삭제되었습니다');
      setSelectedKeys(prev => { const next = new Set(prev); next.delete(id); return next; });
      if (drawerItem?.id === id) setDrawerItem(null);
      loadData();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [drawerItem, loadData]);

  // ─── Bulk Actions ─────────────────────────────────────────────────────────

  const handleBulkCopy = useCallback(() => {
    const urls = items
      .filter(item => selectedKeys.has(item.id))
      .map(item => item.source_url || `${window.location.origin}/resources`)
      .join('\n');
    navigator.clipboard.writeText(urls)
      .then(() => toast.success(`${selectedKeys.size}개 링크가 복사되었습니다`))
      .catch(() => toast.error('복사에 실패했습니다'));
  }, [items, selectedKeys]);

  const handleBulkDelete = useCallback(async () => {
    try {
      await Promise.all(Array.from(selectedKeys).map(id => resourcesApi.delete(id)));
      toast.success(`${selectedKeys.size}개가 삭제되었습니다`);
      setSelectedKeys(new Set());
      loadData();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [selectedKeys, loadData]);

  // ─── Table Columns ────────────────────────────────────────────────────────

  const columns = useMemo((): O4OColumn<ResourceItem>[] => [
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
      key: 'view_count',
      header: '👁',
      width: 60,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.view_count,
      render: (_v, row) => (
        <span style={{ color: '#6B7280', fontSize: 13 }}>{row.view_count ?? 0}</span>
      ),
    },
    {
      key: '_actions' as any,
      header: '',
      width: 150,
      align: 'center',
      system: true,
      render: (_v, row) => {
        const rowActions: RowActionItem[] = isOperator ? [
          {
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/operator/resources/${row.id}/edit`),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            onClick: () => handleDeleteItem(row.id),
            confirm: {
              title: '자료 삭제',
              message: '이 자료를 삭제하시겠습니까?',
              variant: 'danger',
            },
          },
        ] : [];

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {row.source_url && (
              <a
                href={row.source_url}
                target={isExternal(row) ? '_blank' : '_self'}
                rel="noopener noreferrer"
                download={!isExternal(row) ? (row.source_file_name || true) : undefined}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px',
                  background: '#EFF6FF', color: '#2563EB',
                  borderRadius: 6, fontSize: 12, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                {isExternal(row) ? <ExternalLink size={12} /> : <Download size={12} />}
                {isExternal(row) ? '바로가기' : '다운로드'}
              </a>
            )}
            {isOperator && <RowActionMenu actions={rowActions} />}
          </div>
        );
      },
    },
  ], [isOperator, navigate, openDrawer, handleDeleteItem]);

  // ─── Bulk ActionBar ───────────────────────────────────────────────────────

  const bulkActions: ActionBarAction[] = [
    {
      key: 'copy',
      label: '링크 복사',
      icon: <Link2 size={14} />,
      onClick: handleBulkCopy,
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      icon: <Trash2 size={14} />,
      onClick: handleBulkDelete,
      confirm: {
        title: '삭제 확인',
        message: `선택한 ${selectedKeys.size}개를 삭제하시겠습니까?`,
        variant: 'danger',
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

      {/* Bulk ActionBar (선택 시에만) */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={isOperator ? bulkActions : bulkActions.filter(a => a.key !== 'delete')}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

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
          <BaseTable<ResourceItem>
            columns={columns}
            data={items}
            rowKey={(row) => row.id}
            tableId="kpa-resources"
            onRowClick={(row) => openDrawer(row)}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
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
