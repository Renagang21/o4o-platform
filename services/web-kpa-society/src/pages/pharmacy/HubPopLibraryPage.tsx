/**
 * HubPopLibraryPage — 매장 HUB POP 진열 + 매장으로 가져오기 (표준 테이블)
 *
 * WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 (Phase 3-B 초기 카드형)
 * WO-O4O-KPA-STORE-HUB-IMPORT-PAGES-STANDARD-TABLE-V1 (2026-05-24):
 *   카드형 items.map → O4O 표준 테이블. HubSignageLibraryPage / HubBlogLibraryPage 패턴 mirror.
 *
 * 매장 경영자가 KPA HUB 에 진열된 운영자 발행 POP 을 보고, "가져가기" 로
 * 자기 매장 POP 사본 (author_role='store') 으로 가져온다.
 *
 * 데이터 흐름 (변경 없음):
 *   - HUB 목록: hubContentApi.list({ serviceKey='kpa', sourceDomain='pop' })
 *   - 단건 가져가기: importOperatorPop(slug, sourceId)
 *   - 일괄 가져가기: Promise.allSettled fan-out (단건 endpoint 반복 호출 — 신규 backend 없음)
 *
 * 권한: store_owner (HubGuard + verifyOwner backend 검증).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, ExternalLink, Megaphone, Plus } from 'lucide-react';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { useHubImportLibrary } from '@o4o/store-ui-core';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { importOperatorPop } from '../../api/popStaff';

const SERVICE_KEY = 'kpa';
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
        .list({ serviceKey: SERVICE_KEY, sourceDomain: 'pop', page: nextPage, limit })
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
        `"${(result as { title: string }).title}" 가져오기 완료 — 내 약국 POP(초안)에 추가되었습니다`,
      importError: '가져오기에 실패했습니다',
      bulkSuccess: (n) => `${n}개 POP 이 내 약국에 추가되었습니다`,
      bulkError: (n) => `${n}개 POP 가져오기에 실패했습니다`,
    },
  });

  const {
    items,
    total,
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

  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '제목',
        // WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3): 현재 페이지만 정렬되는 UI 제거.
        //   서버 정렬 도입 시 manualSort + sortKey/sortDirection/onSort 로 재도입할 것.
        render: (_v, item) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
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
          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-blue-50 border-blue-200 text-blue-700">
            운영자 자료
          </span>
        ),
      },
      {
        key: 'description',
        header: '요약',
        render: (_v, item) => (
          <span className="text-xs text-slate-500 line-clamp-1">{item.description || '-'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: '게시일',
        width: '110px',
        render: (_v, item) => (
          <span className="text-xs text-slate-500">
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* WO-KPA-STORE-HUB-ASSET-CREATE-ACTION-RESTORE-V1:
          플랫폼 자료 "가져가기"와 "내 약국용 직접 만들기"를 분리 노출 */}
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB POP</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            KPA 운영자가 발행한 POP 을 선택해 내 약국으로 가져가거나(초안 사본),
            내 약국용 POP 을 직접 만드세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/store/marketing/pop')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          POP 만들기
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
            className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50"
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
                  label: `내 약국에 가져가기 (${selectedIds.size})`,
                  onClick: handleBulkImport,
                  variant: 'primary' as const,
                  icon: <Download className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  tooltip: '선택한 POP 을 내 약국 POP(초안)으로 일괄 가져갑니다',
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
            tableId="store-hub-pop"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setSelectedItem(row)}
          />

          {/* WO-O4O-KPA-STORE-HUB-STANDARD-TABLE-AND-SIGNAGE-MENU-IA-V1: 수제 이전/다음 → 표준 Pagination */}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
          )}
        </>
      )}

      {slug && items.length > 0 && (
        <div className="flex items-start gap-3 mt-8 p-5 bg-blue-50/60 border border-blue-100 rounded-xl text-sm text-slate-600 leading-relaxed">
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          {/* WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-5): 값 복사형 사본 정책 안내 */}
          <span>
            가져온 자료는 내 매장의 독립 사본으로 저장됩니다. 같은 자료를 다시 가져오면 새로운 사본이 생성됩니다.{' '}
            가져온 POP 은{' '}
            <button
              onClick={() => navigate('/store/content/pop')}
              className="text-blue-600 hover:underline font-medium"
            >
              내 약국 POP
            </button>{' '}
            에서 수정할 수 있습니다.
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
                  label: singleImporting ? '가져오는 중...' : '내 약국에 가져가기',
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
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                운영자 자료
              </span>
            </div>
            {selectedItem.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{selectedItem.description}</p>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-20 text-slate-400 shrink-0">게시일</dt>
                <dd className="text-slate-700">
                  {new Date(selectedItem.createdAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

export default HubPopLibraryPage;
