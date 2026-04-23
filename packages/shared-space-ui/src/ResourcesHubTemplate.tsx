/**
 * ResourcesHubTemplate — 자료실 HUB 공통 템플릿
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA canonical 기준 추출. 구조/렌더링 책임만 가진다.
 * 서비스별 fetch/API/문구/operator 조건은 ResourcesHubConfig에만.
 *
 * 블록 구조:
 *   1. Hero / Intro (title, subtitle, create CTA)
 *   2. Search
 *   3. ActionBar (선택 시)
 *   4. Resource List (BaseTable + pagination)
 *   5. Detail Drawer (fetchDetail 제공 시)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BaseTable,
  BaseDetailDrawer,
  ContentPagination,
  ActionBar,
  RowActionMenu,
} from '@o4o/ui';
import type { O4OColumn, ActionBarAction, RowActionItem } from '@o4o/ui';
import {
  Search,
  ExternalLink,
  FileText,
  Download,
  File,
  Link2,
  Trash2,
  Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResourcesHubItem {
  id: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  blocks?: { type: string; content?: string; url?: string; items?: string[] }[];
  source_type: string;           // 'external' | 'file'
  source_url?: string | null;
  source_file_name?: string | null;
  view_count: number;
  author_name?: string | null;
  created_at: string;
}

export interface ResourcesHubFetchParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ResourcesHubFetchResult {
  items: ResourcesHubItem[];
  total: number;
  totalPages: number;
}

export interface ResourcesHubConfig {
  serviceKey: string;
  tableId: string;

  // Block 1: Hero / Intro
  title?: string;
  subtitle?: string;

  // Block 2: Search
  searchPlaceholder?: string;

  // Data
  pageLimit?: number;
  fetchItems: (params: ResourcesHubFetchParams) => Promise<ResourcesHubFetchResult>;

  // Detail drawer — omit to disable drawer entirely
  fetchDetail?: (id: string) => Promise<ResourcesHubItem>;
  trackView?: (id: string) => void;

  // Operator: create — omit to hide create button
  createAction?: { label: string; href: string };

  // Operator: row edit/delete — omit to disable
  getEditHref?: (id: string) => string;
  onDelete?: (id: string) => Promise<void>;

  // Bulk delete override (aggregate toast etc.) — falls back to onDelete per-item
  onBulkDelete?: (ids: string[]) => Promise<void>;

  // Messages
  emptyMessage?: string;
  emptyFilteredMessage?: string;
  loadingMessage?: string;

  // Hide bulk delete action even if onDelete is provided
  hideBulkDelete?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function isExternal(item: ResourcesHubItem): boolean {
  return item.source_type === 'external';
}

// ─── Template ─────────────────────────────────────────────────────────────────

export function ResourcesHubTemplate({ config }: { config: ResourcesHubConfig }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ResourcesHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<ResourcesHubItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limit = config.pageLimit ?? 20;
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  // ─── Data ─────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await config.fetchItems({
        page: currentPage,
        limit,
        search: searchQuery || undefined,
      });
      setItems(res.items);
      setTotalPages(res.totalPages);
      setTotalItems(res.total);
    } catch {
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [config, currentPage, limit, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        if (value) prev.set('search', value); else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }, 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchParams(prev => {
        if (searchInput) prev.set('search', searchInput); else prev.delete('search');
        prev.set('page', '1');
        return prev;
      });
    }
  };

  // ─── Drawer ───────────────────────────────────────────────────────────────

  const openDrawer = useCallback(async (item: ResourcesHubItem) => {
    if (!config.fetchDetail) return;
    setDrawerItem(item);
    setDrawerLoading(true);
    try {
      const detail = await config.fetchDetail(item.id);
      setDrawerItem(detail);
      config.trackView?.(item.id);
    } catch {
      // keep summary data
    } finally {
      setDrawerLoading(false);
    }
  }, [config]);

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!config.onDelete) return;
    try {
      await config.onDelete(id);
      setSelectedKeys(prev => { const n = new Set(prev); n.delete(id); return n; });
      if (drawerItem?.id === id) setDrawerItem(null);
      loadData();
    } catch {
      // adapter handles error display
    }
  }, [config, drawerItem, loadData]);

  // ─── Bulk ─────────────────────────────────────────────────────────────────

  const handleBulkCopy = useCallback(() => {
    const urls = items
      .filter(item => selectedKeys.has(item.id))
      .map(item => item.source_url || `${window.location.origin}/resources`)
      .join('\n');
    navigator.clipboard.writeText(urls).catch(() => {});
  }, [items, selectedKeys]);

  const handleBulkDelete = useCallback(async () => {
    if (!config.onDelete && !config.onBulkDelete) return;
    try {
      if (config.onBulkDelete) {
        await config.onBulkDelete(Array.from(selectedKeys));
      } else {
        await Promise.all(Array.from(selectedKeys).map(id => config.onDelete!(id)));
      }
      setSelectedKeys(new Set());
      loadData();
    } catch {
      // adapter handles error display
    }
  }, [config, selectedKeys, loadData]);

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns = useMemo((): O4OColumn<ResourcesHubItem>[] => {
    const hasDrawer = !!config.fetchDetail;
    const hasRowActions = !!(config.getEditHref || config.onDelete);

    return [
      {
        key: 'title',
        header: '파일명 / 제목',
        width: '40%',
        sortable: true,
        render: (_v, row) => (
          <span style={{ color: '#111827', fontWeight: 500, cursor: hasDrawer ? 'pointer' : 'default' }}>
            {row.title}
          </span>
        ),
        ...(hasDrawer ? { onCellClick: (row: ResourcesHubItem) => openDrawer(row) } : {}),
      },
      {
        key: 'author_name',
        header: '등록자',
        width: 100,
        sortable: true,
        render: (_v, row) => (
          <span style={{ color: '#374151', fontSize: 13 }}>{row.author_name || '-'}</span>
        ),
      },
      {
        key: 'created_at',
        header: '등록일',
        width: 100,
        align: 'center',
        sortable: true,
        sortAccessor: (row) => new Date(row.created_at).getTime(),
        render: (_v, row) => (
          <span style={{ color: '#6B7280', fontSize: 13 }}>{formatDate(row.created_at)}</span>
        ),
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
        key: '_actions' as keyof ResourcesHubItem,
        header: '',
        width: hasRowActions ? 150 : 110,
        align: 'center',
        system: true,
        render: (_v, row) => {
          const rowActions: RowActionItem[] = [];
          if (config.getEditHref) {
            rowActions.push({
              key: 'edit',
              label: '수정',
              onClick: () => navigate(config.getEditHref!(row.id)),
            });
          }
          if (config.onDelete) {
            rowActions.push({
              key: 'delete',
              label: '삭제',
              variant: 'danger',
              onClick: () => handleDeleteItem(row.id),
              confirm: {
                title: '자료 삭제',
                message: '이 자료를 삭제하시겠습니까?',
                variant: 'danger',
              },
            });
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              {row.source_url && (
                <a
                  href={row.source_url}
                  target={isExternal(row) ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  download={!isExternal(row) ? (row.source_file_name || true) : undefined}
                  onClick={(e) => e.stopPropagation()}
                  style={st.actionBtn}
                >
                  {isExternal(row) ? <ExternalLink size={12} /> : <Download size={12} />}
                  {isExternal(row) ? '바로가기' : '다운로드'}
                </a>
              )}
              {hasRowActions && <RowActionMenu actions={rowActions} />}
            </div>
          );
        },
      },
    ];
  }, [config, navigate, openDrawer, handleDeleteItem]);

  // ─── Bulk ActionBar ───────────────────────────────────────────────────────

  const showBulkDelete = (!!config.onDelete || !!config.onBulkDelete) && !config.hideBulkDelete;

  const bulkActions: ActionBarAction[] = useMemo(() => {
    const actions: ActionBarAction[] = [
      {
        key: 'copy',
        label: '링크 복사',
        icon: <Link2 size={14} />,
        onClick: handleBulkCopy,
      },
    ];
    if (showBulkDelete) {
      actions.push({
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
      });
    }
    return actions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBulkDelete, handleBulkCopy, handleBulkDelete, selectedKeys.size]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={st.container}>
      {/* Block 1: Hero / Intro */}
      <div style={st.header}>
        <div>
          <h1 style={st.title}>{config.title ?? '자료실'}</h1>
          {config.subtitle && <p style={st.subtitle}>{config.subtitle}</p>}
        </div>
        {config.createAction && (
          <button onClick={() => navigate(config.createAction!.href)} style={st.createBtn}>
            <Plus size={16} />
            {config.createAction.label}
          </button>
        )}
      </div>

      {/* Block 2: Search */}
      <div style={st.searchWrap}>
        <Search size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder={config.searchPlaceholder ?? '자료를 검색하세요'}
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          style={st.searchInput}
        />
      </div>

      {/* Block 3: ActionBar (선택 시) */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* Block 4: Resource List */}
      {loading ? (
        <div style={st.center}>
          <div style={st.spinner} />
          <style>{`@keyframes o4o-rhub-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#6B7280', marginTop: 12 }}>
            {config.loadingMessage ?? '자료를 불러오는 중...'}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div style={st.center}>
          <FileText size={40} color="#D1D5DB" />
          <p style={{ color: '#6B7280', marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            {searchQuery
              ? (config.emptyFilteredMessage ?? '검색 결과가 없습니다.')
              : (config.emptyMessage ?? '등록된 자료가 없습니다.')}
          </p>
        </div>
      ) : (
        <>
          <BaseTable<ResourcesHubItem>
            columns={columns}
            data={items}
            rowKey={(row) => row.id}
            tableId={config.tableId}
            onRowClick={config.fetchDetail ? (row) => openDrawer(row) : undefined}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            emptyMessage={config.emptyMessage ?? '등록된 자료가 없습니다.'}
            rowClassName={() => config.fetchDetail ? 'cursor-pointer' : ''}
          />
          <div style={{ marginTop: 20 }}>
            <ContentPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) =>
                setSearchParams(prev => { prev.set('page', String(page)); return prev; })
              }
              showItemRange
              totalItems={totalItems}
              pageSize={limit}
            />
          </div>
        </>
      )}

      {/* Block 5: Detail Drawer */}
      {config.fetchDetail && (
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
              <div style={st.drawerMeta}>
                {drawerItem.author_name && (
                  <span style={{ color: '#374151', fontSize: 13 }}>{drawerItem.author_name}</span>
                )}
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>{formatDate(drawerItem.created_at)}</span>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>조회 {drawerItem.view_count ?? 0}</span>
              </div>

              {drawerItem.summary && (
                <div style={st.drawerSummary}>{drawerItem.summary}</div>
              )}

              {drawerItem.body && (
                <div style={st.drawerBody}>{drawerItem.body}</div>
              )}

              {(drawerItem.blocks?.length ?? 0) > 0 && !drawerItem.body && (
                <div style={{ marginBottom: 16 }}>
                  {drawerItem.blocks!.map((block, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      {block.type === 'text' && (
                        <p style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.7, margin: 0 }}>
                          {block.content}
                        </p>
                      )}
                      {block.type === 'image' && block.url && (
                        <img src={block.url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
                      )}
                      {block.type === 'list' && (
                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                          {block.items?.map((item, j) => (
                            <li key={j} style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.7 }}>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {drawerItem.source_url && (
                <div style={st.drawerAttachment}>
                  {isExternal(drawerItem) ? (
                    <>
                      <ExternalLink size={16} color="#2563EB" />
                      <a
                        href={drawerItem.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563EB', fontSize: 13, wordBreak: 'break-all' }}
                      >
                        {drawerItem.source_url}
                      </a>
                    </>
                  ) : (
                    <>
                      <File size={16} color="#2563EB" />
                      <a
                        href={drawerItem.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563EB', fontSize: 13 }}
                      >
                        {drawerItem.source_file_name || '첨부파일 보기'}
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </BaseDetailDrawer>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  center: {
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
    animation: 'o4o-rhub-spin 0.8s linear infinite',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: '#EFF6FF',
    color: '#2563EB',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    textDecoration: 'none',
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

export default ResourcesHubTemplate;
