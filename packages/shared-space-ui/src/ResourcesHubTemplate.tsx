/**
 * ResourcesHubTemplate — 자료실 HUB 공통 템플릿
 *
 * WO-O4O-RESOURCES-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA canonical 기준 추출. 구조/렌더링 책임만 가진다.
 * 서비스별 fetch/API/문구/operator 조건은 ResourcesHubConfig에만.
 *
 * ⚠️  경계 원칙 (CONTENT-RESOURCES BOUNDARY):
 *   /resources는 파일/문서/다운로드 가능한 자료를 중심으로 구성하며,
 *   HTML 콘텐츠(/content)와 구조적으로 혼합하지 않는다.
 *   읽는 것(콘텐츠) vs 받는 것(자료)이 기준이다.
 *
 * ⚠️  render override 원칙:
 *   이 템플릿은 renderItems override를 의도적으로 제공하지 않는다.
 *   카드 레이아웃이 근본적으로 다른 경우에만 별도 페이지를 만들 것.
 *   기본 테이블 렌더링이 항상 우선이다.
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
  ActionBar,
  RowActionMenu,
} from '@o4o/ui';
import { HubPagination } from './HubPagination';
import type { O4OColumn, ActionBarAction, RowActionItem } from '@o4o/ui';
import {
  Search,
  ExternalLink,
  Download,
  File,
  Link2,
  Trash2,
  Plus,
  Heart,
  Copy,
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
  created_by?: string | null;    // WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1: 등록자 ID
  usage_type?: string | null;    // WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1: READ|LINK|DOWNLOAD|COPY
  // Correction 2: 다운로드/열람 액션 타입 — 미제공 시 source_type에서 자동 파생
  actionType?: 'view' | 'download' | 'external' | 'copy';
  // Correction 2: 파일 형식 — 미제공 시 source_file_name 확장자에서 자동 파생
  fileType?: 'pdf' | 'image' | 'doc' | 'video' | 'etc';
  // WO-KPA-RESOURCES-MINOR-REFINEMENT-V1: 좋아요
  like_count?: number;
  isRecommendedByMe?: boolean;
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
  heroTitle?: string;
  heroDesc?: string;
  /** Hero 우측 액션 버튼 슬롯 */
  headerAction?: React.ReactNode;

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

  // 빈 상태 CTA (등록 유도)
  renderEmptyAction?: () => React.ReactNode;

  // Hide bulk delete action even if onDelete is provided
  hideBulkDelete?: boolean;

  // WO-KPA-RESOURCES-MINOR-REFINEMENT-V1: 좋아요 토글
  onToggleRecommend?: (id: string) => Promise<{ recommendCount: number; isRecommendedByMe: boolean }>;

  // WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1: 등록자 자기 수정/삭제
  getCurrentUserId?: () => string | null;
  getOwnerEditHref?: (id: string) => string;
  onOwnerDelete?: (id: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** actionType 파생: 명시 값 우선, 없으면 source_type/source_url에서 추론 */
function getActionType(item: ResourcesHubItem): 'view' | 'download' | 'external' | 'copy' {
  if (item.actionType) return item.actionType;
  if (!item.source_url) return 'view';
  return item.source_type === 'external' ? 'external' : 'download';
}

/** fileType 파생: 명시 값 우선, 없으면 확장자에서 추론 */
function getFileType(item: ResourcesHubItem): 'pdf' | 'image' | 'doc' | 'video' | 'etc' {
  if (item.fileType) return item.fileType;
  const name = item.source_file_name || '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp'].includes(ext)) return 'doc';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return 'video';
  return 'etc';
}

const FILE_TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pdf:   { label: 'PDF',   bg: '#FEE2E2', color: '#B91C1C' },
  image: { label: 'IMG',   bg: '#DBEAFE', color: '#1D4ED8' },
  doc:   { label: 'DOC',   bg: '#D1FAE5', color: '#065F46' },
  video: { label: 'VID',   bg: '#EDE9FE', color: '#6D28D9' },
  etc:   { label: 'FILE',  bg: '#F3F4F6', color: '#374151' },
};

// ─── Template ─────────────────────────────────────────────────────────────────

