/**
 * HubQrLibraryPage — GlycoPharm 매장 HUB QR 진열 + 매장으로 가져오기
 *
 * WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1 — 조회 페이지 신설
 * WO-O4O-GLYCOPHARM-STORE-HUB-POP-QR-STAFF-BACKEND-V1 — Backend mount
 * WO-O4O-GLYCOPHARM-HUB-IMPORT-BLOG-POP-QR-V1 — 가져가기 wire-up
 *
 * KPA HubQrLibraryPage 패턴 동일. SERVICE_KEY='glycopharm'.
 * - HUB 목록: hubContentApi.list({ sourceDomain='qr' })
 * - 단건 가져가기: importOperatorQr(slug, sourceId)
 * - 일괄 가져가기: Promise.allSettled fan-out (단건 endpoint 반복 호출)
 *
 * 권한: store_owner (HubGuard + verifyOwner backend 검증).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, ExternalLink, QrCode } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { hubContentApi } from '@/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '@/api/storeHub';
import { importOperatorQr } from '@/api/qrStaff';

const PAGE_LIMIT = 20;

export function HubQrLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<HubContentItemResponse | null>(null);
  const [singleImporting, setSingleImporting] = useState(false);

  const batch = useBatchAction();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const resolved = await getStoreSlug();
        if (!canceled) { setSlug(resolved); setSlugResolved(true); }
      } catch {
        if (!canceled) { setSlug(null); setSlugResolved(true); }
      }
    })();
    return () => { canceled = true; };
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        sourceDomain: 'qr',
        page,
        limit: PAGE_LIMIT,
      });
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'HUB QR 을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  const handleSingleImport = useCallback(async (item: HubContentItemResponse) => {
    if (!slug) { toast.error('매장 정보를 확인할 수 없습니다'); return; }
    setSingleImporting(true);
    try {
      const result = await importOperatorQr(slug, item.id);
      toast.success(`"${result.title}" 가져오기 완료 — 내 매장 QR 에 추가되었습니다`);
      setSelectedItem(null);
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setSingleImporting(false);
    }
  }, [slug]);

  const batchImportItems = useCallback(
    async (ids: string[]): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      if (!slug) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: '매장 정보 미연결' })) } };
      }
      const settled = await Promise.allSettled(ids.map((id) => importOperatorQr(slug, id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      const successCount = results.filter((r) => r.status === 'success').length;
      const failCount = results.filter((r) => r.status === 'failed').length;
      if (successCount > 0) toast.success(`${successCount}개 QR 이 내 매장에 추가되었습니다`);
      if (failCount > 0) toast.error(`${failCount}개 QR 가져오기에 실패했습니다`);
      return { data: { results } };
    },
    [slug],
  );

  const handleBulkImport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!slug) { toast.error('매장 정보를 확인할 수 없습니다'); return; }
    const result = await batch.executeBatch(batchImportItems, Array.from(selectedIds));
    if (result.successCount > 0) setSelectedIds(new Set());
  }, [selectedIds, slug, batch, batchImportItems]);

  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(() => [
    {
      key: 'title',
      header: '제목',
      sortable: true,
      sortAccessor: (item) => item.title,
      render: (_v, item) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-emerald-50 shrink-0 text-emerald-600">
            <QrCode className="w-3.5 h-3.5" />
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
        <h1 className="text-2xl font-bold text-slate-900">약국 HUB QR</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          GlycoPharm 운영자가 발행한 QR 콘텐츠입니다. 선택해 일괄 가져가기 또는 행 클릭으로 단건 가져가기를 할 수 있습니다.
          가져온 QR 은 매장 소유이며, 매장 QR 목록에서 자유롭게 관리할 수 있습니다.
        </p>
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
            className="mt-3 px-4 py-1.5 text-xs text-emerald-700 border border-emerald-400 rounded-lg hover:bg-emerald-50"
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
                  icon: <Download className="w-3.5 h-3.5" />,
                  loading: batch.loading,
                  group: 'actions',
                  tooltip: '선택한 QR 을 내 매장 QR 로 일괄 가져갑니다',
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
            emptyMessage="아직 운영자 게시 QR 이 없습니다"
            tableId="glyco-store-hub-qr"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
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

      {slug && items.length > 0 && (
        <div className="flex items-start gap-3 mt-8 p-5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-sm text-slate-600 leading-relaxed">
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            가져온 QR 은{' '}
            <button
              onClick={() => navigate('/store/marketing/qr')}
              className="text-emerald-700 hover:underline font-medium"
            >
              내 매장 QR
            </button>{' '}
            에서 관리할 수 있습니다.
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

export default HubQrLibraryPage;
