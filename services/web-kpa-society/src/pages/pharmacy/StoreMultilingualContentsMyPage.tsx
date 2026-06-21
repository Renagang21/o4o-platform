/**
 * StoreMultilingualContentsMyPage — 내 매장 다국어 상품 콘텐츠 + resolve 검증
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 매장 경영자가 가져온(=복사된) store-scoped 다국어 상품 콘텐츠를 확인하고,
 * 언어 fallback resolve 를 직접 검증한다.
 *   /store-hub/multilingual-product-contents/my
 *
 * 권한: kpa:store_owner (HubGuard + backend store-owner 검증).
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, Loader2, ArrowLeft, FlaskConical } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  listMyMlcGroups,
  resolveMlc,
  type StoreMlcGroup,
  type StoreMlcLocale,
} from '../../api/multilingualProductContentStore';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
};
const TARGET_LABEL: Record<string, string> = { local: '매장 취급 상품', listing: 'O4O 주문 가능 상품' };
const RESOLVE_LOCALES: StoreMlcLocale[] = ['en', 'zh', 'ja'];

export function StoreMultilingualContentsMyPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StoreMlcGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{ groupId: string; locale: string; resolvedLocale: string; fallbackReason: string | null } | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMyMlcGroups({ includeArchived: false });
      setGroups(data ?? []);
    } catch (e: any) {
      setError(e?.message || '내 매장 다국어 콘텐츠를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (groupId: string, locale: StoreMlcLocale) => {
    setResolving(`${groupId}:${locale}`);
    setResolveResult(null);
    try {
      const res = await resolveMlc(groupId, locale);
      const page = res.page || {};
      setResolveResult({
        groupId,
        locale,
        resolvedLocale: page.resolvedLocale || page.locale || '-',
        fallbackReason: page.fallbackReason ?? null,
      });
      toast.success(`resolve(${locale}) → ${page.resolvedLocale || page.locale || '없음'}`);
    } catch (e: any) {
      toast.error(e?.message || `resolve(${locale}) 실패`);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <header className="flex items-center gap-3 pb-5 border-b-2 border-slate-200">
        <button onClick={() => navigate('/store-hub/multilingual-product-contents')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="HUB 목록">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">내 매장 다국어 상품 콘텐츠</h1>
          <p className="mt-1 text-sm text-slate-500">가져온 다국어 콘텐츠와 연결 상품을 확인하고 언어 fallback 을 검증합니다.</p>
        </div>
      </header>

      {error && (
        <div className="text-center py-12 text-red-600 text-sm">
          <p>{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-1.5 text-xs text-blue-600 border border-blue-400 rounded-lg hover:bg-blue-50">다시 시도</button>
        </div>
      )}

      {!error && (
        isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            아직 가져온 다국어 콘텐츠가 없습니다.
            <button onClick={() => navigate('/store-hub/multilingual-product-contents')} className="ml-1 text-blue-600 hover:underline">HUB 에서 가져오기</button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const locales = (g.pages || []).map((p) => p.locale);
              return (
                <div key={g.id} className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 shrink-0"><Languages className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 text-sm">{g.title}</h3>
                        {g.sourceType === 'operator_hub' && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border bg-blue-50 border-blue-200 text-blue-700">운영자 자료 복사</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        연결: <span className="text-slate-700">{TARGET_LABEL[g.targetKind] || g.targetKind}</span>
                        <span className="text-slate-300 mx-1">·</span>
                        기본 언어 {LOCALE_LABELS[g.defaultLocale] || g.defaultLocale}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {locales.map((l) => (
                          <span key={l} className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded border bg-slate-50 border-slate-200 text-slate-600">{LOCALE_LABELS[l] || l}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resolve 검증 */}
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400"><FlaskConical className="w-3.5 h-3.5" /> resolve 검증:</span>
                    {RESOLVE_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => handleResolve(g.id, loc)}
                        disabled={resolving === `${g.id}:${loc}`}
                        className="px-2.5 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {resolving === `${g.id}:${loc}` ? '…' : loc}
                      </button>
                    ))}
                    {resolveResult && resolveResult.groupId === g.id && (
                      <span className="text-xs text-slate-600 ml-1">
                        요청 <b>{resolveResult.locale}</b> → 응답 <b className="text-blue-600">{resolveResult.resolvedLocale}</b>
                        {resolveResult.fallbackReason && <span className="text-amber-600"> (fallback)</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default StoreMultilingualContentsMyPage;