export function ResourcesHubTemplate({ config }: { config: ResourcesHubConfig }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ResourcesHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<ResourcesHubItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
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
    }, 350);
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

  // WO-KPA-RESOURCES-OWNER-ACTIONS-AND-TAKE-V1
  const handleOwnerDeleteItem = useCallback(async (id: string) => {
    if (!config.onOwnerDelete) return;
    try {
      await config.onOwnerDelete(id);
      setSelectedKeys(prev => { const n = new Set(prev); n.delete(id); return n; });
      if (drawerItem?.id === id) setDrawerItem(null);
      loadData();
    } catch {
      // adapter handles error display
    }
  }, [config, drawerItem, loadData]);

  const handleTakeAction = useCallback(async (row: ResourcesHubItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const at = getActionType(row);
    if (at === 'external' && row.source_url) {
      window.open(row.source_url, '_blank', 'noopener,noreferrer');
    } else if (at === 'download' && row.source_url) {
      const a = document.createElement('a');
      a.href = row.source_url;
      if (row.source_file_name) a.download = row.source_file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (at === 'copy') {
      let text = row.body ?? '';
      if (!text && config.fetchDetail) {
        try { const d = await config.fetchDetail(row.id); text = d.body ?? ''; } catch { /* ignore */ }
      }
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
          setCopiedId(row.id);
          setTimeout(() => setCopiedId(prev => prev === row.id ? null : prev), 1500);
        } catch { /* ignore */ }
      } else if (config.fetchDetail) {
        openDrawer(row);
      }
    } else {
      if (config.fetchDetail) openDrawer(row);
    }
  }, [config, openDrawer]);

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

  // ─── Like toggle ─────────────────────────────────────────────────────────

  const handleToggleRecommend = useCallback(async (id: string) => {
    if (!config.onToggleRecommend) return;
    try {
      const res = await config.onToggleRecommend(id);
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, like_count: res.recommendCount, isRecommendedByMe: res.isRecommendedByMe }
          : item,
      ));
    } catch {
      // adapter handles error display
    }
  }, [config]);

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns = useMemo((): O4OColumn<ResourcesHubItem>[] => {
    const hasDrawer = !!config.fetchDetail;
    const hasRowActions = !!(config.getEditHref || config.onDelete || config.getOwnerEditHref || config.onOwnerDelete);

    return [
      {
        key: 'title',
        header: '파일명 / 제목',
        width: '40%',
        sortable: true,
        render: (_v, row) => {
          const ft = getFileType(row);
          const badge = FILE_TYPE_BADGE[ft];
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: hasDrawer ? 'pointer' : 'default' }}>
              {row.source_url && (
                <span style={{
                  padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: badge.bg, color: badge.color, flexShrink: 0,
                }}>
                  {badge.label}
                </span>
              )}
              <span style={{ color: '#111827', fontWeight: 500 }}>{row.title}</span>
            </span>
          );
        },
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
      // WO-KPA-RESOURCES-MINOR-REFINEMENT-V1: 좋아요 컬럼
      ...(config.onToggleRecommend ? [{
        key: 'like_count' as keyof ResourcesHubItem,
        header: '좋아요',
        width: 70,
        align: 'center' as const,
        sortable: true,
        sortAccessor: (row: ResourcesHubItem) => row.like_count ?? 0,
        render: (_v: unknown, row: ResourcesHubItem) => (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleRecommend(row.id); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              color: row.isRecommendedByMe ? '#EF4444' : '#9CA3AF', fontSize: 13,
            }}
          >
            <Heart size={14} fill={row.isRecommendedByMe ? '#EF4444' : 'none'} />
            {row.like_count ?? 0}
          </button>
        ),
      }] : []),
      {
        key: '_actions' as keyof ResourcesHubItem,
        header: '작업',
        width: hasRowActions ? 160 : 120,
        align: 'center',
        system: true,
        render: (_v, row) => {
          const currentUserId = config.getCurrentUserId?.() ?? null;
          const isOwner = currentUserId !== null && row.created_by === currentUserId;
          const actionType = getActionType(row);

          // ⋯ 메뉴 구성
          const rowActions: RowActionItem[] = [];
          // 수정: operator 우선, 없으면 본인
          if (config.getEditHref) {
            rowActions.push({ key: 'edit', label: '수정', onClick: () => navigate(config.getEditHref!(row.id)) });
          } else if (isOwner && config.getOwnerEditHref) {
            rowActions.push({ key: 'edit', label: '수정', onClick: () => navigate(config.getOwnerEditHref!(row.id)) });
          }
          // 삭제: operator 우선, 없으면 본인
          if (config.onDelete) {
            rowActions.push({
              key: 'delete', label: '삭제', variant: 'danger',
              onClick: () => handleDeleteItem(row.id),
              confirm: { title: '자료 삭제', message: '이 자료를 삭제하시겠습니까?', variant: 'danger' },
            });
          } else if (isOwner && config.onOwnerDelete) {
            rowActions.push({
              key: 'delete', label: '삭제', variant: 'danger',
              onClick: () => handleOwnerDeleteItem(row.id),
              confirm: { title: '자료 삭제', message: '본인이 등록한 자료를 삭제하시겠습니까?', variant: 'danger' },
            });
          }
          // 링크 복사 (source_url 있을 때)
          if (row.source_url) {
            rowActions.push({
              key: 'copy-link', label: '링크 복사',
              onClick: () => navigator.clipboard.writeText(row.source_url!).catch(() => {}),
            });
          }

          // 가져가기 버튼 아이콘/라벨
          const isCopied = copiedId === row.id;
          const takeIcon = actionType === 'external' ? <ExternalLink size={12} />
            : actionType === 'download' ? <Download size={12} />
            : actionType === 'copy' ? <Copy size={12} />
            : null;
          const takeLabel = isCopied ? '복사됨!' : '가져가기';

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <button
                onClick={(e) => handleTakeAction(row, e)}
                style={{ ...st.actionBtn, ...(isCopied ? { background: '#D1FAE5', color: '#065F46' } : {}) }}
              >
                {takeIcon}
                {takeLabel}
              </button>
              {rowActions.length > 0 && <RowActionMenu actions={rowActions} />}
            </div>
          );
        },
      },
    ];
  }, [config, navigate, openDrawer, handleDeleteItem, handleOwnerDeleteItem, handleTakeAction, handleToggleRecommend, copiedId]);

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
          <h1 style={st.title}>{config.heroTitle ?? '자료실'}</h1>
          {config.heroDesc && <p style={st.subtitle}>{config.heroDesc}</p>}
        </div>
        {config.headerAction ?? (
          config.createAction && (
            <button onClick={() => navigate(config.createAction!.href)} style={st.createBtn}>
              <Plus size={16} />
              {config.createAction.label}
            </button>
          )
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

      {/* Result count */}
      {!loading && (
        <div style={st.resultInfo}>
          {searchQuery ? `검색 결과 ${total}건` : `총 ${total}개의 자료`}
        </div>
      )}

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
            emptyMessage={
              searchQuery
                ? (config.emptyFilteredMessage ?? '검색 결과가 없습니다.')
                : (config.emptyMessage ?? '등록된 자료가 없습니다.')
            }
            rowClassName={() => config.fetchDetail ? 'cursor-pointer' : ''}
          />
          <div style={{ marginTop: 20 }}>
            <HubPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) =>
                setSearchParams(prev => { prev.set('page', String(page)); return prev; })
              }
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
          footer={drawerItem?.source_url ? (() => {
            const at = getActionType(drawerItem);
            return (
              <a
                href={drawerItem.source_url!}
                target={at === 'external' ? '_blank' : '_self'}
                rel="noopener noreferrer"
                download={at === 'download' ? (drawerItem.source_file_name || true) : undefined}
                style={{ ...st.drawerDownloadBtn, textDecoration: 'none' }}
              >
                {at === 'external' ? <ExternalLink size={16} /> : <Download size={16} />}
                {at === 'external' ? '바로가기' : '다운로드'}
              </a>
            );
          })() : undefined}
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
                  {getActionType(drawerItem) === 'external' ? (
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
  resultInfo: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
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
