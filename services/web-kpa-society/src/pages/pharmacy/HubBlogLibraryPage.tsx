/**
 * HubBlogLibraryPage — 매장 HUB 블로그 진열 + 매장으로 가져오기 (표준 테이블)
 *
 * WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1 (Phase 3-B 초기 카드형)
 * WO-O4O-KPA-STORE-HUB-IMPORT-PAGES-STANDARD-TABLE-V1 (2026-05-24):
 *   카드형 items.map → O4O 표준 테이블 (DataTable + ActionBar + useBatchAction +
 *   BulkResultModal + BaseDetailDrawer). HubSignageLibraryPage 패턴 mirror.
 *
 * 매장 경영자가 KPA HUB 에 진열된 운영자 발행 블로그를 보고, "가져가기" 로
 * 자기 매장 블로그 사본 (author_role='store') 으로 가져온다.
 *
 * 데이터 흐름 (변경 없음):
 *   - HUB 목록: hubContentApi.list({ serviceKey='kpa', sourceDomain='blog' })
 *   - 단건 가져가기: importOperatorBlog(slug, sourceBlogId)
 *   - 일괄 가져가기: Promise.allSettled fan-out (단건 endpoint 반복 호출 — 신규 backend 없음)
 *
 * 표준 테이블 패턴 (HubSignageLibraryPage reference):
 *   - DataTable (@o4o/operator-ux-core) — selectable + checkbox + sortable columns
 *   - ActionBar (@o4o/ui) — 선택 시 '일괄 가져가기' 노출
 *   - useBatchAction (@o4o/operator-ux-core) — bulk 상태 / 결과 collector
 *   - BulkResultModal (@o4o/ui) — 결과 표시 + 실패 retry
 *   - BaseDetailDrawer (@o4o/ui) — 행 클릭 시 상세 + 단건 가져가기
 *
 * 권한: store_owner (HubGuard + verifyOwner backend 검증).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, X, ExternalLink, FileText, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BaseDetailDrawer, BulkResultModal } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { importOperatorBlog } from '../../api/blogStaff';

const SERVICE_KEY = 'kpa';
const PAGE_LIMIT = 20;

export function HubBlogLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);

  // Selection (canonical Set<string> pattern)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer for row click detail
  const [selectedItem, setSelectedItem] = useState<HubContentItemResponse | null>(null);
  const [singleImporting, setSingleImporting] = useState(false);

  // Batch hook
  const batch = useBatchAction();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // Resolve store slug
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const resolved = await getStoreSlug();
        if (!canceled) {
          setSlug(resolved);
          setSlugResolved(true);
        }
      } catch {
        if (!canceled) {
          setSlug(null);
          setSlugResolved(true);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // Fetch HUB blog list
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: SERVICE_KEY,
        sourceDomain: 'blog',
        page,
        limit: PAGE_LIMIT,
      });
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'HUB 블로그를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  // Single import — 행 클릭 drawer 또는 row action 경로
  const handleSingleImport = useCallback(
    async (item: HubContentItemResponse) => {
      if (!slug) {
        toast.error('매장 정보를 확인할 수 없습니다');
        return;
      }
      setSingleImporting(true);
      try {
        const result = await importOperatorBlog(slug, item.id);
        toast.success(`"${result.title}" 가져오기 완료 — 내 매장 블로그(초안)에 추가되었습니다`);
        setSelectedItem(null);
      } catch (e: any) {
        toast.error(e?.message || '가져오기에 실패했습니다');
      } finally {
        setSingleImporting(false);
      }
    },
    [slug],
  );

  // Bulk import — Promise.allSettled fan-out (HubSignageLibrary 패턴 mirror)
  const batchImportItems = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      if (!slug) {
        return {
          data: {
            results: ids.map((id) => ({ id, status: 'failed' as const, error: '매장 정보 미연결' })),
          },
        };
      }
      const settled = await Promise.allSettled(ids.map((id) => importOperatorBlog(slug, id)));
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        const msg = err?.message || 'Network error';
        return { id, status: 'failed' as const, error: msg };
      });
      const successCount = results.filter((r) => r.status === 'success').length;
      const failCount = results.filter((r) => r.status === 'failed').length;
      if (successCount > 0) toast.success(`${successCount}개 블로그가 내 매장에 추가되었습니다`);
      if (failCount > 0) toast.error(`${failCount}개 블로그 가져오기에 실패했습니다`);
      return { data: { results } };
    },
    [slug],
  );

  const handleBulkImport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!slug) {
      toast.error('매장 정보를 확인할 수 없습니다');
      return;
    }
    const ids = Array.from(selectedIds);
    const result = await batch.executeBatch(batchImportItems, ids);
    if (result.successCount > 0) {
      setSelectedIds(new Set());
    }
  }, [selectedIds, slug, batch, batchImportItems]);

  // ── Columns ───────────────────────────────────────────────────────
  const columns: ListColumnDef<HubContentItemResponse>[] = useMemo(
    () => [
      {
        key: 'title',
        header: '제목',
        sortable: true,
        sortAccessor: (item) => item.title,
        render: (_v, item) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-100 shrink-0 text-slate-400">
              <FileText className="w-3.5 h-3.5" />
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
        sortable: true,
        sortAccessor: (item) => new Date(item.createdAt).getTime(),
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
      {/* Hero */}
      {/* WO-KPA-STORE-HUB-ASSET-CREATE-ACTION-RESTORE-V1:
          플랫폼 자료 "가져가기"와 "내 약국용 직접 글쓰기"를 분리 노출 */}
      <header className="mb-6 pb-5 border-b-2 border-slate-200 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매장 HUB 블로그</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            KPA 운영자가 발행한 블로그를 선택해 내 매장으로 가져가거나(초안 사본),
            내 약국 블로그 글을 직접 작성하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/store/content/blog')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          블로그 글쓰기
        </button>
      </header>

      {/* No store hint */}
      {slugResolved && !slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
          매장 정보가 연결되지 않아 가져가기 기능을 사용할 수 없습니다. 매장 등록 후 다시 시도해 주세요.
        </div>
      )}

      {/* Error */}
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
          {/* ActionBar — 선택 시 노출 */}
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
                  tooltip: '선택한 블로그를 내 매장 블로그(초안)로 일괄 가져갑니다',
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
            data={items}
            rowKey="id"
            loading={isLoading}
            emptyMessage="아직 운영자 게시 블로그가 없습니다"
            tableId="store-hub-blog"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setSelectedItem(row)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
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

      {/* Footer hint — 내 매장 블로그 진입 */}
      {slug && items.length > 0 && (
        <div className="flex items-start gap-3 mt-8 p-5 bg-blue-50/60 border border-blue-100 rounded-xl text-sm text-slate-600 leading-relaxed">
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            가져온 블로그는{' '}
            <button
              onClick={() => navigate('/store/content/blog')}
              className="text-blue-600 hover:underline font-medium"
            >
              내 매장 블로그
            </button>{' '}
            에서 수정·발행할 수 있습니다.
          </span>
        </div>
      )}

      {/* Row Click Detail Drawer */}
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

export default HubBlogLibraryPage;
