/**
 * HubSignageLibraryPage - 플랫폼 사이니지 라이브러리
 *
 * WO-O4O-HUB-SIGNAGE-INTEGRATION-V1
 * WO-O4O-STORE-HUB-SIGNAGE-CANONICAL-DATATABLE-V1: 카드리스트 → canonical DataTable 전환
 *
 * Hub 공용공간에서 플랫폼이 제공하는 사이니지 미디어/플레이리스트를 탐색하고
 * "내 매장에 추가" 버튼으로 Asset Snapshot Copy를 실행하는 페이지.
 *
 * 전이 패턴 (CMS와 동일):
 *   /hub/signage 탐색
 *     → assetSnapshotApi.copy({ assetType: 'signage' })
 *     → o4o_asset_snapshots
 *     → /store/content?tab=signage 에서 관리
 *
 * 데이터 소스:
 *   - hubContentApi.list({ sourceDomain: 'signage-media' })   : 공개 미디어 목록
 *   - hubContentApi.list({ sourceDomain: 'signage-playlist' }): 공개 플레이리스트 목록
 *   - assetSnapshotApi.copy()                                 : 내 매장에 복사
 *
 * ❌ globalContentApi.cloneMedia/clonePlaylist 사용 금지
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본 (signage_media, signage_playlists)
 * 2. Store = snapshot 조합 (o4o_asset_snapshots → store_playlist_items)
 * 3. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로만 사용
 * 4. Playlist가 유일한 재생 단위 (store_playlists)
 * 5. 공개 렌더링: /public/signage?playlist=:id
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, ExternalLink, Monitor, ListVideo } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';
import { HUB_PRODUCER_LABELS } from '@o4o/types/hub-content';

// ── Types ─────────────────────────────────────────────────────────

// WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1 (2026-05-23):
//   'supplier' 는 PLATFORM-CONTENT-POLICY-V1 §6.3 기준 Legacy / 명문화된 예외.
//   UI 필터 옵션에서 제거 — Legacy supplier 콘텐츠는 '전체' 탭에서만 노출.
type HubProducer = 'operator' | 'community';
type ViewTab = 'media' | 'playlist';
type SourceFilter = 'all' | HubProducer;

// ── Constants ─────────────────────────────────────────────────────

const HUB_PRODUCER_TABS: readonly { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'operator', label: '운영자' },
  { key: 'community', label: '커뮤니티' },
] as const;

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'media', label: '미디어' },
  { key: 'playlist', label: '플레이리스트' },
];

const PAGE_LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

// ── Component ─────────────────────────────────────────────────────

export function HubSignageLibraryPage() {
  const [viewTab, setViewTab] = useState<ViewTab>('media');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Media state
  const [allMedia, setAllMedia] = useState<HubContentItemResponse[]>([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Playlist state
  const [allPlaylists, setAllPlaylists] = useState<HubContentItemResponse[]>([]);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistLoading, setPlaylistLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // WO-O4O-STORE-HUB-SIGNAGE-CANONICAL-DATATABLE-V1:
  //   Set<string> 기반 canonical selection 패턴
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer for row click detail
  const [selectedItem, setSelectedItem] = useState<HubContentItemResponse | null>(null);

  // Batch hook for bulk add
  const batch = useBatchAction();

  // Fetch media
  const fetchMedia = useCallback(async (page: number) => {
    setMediaLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: 'kpa-society',
        sourceDomain: 'signage-media',
        page,
        limit: PAGE_LIMIT,
      });
      if (res.success) {
        setAllMedia(res.data || []);
        setMediaTotal(res.pagination?.total || 0);
      } else {
        setAllMedia([]);
        setMediaTotal(0);
      }
    } catch {
      setError('미디어 목록을 불러오지 못했습니다.');
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Fetch playlists
  const fetchPlaylists = useCallback(async (page: number) => {
    setPlaylistLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: 'kpa-society',
        sourceDomain: 'signage-playlist',
        page,
        limit: PAGE_LIMIT,
      });
      if (res.success) {
        setAllPlaylists(res.data || []);
        setPlaylistTotal(res.pagination?.total || 0);
      } else {
        setAllPlaylists([]);
        setPlaylistTotal(0);
      }
    } catch {
      setError('플레이리스트 목록을 불러오지 못했습니다.');
    } finally {
      setPlaylistLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(mediaPage); }, [fetchMedia, mediaPage]);
  useEffect(() => { fetchPlaylists(playlistPage); }, [fetchPlaylists, playlistPage]);

  // Tab/filter change → clear selection
  useEffect(() => {
    setSelectedIds(new Set());
  }, [viewTab, sourceFilter]);

  // Producer filtering (client-side)
  const filteredMedia = useMemo(() => {
    if (sourceFilter === 'all') return allMedia;
    return allMedia.filter(m => m.producer === sourceFilter);
  }, [allMedia, sourceFilter]);

  const filteredPlaylists = useMemo(() => {
    if (sourceFilter === 'all') return allPlaylists;
    return allPlaylists.filter(p => p.producer === sourceFilter);
  }, [allPlaylists, sourceFilter]);

  const mediaTotalFiltered = sourceFilter === 'all' ? mediaTotal : filteredMedia.length;
  const playlistTotalFiltered = sourceFilter === 'all' ? playlistTotal : filteredPlaylists.length;

  // Single add (row drawer 또는 row action용)
  const handleCopySingle = useCallback(async (item: HubContentItemResponse) => {
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: item.id,
        assetType: 'signage',
      });
      toast.success(`"${item.title}" 이(가) 내 매장에 추가되었습니다.`);
      setSelectedItem(null);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('DUPLICATE') || msg.includes('already') || e?.code === 'DUPLICATE_SNAPSHOT') {
        toast.error('이미 매장에 추가된 항목입니다.');
      } else if (e?.status === 403) {
        toast.error('추가 권한이 없습니다. 매장 계정으로 로그인되어 있는지 확인하세요.');
      } else {
        toast.error(`매장 추가에 실패했습니다. (${msg || '서버 오류'})`);
      }
    }
  }, []);

  // Bulk add — batch.executeBatch 패턴
  const batchAddItems = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const currentData = viewTab === 'media' ? filteredMedia : filteredPlaylists;
      const settled = await Promise.allSettled(
        ids.map((id) => {
          return assetSnapshotApi.copy({
            sourceService: 'kpa',
            sourceAssetId: id,
            assetType: 'signage',
          });
        }),
      );
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        const msg = err?.message || 'Network error';
        return { id, status: 'failed' as const, error: msg };
      });
      // Show quick summary toast
      const successCount = results.filter(r => r.status === 'success').length;
      const failCount = results.filter(r => r.status === 'failed').length;
      if (successCount > 0) toast.success(`${successCount}개 항목이 내 매장에 추가되었습니다.`);
      if (failCount > 0) toast.error(`${failCount}개 항목 추가에 실패했습니다.`);
      // Suppress unused variable warning
      void currentData;
      return { data: { results } };
    },
    [viewTab, filteredMedia, filteredPlaylists],
  );

  const handleBulkAdd = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await batch.executeBatch(batchAddItems, ids);
    if (result.successCount > 0) {
      setSelectedIds(new Set());
    }
  }, [selectedIds, batch, batchAddItems]);

  const isLoading = viewTab === 'media' ? mediaLoading : playlistLoading;
  const currentData = viewTab === 'media' ? filteredMedia : filteredPlaylists;
  const mediaTotalPages = Math.max(1, Math.ceil(mediaTotal / PAGE_LIMIT));
  const playlistTotalPages = Math.max(1, Math.ceil(playlistTotal / PAGE_LIMIT));
  const currentPage = viewTab === 'media' ? mediaPage : playlistPage;
  const totalPages = viewTab === 'media' ? mediaTotalPages : playlistTotalPages;

  // ── Columns ───────────────────────────────────────────────────────
  // WO-O4O-STORE-HUB-SIGNAGE-CANONICAL-DATATABLE-V1:
  //   @o4o/operator-ux-core DataTable 기반 ListColumnDef 정의
  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (item) => item.title,
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
            {viewTab === 'playlist' ? <ListVideo className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{item.title}</span>
        </div>
      ),
    },
    {
      key: 'mediaType',
      header: '유형',
      width: '110px',
      render: (_v, item) => {
        if (viewTab === 'playlist') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 border-blue-200 text-blue-700">
              플레이리스트
            </span>
          );
        }
        const label = item.mediaType
          ? (SIGNAGE_MEDIA_TYPE_LABELS[item.mediaType as keyof typeof SIGNAGE_MEDIA_TYPE_LABELS] || item.mediaType)
          : '-';
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-violet-50 border-violet-200 text-violet-700">
            {label}
          </span>
        );
      },
    },
    {
      key: 'producer',
      header: '출처',
      width: '90px',
      render: (_v, item) => {
        const label = item.producer ? (HUB_PRODUCER_LABELS[item.producer] || item.producer) : '-';
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
            {label}
          </span>
        );
      },
    },
    {
      key: 'duration',
      header: '재생시간',
      width: '90px',
      render: (_v, item) => {
        const d = viewTab === 'playlist' ? item.totalDuration : item.duration;
        if (!d || d === 0) return <span className="text-xs text-slate-400">-</span>;
        return <span className="text-xs text-slate-600">{formatDuration(d)}</span>;
      },
    },
    {
      key: 'items',
      header: '항목수',
      width: '70px',
      render: (_v, item) => {
        if (viewTab !== 'playlist') return <span className="text-xs text-slate-400">-</span>;
        return <span className="text-xs text-slate-600">{item.itemCount ?? 0}개</span>;
      },
    },
    {
      key: 'creatorName',
      header: '등록자',
      width: '110px',
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{item.creatorName || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '95px',
      sortable: true,
      sortAccessor: (item) => new Date(item.createdAt).getTime(),
      render: (_v, item) => (
        <span className="text-xs text-slate-500">
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ], [viewTab]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero */}
      <header className="mb-6 pb-5 border-b-2 border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">플랫폼 사이니지</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          디지털 사이니지 미디어와 플레이리스트를 탐색하고 내 매장에 추가합니다.
          추가 후 사이니지 운영 화면에서 재생 스케줄을 설정하세요.
        </p>
      </header>

      {/* View Tabs (미디어 / 플레이리스트) */}
      <div className="flex gap-1 mb-4 border-b-2 border-slate-200">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewTab(tab.key)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[2px] transition-colors',
              viewTab === tab.key
                ? 'text-blue-600 border-blue-600 font-semibold'
                : 'text-slate-500 border-transparent hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {tab.key === 'media' ? mediaTotalFiltered : playlistTotalFiltered}
            </span>
          </button>
        ))}
      </div>

      {/* Source Filter Pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {HUB_PRODUCER_TABS.map(f => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key as SourceFilter)}
            className={[
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              sourceFilter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button
            onClick={() => viewTab === 'media' ? fetchMedia(mediaPage) : fetchPlaylists(playlistPage)}
            className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* WO-O4O-STORE-HUB-SIGNAGE-CANONICAL-DATATABLE-V1: ActionBar + DataTable */}
      {!error && (
        <>
          {/* ActionBar — 선택 항목이 있을 때만 표시 */}
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              actions={[
                {
                  key: 'bulk-add',
                  label: `내 매장에 추가 (${selectedIds.size})`,
                  onClick: handleBulkAdd,
                  variant: 'primary' as const,
                  icon: <Plus className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  tooltip: '선택한 항목을 내 매장 사이니지에 일괄 추가합니다',
                  visible: selectedIds.size > 0,
                },
                {
                  key: 'clear',
                  label: '선택 해제',
                  onClick: () => setSelectedIds(new Set()),
                  variant: 'default' as const,
                  icon: <X className="w-3.5 h-3.5" />,
                  group: 'meta',
                  visible: selectedIds.size > 0,
                },
              ]}
            />
          </div>

          {/* BulkResultModal */}
          <BulkResultModal
            open={batch.showResult}
            onClose={() => batch.clearResult()}
            result={batch.result}
            onRetry={() => batch.retryFailed()}
          />

          {/* DataTable */}
          <DataTable<HubContentItemResponse>
            columns={columns}
            data={currentData}
            rowKey="id"
            loading={isLoading}
            emptyMessage={
              sourceFilter === 'all'
                ? `현재 제공되는 ${viewTab === 'media' ? '사이니지 미디어' : '플레이리스트'}가 없습니다.`
                : `"${HUB_PRODUCER_TABS.find(f => f.key === sourceFilter)?.label}" 출처의 ${viewTab === 'media' ? '미디어' : '플레이리스트'}가 없습니다.`
            }
            tableId={`store-hub-signage-${viewTab}`}
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setSelectedItem(row)}
          />

          {/* Pagination */}
          {totalPages > 1 && sourceFilter === 'all' && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={currentPage <= 1}
                onClick={() => viewTab === 'media'
                  ? setMediaPage(p => Math.max(1, p - 1))
                  : setPlaylistPage(p => Math.max(1, p - 1))
                }
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{currentPage} / {totalPages}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => viewTab === 'media'
                  ? setMediaPage(p => p + 1)
                  : setPlaylistPage(p => p + 1)
                }
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* Guide notice */}
      <div className="flex items-start gap-3 mt-8 p-5 bg-blue-50/60 border border-blue-100 rounded-xl text-sm text-slate-600 leading-relaxed">
        <span className="text-lg shrink-0">💡</span>
        <span>
          추가한 사이니지는{' '}
          <Link to="/store/marketing/signage" className="text-blue-600 underline underline-offset-2">
            사이니지 운영 화면
          </Link>
          에서 플레이리스트 구성과 스케줄 적용을 할 수 있습니다.
        </span>
      </div>

      {/* Row Click Detail Drawer */}
      <BaseDetailDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        width={480}
        actions={selectedItem ? [
          {
            label: '내 매장에 추가',
            onClick: () => handleCopySingle(selectedItem),
            variant: 'primary' as const,
          },
        ] : []}
      >
        {selectedItem && (
          <div className="space-y-4 p-1">
            {/* Type + Producer badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {viewTab === 'media' && selectedItem.mediaType && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-violet-50 border-violet-200 text-violet-700">
                  {SIGNAGE_MEDIA_TYPE_LABELS[selectedItem.mediaType as keyof typeof SIGNAGE_MEDIA_TYPE_LABELS] || selectedItem.mediaType}
                </span>
              )}
              {viewTab === 'playlist' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                  플레이리스트
                </span>
              )}
              {selectedItem.producer && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-slate-50 border-slate-200 text-slate-600">
                  {HUB_PRODUCER_LABELS[selectedItem.producer] || selectedItem.producer}
                </span>
              )}
            </div>

            {/* Description */}
            {selectedItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{selectedItem.description}</p>
            )}

            {/* Meta info */}
            <dl className="space-y-2 text-sm">
              {viewTab === 'media' && selectedItem.duration != null && selectedItem.duration > 0 && (
                <div className="flex gap-3">
                  <dt className="w-20 text-slate-400 shrink-0">재생시간</dt>
                  <dd className="text-slate-700">{formatDuration(selectedItem.duration)}</dd>
                </div>
              )}
              {viewTab === 'playlist' && (
                <>
                  {(selectedItem.itemCount ?? 0) > 0 && (
                    <div className="flex gap-3">
                      <dt className="w-20 text-slate-400 shrink-0">항목수</dt>
                      <dd className="text-slate-700">{selectedItem.itemCount}개</dd>
                    </div>
                  )}
                  {(selectedItem.totalDuration ?? 0) > 0 && (
                    <div className="flex gap-3">
                      <dt className="w-20 text-slate-400 shrink-0">총 재생시간</dt>
                      <dd className="text-slate-700">{formatDuration(selectedItem.totalDuration!)}</dd>
                    </div>
                  )}
                </>
              )}
              {selectedItem.creatorName && (
                <div className="flex gap-3">
                  <dt className="w-20 text-slate-400 shrink-0">등록자</dt>
                  <dd className="text-slate-700">{selectedItem.creatorName}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="w-20 text-slate-400 shrink-0">등록일</dt>
                <dd className="text-slate-700">
                  {new Date(selectedItem.createdAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            </dl>

            {/* Source URL link */}
            {selectedItem.sourceUrl && (
              <a
                href={selectedItem.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                원본 보기
              </a>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
