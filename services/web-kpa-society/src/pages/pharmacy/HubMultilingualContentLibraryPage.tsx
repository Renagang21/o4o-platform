/**
 * HubMultilingualContentLibraryPage — 매장 HUB 다국어 상품 콘텐츠 진열 + 가져오기(=복사)
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 매장 경영자(store-owner)가 KPA HUB 에 게시된 운영자 발행 다국어 상품 콘텐츠를 보고,
 * "가져오기" 로 내 매장 상품(취급 상품=local / O4O 주문 가능 상품=listing)에 연결한다.
 * 가져오면 내 매장 콘텐츠로 복사되어 이후 원본과 분리된다.
 *
 * 데이터 흐름:
 *   - HUB 목록: listMlcHub()  → GET /pharmacy/multilingual-product-contents/hub
 *   - 가져오기: importMlcFromHub({ sourceGroupId, targetKind, targetId })
 *               → POST /pharmacy/multilingual-product-contents/import
 *
 * 권한: kpa:store_owner (HubGuard + backend store-owner 검증).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Languages, X, Loader2, Search } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  listMlcHub,
  importMlcFromHub,
  type StoreMlcHubItem,
  type StoreMlcTargetKind,
} from '../../api/multilingualProductContentStore';
import { fetchLocalProducts, type LocalProduct } from '../../api/localProducts';
import { getListings, type ProductListing } from '../../api/pharmacyProducts';

const PAGE_LIMIT = 20;
const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
};

interface TargetOption {
  kind: StoreMlcTargetKind;
  id: string;
  name: string;
}

export function HubMultilingualContentLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreMlcHubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import modal
  const [importTarget, setImportTarget] = useState<StoreMlcHubItem | null>(null);
  const [targetKind, setTargetKind] = useState<StoreMlcTargetKind>('local');
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [importing, setImporting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMlcHub({ page, limit: PAGE_LIMIT });
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'HUB 다국어 콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load store products for the selected target kind when the modal is open.
  const loadTargets = useCallback(async (kind: StoreMlcTargetKind) => {
    setTargetsLoading(true);
    setSelectedTargetId('');
    try {
      if (kind === 'local') {
        const res = await fetchLocalProducts({ limit: 100, activeOnly: 'true' });
        setTargetOptions((res.items as LocalProduct[]).map((p) => ({ kind, id: p.id, name: p.name })));
      } else {
        const res = await getListings({ service_key: 'kpa' });
        setTargetOptions((res.data as ProductListing[]).map((p) => ({ kind, id: p.id, name: p.product_name })));
      }
    } catch (e: any) {
      toast.error(e?.message || '매장 상품 목록을 불러올 수 없습니다');
      setTargetOptions([]);
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  const openImport = (item: StoreMlcHubItem) => {
    setImportTarget(item);
    setTargetKind('local');
    setTargetOptions([]);
    setSelectedTargetId('');
    loadTargets('local');
  };

  const handleChangeKind = (kind: StoreMlcTargetKind) => {
    setTargetKind(kind);
    loadTargets(kind);
  };

  const handleImport = async () => {
    if (!importTarget || !selectedTargetId) {
      toast.error('연결할 매장 상품을 선택하세요');
      return;
    }
    setImporting(true);
    try {
      const group = await importMlcFromHub({
        sourceGroupId: importTarget.id,
        targetKind,
        targetId: selectedTargetId,
      });
      toast.success(`"${importTarget.title}" 가져오기 완료 — 내 매장 콘텐츠(초안)에 복사되었습니다`);
      setImportTarget(null);
      navigate(`/store-hub/multilingual-product-contents/my?groupId=${group.id}`);
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6 pb-5 border-b-2 border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">매장 HUB 다국어 상품 콘텐츠</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          외국인 고객에게 QR 또는 타블렛으로 보여줄 수 있는 다국어 상품 안내 자료입니다.
          가져오면 내 매장 콘텐츠로 복사되어 이후 원본과 분리됩니다.
        </p>
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
                      onClick={() => openImport(item)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">이전</button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50">다음</button>
            </div>
          )}
        </>
      )}

      {/* Import target-selection modal */}
      {importTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !importing && setImportTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">가져오기 — 매장 상품 연결</h2>
                <p className="text-xs text-slate-500 mt-1">"{importTarget.title}" 을(를) 내 매장 상품에 연결합니다.</p>
              </div>
              <button onClick={() => !importing && setImportTarget(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            {/* Target kind */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">상품 종류</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleChangeKind('local')}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left ${targetKind === 'local' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className="font-medium">매장 취급 상품</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">매장 진열용</div>
                </button>
                <button
                  onClick={() => handleChangeKind('listing')}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left ${targetKind === 'listing' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className="font-medium">O4O 주문 가능 상품</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">진열 상품</div>
                </button>
              </div>
            </div>

            {/* Target select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">연결할 상품</label>
              {targetsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-3"><Loader2 className="w-4 h-4 animate-spin" /> 상품 불러오는 중…</div>
              ) : targetOptions.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <Search className="w-4 h-4 shrink-0" />
                  연결 가능한 {targetKind === 'local' ? '매장 취급 상품' : 'O4O 주문 가능 상품'}이 없습니다.
                </div>
              ) : (
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">상품을 선택하세요</option>
                  {targetOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setImportTarget(null)} disabled={importing} className="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50">취소</button>
              <button
                onClick={handleImport}
                disabled={importing || !selectedTargetId}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                가져오기 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HubMultilingualContentLibraryPage;
