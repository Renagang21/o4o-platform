/**
 * MultilingualContentsMyPage — 내 매장 다국어 상품 콘텐츠 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#76)
 *
 *   /store-owner/multilingual-product-contents
 *
 * 매장이 저작한 store-scoped 다국어 콘텐츠 목록 + 언어 fallback 확인.
 * 원장·계약은 KPA / GlycoPharm / K-Cosmetics 와 동일한 공통 controller 다.
 * PH 는 매장허브 운영자 원본이 없어(#85·#86) "HUB 에서 가져오기" 진입을 만들지 않는다.
 * 새 콘텐츠는 상품 화면에서 시작한다 — 존재하지 않는 경로를 CTA 로 노출하지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, Loader2, FlaskConical } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  listMyMlcGroups,
  resolveMlc,
  MLC_LOCALE_LABELS,
  type MlcGroup,
  type MlcLocale,
} from '../../lib/api/pharmacyHubMultilingualContents';

const TARGET_LABEL: Record<string, string> = {
  local: '매장 자체 상품',
  listing: '매장 경영활용 제품',
};
const RESOLVE_LOCALES: MlcLocale[] = ['en', 'zh', 'ja'];

export default function MultilingualContentsMyPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<MlcGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<{
    groupId: string;
    locale: string;
    resolvedLocale: string;
    fallbackReason: string | null;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGroups((await listMyMlcGroups({ includeArchived: false })) ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '다국어 콘텐츠를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (groupId: string, locale: MlcLocale) => {
    setResolving(`${groupId}:${locale}`);
    setResolveResult(null);
    try {
      const res = await resolveMlc(groupId, locale);
      const page: any = res.page || {};
      setResolveResult({
        groupId,
        locale,
        resolvedLocale: page.resolvedLocale || page.locale || '-',
        fallbackReason: page.fallbackReason ?? null,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || `언어 확인(${locale})에 실패했습니다`);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">다국어 상품 콘텐츠</h1>
        <p className="mt-1 text-sm text-slate-500">
          외국인 고객에게 보여줄 상품 안내를 언어별로 작성합니다. 상품 하나에 QR 하나 — 스캔하면 언어 탭으로 열립니다.
        </p>
      </header>

      {error && (
        <div className="py-12 text-center text-sm text-red-600">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg border border-blue-400 px-4 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {!error &&
        (isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">아직 작성한 다국어 콘텐츠가 없습니다.</p>
            <p className="mt-2 text-sm text-slate-400">
              상품 목록에서 상품을 고른 뒤 <b>다국어 안내</b> 로 시작하세요.
            </p>
            <button
              onClick={() => navigate('/store-owner/local-products')}
              className="mt-4 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              매장 자체 상품으로 이동
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const locales = (g.pages || []).map((p) => p.locale);
              const publishedCount = (g.pages || []).filter((p) => p.status === 'published').length;
              return (
                <div key={g.id} className="rounded-xl border border-slate-100 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                      <Languages className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                            publishedCount > 0
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {publishedCount > 0 ? `${publishedCount}개 언어 발행됨` : '초안'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        연결: <span className="text-slate-700">{TARGET_LABEL[g.targetKind] || g.targetKind}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        기본 언어 {MLC_LOCALE_LABELS[g.defaultLocale] || g.defaultLocale}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {locales.map((l) => (
                          <span
                            key={l}
                            className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
                          >
                            {MLC_LOCALE_LABELS[l] || l}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        navigate(
                          `/store-owner/products/multilingual/${g.targetKind}/${encodeURIComponent(g.targetId)}`,
                        )
                      }
                      className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      편집
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <FlaskConical className="h-3.5 w-3.5" /> 언어 확인:
                    </span>
                    {RESOLVE_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => handleResolve(g.id, loc)}
                        disabled={resolving === `${g.id}:${loc}`}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {resolving === `${g.id}:${loc}` ? '…' : loc}
                      </button>
                    ))}
                    {resolveResult && resolveResult.groupId === g.id && (
                      <span className="ml-1 text-xs text-slate-600">
                        요청 <b>{resolveResult.locale}</b> → 표시{' '}
                        <b className="text-blue-600">{resolveResult.resolvedLocale}</b>
                        {resolveResult.fallbackReason && <span className="text-amber-600"> (대체 언어)</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
