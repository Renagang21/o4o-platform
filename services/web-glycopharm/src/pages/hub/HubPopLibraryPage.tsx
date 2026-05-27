/**
 * HubPopLibraryPage — GlycoPharm 매장 HUB POP 진열 (조회 전용)
 *
 * WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1
 *
 * KPA HubPopLibraryPage 패턴 mirror. SERVICE_KEY='glycopharm'.
 * - HUB 목록: hubContentApi.list({ serviceKey='glycopharm', sourceDomain='pop' })
 *
 * 가져가기(import) 동작은 본 WO 에서 구현하지 않는다.
 * 후속 P2 (WO-O4O-GLYCOPHARM-HUB-IMPORT-BLOG-POP-QR-V1) 에서:
 *   - getStoreSlug + importOperatorPop wire-up
 *   - selectable / ActionBar 가져가기 액션 활성화
 *   - Drawer "내 매장에 가져가기" 액션 활성화
 *
 * 권한: store_owner (HubGuard + verifyOwner backend 검증).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { hubContentApi } from '@/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';

const PAGE_LIMIT = 20;

export function HubPopLibraryPage() {
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<HubContentItemResponse | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        sourceDomain: 'pop',
        page,
        limit: PAGE_LIMIT,
      });
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'HUB POP 을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (item) => item.title,
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 shrink-0 text-emerald-600">
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
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
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
        <h1 className="text-2xl font-bold text-slate-900">약국 HUB POP</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          GlycoPharm 운영자가 발행한 POP 콘텐츠입니다. 행을 클릭해 상세를 확인할 수 있습니다.
          내 매장으로 가져가기는 곧 활성화될 예정입니다.
        </p>
      </header>

      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-3 px-4 py-1.5 text-xs text-emerald-700 border border-emerald-400 rounded-lg hover:bg-emerald-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
          <DataTable<HubContentItemResponse>
            columns={columns}
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage="아직 운영자 게시 POP 이 없습니다"
            tableId="glyco-store-hub-pop"
            onRowClick={(row) => setSelectedItem(row)}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      <BaseDetailDrawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? ''}
        width={480}
        actions={[]}
      >
        {selectedItem && (
          <div className="space-y-4 p-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700">
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
