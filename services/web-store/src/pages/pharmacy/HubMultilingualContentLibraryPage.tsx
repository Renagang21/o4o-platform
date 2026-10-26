/**
 * HubMultilingualContentLibraryPage — 제공 자료 다국어 상품 콘텐츠 진열 + 가져오기(=복사)
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 매장 경영자(store-owner)가 KPA HUB 에 게시된 운영자 발행 다국어 상품 콘텐츠를 보고,
 * "가져오기" 로 내 약국 상품(취급 상품=local / O4O 주문 가능 상품=listing)에 연결한다.
 * 가져오면 내 약국 콘텐츠로 복사되어 이후 원본과 분리된다.
 *
 * 데이터 흐름:
 *   - 제공 자료 목록: listMlcHub()  → GET /pharmacy/multilingual-product-contents/hub
 *   - 가져오기: importMlcFromHub({ sourceGroupId, targetKind, targetId })
 *               → POST /pharmacy/multilingual-product-contents/import
 *
 * 권한: kpa:store_owner (HubGuard + backend store-owner 검증).
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Languages, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { Pagination } from '@o4o/operator-ux-core';
import {
  listMlcHub,
  type StoreMlcHubItem,
} from '../../api/multilingualProductContentStore';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { storeWorkspaceBase } from '../../components/store/StoreWorkflowNavigation';
import { useLatestStoreRequest } from './hooks/useLatestStoreRequest';
import { MultilingualImportDialog } from './multilingual/MultilingualImportDialog';

const PAGE_LIMIT = 20;
const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
};

export function HubMultilingualContentLibraryPage() {
  const scope = useStoreOperationScope();
  return <HubLibrarySession key={scope.key} isCurrent={scope.isCurrent} />;
}

function HubLibrarySession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = storeWorkspaceBase(pathname);
  const [items, setItems] = useState<StoreMlcHubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import modal
  const [importTarget, setImportTarget] = useState<StoreMlcHubItem | null>(null);
  const requests = useLatestStoreRequest(String(page));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    if (!isCurrent()) return;
    const current = requests.begin();
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMlcHub({ page, limit: PAGE_LIMIT });
      if (!current() || !isCurrent()) return;
      const last = Math.max(1, Math.ceil(res.meta.total / PAGE_LIMIT));
      if (page > last) { setPage(last); return; }
      setItems(res.data);
      setTotal(res.meta?.total ?? 0);
    } catch {
      if (current() && isCurrent()) setError('제공 자료를 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (current() && isCurrent()) setIsLoading(false);
    }
  }, [page, requests, isCurrent]);

  useEffect(() => {
    void loadData();
    return requests.cancel;
  }, [loadData, requests]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">제공 자료 다국어 상품 콘텐츠</h1>
        {/* WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-5): 사본 정책 안내 표준화.
            ⚠ 다른 HUB 자원(POP/QR/동영상/사이니지)과 정책이 다르다 —
            backend import 가 (organization_id, target_kind, target_id, content_key) 기준
            ON CONFLICT DO UPDATE 이므로 **새 사본이 아니라 기존 사본을 덮어쓴다**.
            따라서 "새 사본이 생성됩니다" 문구를 쓰지 않는다. */}
        <p className="mt-1.5 text-sm text-slate-500">
          외국인 고객에게 QR 또는 타블렛으로 보여줄 수 있는 다국어 상품 안내 자료입니다.
          가져온 자료는 내 매장의 독립 사본으로 저장되어 이후 원본과 분리됩니다.
          같은 상품에 다시 가져오면 새 사본이 생기지 않고 기존 사본이 원본의 최신 내용으로 덮어쓰기 됩니다.
        </p>
        <button onClick={() => navigate(`${base}/library/multilingual-product-contents/my`)} className="mt-3 min-h-11 text-sm text-blue-700 underline">내 매장 다국어 콘텐츠 확인</button>
      </header>

      {error && (
        <div className="text-center py-16 text-red-600 text-sm">
          <p>{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50">
            다시 시도
          </button>
        </div>
      )}

      {!error && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">아직 운영자가 발행한 다국어 상품 콘텐츠가 없습니다</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 shrink-0">
                      <Languages className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm truncate">{item.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description || ' '}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.locales.map((l) => (
                      <span key={l} className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded border bg-slate-50 border-slate-200 text-slate-600">
                        {LOCALE_LABELS[l] || l}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <span className="text-[11px] text-slate-400">지원 언어 {item.localeCount}개</span>
                    <button
                      onClick={() => setImportTarget(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      가져오기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-2): 수제 이전/다음 → 표준 Pagination */}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />
          )}
        </>
      )}

      {importTarget && <MultilingualImportDialog key={importTarget.id} item={importTarget} isCurrent={isCurrent}
        onClose={() => setImportTarget(null)} onImported={group => {
          toast.success('내 매장 콘텐츠로 가져왔습니다.');
          navigate(`${base}/library/multilingual-product-contents/my?groupId=${encodeURIComponent(group.id)}`);
        }} />}

    </div>
  );
}

export default HubMultilingualContentLibraryPage;
