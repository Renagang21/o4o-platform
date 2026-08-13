/**
 * HubPopLibraryPage — K-Cosmetics 매장 HUB POP 진열 + 매장으로 가져오기
 *
 * WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1 — KPA/GlycoPharm canonical mirror.
 * - HUB 목록: hubContentApi.list({ sourceDomain='pop' })
 * - 단건 가져가기: importOperatorPop(slug, sourceId)
 * - 일괄 가져가기: Promise.allSettled fan-out (단건 endpoint 반복 호출)
 *
 * 권한: store_owner (RoleGuard + verifyOwner backend 검증).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, X, ExternalLink, Megaphone } from 'lucide-react';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { useHubImportLibrary } from '@o4o/store-ui-core';
import { hubContentApi } from '@/lib/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '@/api/storeHub';
import { importOperatorPop } from '@/api/popStaff';

const PAGE_LIMIT = 20;

export function HubPopLibraryPage() {
  const navigate = useNavigate();
  // WO-O4O-STORE-HUB-SUPPLIER-CONTENT-EXPLORER-COMMONIZATION-V1:
  //   목록 · 페이지네이션 · loading/error · 매장 slug · 선택 · 단건/일괄 가져오기 상태를
  //   공통 Core(@o4o/store-ui-core `useHubImportLibrary`) 로 이관.
  //   HUB 조회와 가져오기 API(importOperatorPop) 는 adapter 로 그대로 주입한다 — backend · 계약 무변경.
  //   HUB 목록은 운영자 **원본**의 읽기 전용 진열이고, 가져오기가 만드는 것은 매장 소유 **사본**이다.
  const fetchPage = useCallback(
    ({ page: nextPage, limit }: { page: number; limit: number }) =>
      hubContentApi
        .list({ sourceDomain: 'pop', page: nextPage, limit })
        .then((res) => ({ items: res.data ?? [], total: res.pagination?.total ?? 0 })),
    [],
  );

  const hub = useHubImportLibrary<HubContentItemResponse>({
    fetchPage,
    limit: PAGE_LIMIT,
    resolveStoreSlug: getStoreSlug,
    importOne: (storeSlug, id) => importOperatorPop(storeSlug, id),
    messages: {
      loadError: 'HUB POP 을 불러올 수 없습니다',
      storeMissing: '매장 정보를 확인할 수 없습니다',
      storeMissingBatchError: '매장 정보 미연결',
      importSuccess: (result) =>
        `"${(result as { title: string }).title}" 가져오기 완료 — 내 매장 POP(초안)에 추가되었습니다`,
      importError: '가져오기에 실패했습니다',
      bulkSuccess: (n) => `${n}개 POP 이 내 매장에 추가되었습니다`,
      bulkError: (n) => `${n}개 POP 가져오기에 실패했습니다`,
    },
  });

  const {
    items,
    page,
    totalPages,
    isLoading,
    error,
    slug,
    slugResolved,
    selectedIds,
    setSelectedIds,
    selectedItem,
    setSelectedItem,
    singleImporting,
    batch,
  } = hub;
  const setPage = hub.setPage;
  const loadData = hub.reload;
  const handleSingleImport = hub.importSingle;
  const handleBulkImport = hub.importSelected;

  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (item) => item.title,
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-pink-50 shrink-0 text-pink-600">
            <Megaphone className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{item.title}</span>
        </div>
      ),
    },
    {
      key: 'producer',
      header: '출처',
      width: '100px',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-pink-50 border-pink-200 text-pink-700">
          운영자 자료
        </span>
      ),
    },
    {
      key: 'description',
      header: '요약',
      render: (_v, item) => <span className="text-xs text-slate-500 line-clamp-1">{item.description || '-'}</span>,
    },
    {
      key: 'createdAt',
      header: '게시일',
      width: '110px',
      sortable: true,
      sortAccessor: (item) => new Date(item.createdAt).getTime(),
      render: (_v, item) => (
        <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
  ], []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">매장 HUB POP</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          K-Cosmetics 운영자가 발행한 POP 콘텐츠입니다. 선택해 일괄 가져가기 또는 행 클릭으로 단건 가져가기를 할 수 있습니다.
          가져온 POP 은 매장 소유이며, 초안 상태로 복사되어 자유롭게 수정·발행할 수 있습니다.
        </p>
        {/* WO-O4O-POP-STAFF-PAGE-GP-KCOS-PARITY-V1: 가져온 POP 사본 관리 진입 */}
        <button
          onClick={() => navigate('/store/marketing/pop/library')}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:underline"
        >
          내 매장 POP 사본 관리 →
        </button>
      </header>

      {slugResolved && !slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
          매장 정보가 연결되지 않아 가져가기 기능을 사용할 수 없습니다. 매장 등록 후 다시 시도해 주세요.
        </div>
      )}

      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-3 px-4 py-1.5 text-xs text-pink-700 border border-pink-400 rounded-lg hover:bg-pink-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              actions={[
                {
                  key: 'bulk-import',
                  label: `내 매장에 가져가기 (${selectedIds.size})`,
                  onClick: handleBulkImport,
                  variant: 'primary' as const,
                  icon: <Copy className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  tooltip: '선택한 POP 을 내 매장 POP(초안)으로 일괄 가져갑니다',
                  visible: selectedIds.size > 0,
                  disabled: !slug,
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

          <BulkResultModal
            open={batch.showResult}
            onClose={() => batch.clearResult()}
            result={batch.result}
            onRetry={() => batch.retryFailed()}
          />

          <DataTable<HubContentItemResponse>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage="아직 운영자 게시 POP 이 없습니다"
            tableId="kcos-store-hub-pop"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setSelectedItem(row)}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {slug && items.length > 0 && (
        <div className="flex items-start gap-3 mt-8 p-5 bg-pink-50/60 border border-pink-100 rounded-xl text-sm text-slate-600 leading-relaxed">
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            가져온 POP 은{' '}
            <button
              onClick={() => navigate('/store/marketing/pop')}
              className="text-pink-700 hover:underline font-medium"
            >
              내 매장 POP
            </button>{' '}
            에서 수정·발행할 수 있습니다.
          </span>
        </div>
      )}

      <BaseDetailDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        width={480}
        actions={
          selectedItem
            ? [
                {
                  label: singleImporting ? '가져오는 중...' : '내 매장에 가져가기',
                  onClick: () => handleSingleImport(selectedItem),
                  variant: 'primary' as const,
                  disabled: !slug || singleImporting,
                },
              ]
            : []
        }
      >
        {selectedItem && (
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-pink-50 border-pink-200 text-pink-700">
                운영자 자료
              </span>
            </div>
            {selectedItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{selectedItem.description}</p>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-20 text-slate-400 shrink-0">게시일</dt>
                <dd className="text-slate-700">{new Date(selectedItem.createdAt).toLocaleDateString('ko-KR')}</dd>
              </div>
            </dl>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

export default HubPopLibraryPage;
