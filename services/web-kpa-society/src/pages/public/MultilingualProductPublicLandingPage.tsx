/**
 * MultilingualProductPublicLandingPage — 외국인 고객용 다국어 상품 안내 (public/QR landing)
 *
 * WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
 *
 * 매장이 가져온(=복사한) store-scoped 다국어 콘텐츠를 인증 없이 QR/URL 로 열람하는 모바일 우선 화면.
 *   /multilingual-products/:publicKey?locale=en
 *
 * - 매장 사본(store copy)의 published page 만 노출 (운영자 원본 비참조).
 * - 요청 locale 없으면 fallback(en → defaultLocale → ko).
 * - 인증/Layout/Guard 없음 (App.tsx 의 public route 로 직접 마운트).
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { sanitizeRichHtml } from '@o4o/content-editor';
import {
  resolvePublicMlc,
  type PublicMlcResolve,
  type StoreMlcLocale,
} from '../../api/multilingualProductContentStore';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa',
};

function PageBody({ page }: { page: NonNullable<PublicMlcResolve['page']> }) {
  const format = page.contentFormat;

  if (format === 'html') {
    const html = typeof (page.content as any)?.html === 'string' ? (page.content as any).html : '';
    if (!html.trim()) return <p className="text-slate-400 text-sm">{page.summary || ''}</p>;
    return (
      <div
        className="prose prose-slate max-w-none text-[15px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
      />
    );
  }

  if (format === 'image_sequence') {
    const images = (page.assets || [])
      .map((a) => (typeof (a as any)?.url === 'string' ? (a as any).url : null))
      .filter(Boolean) as string[];
    if (images.length === 0) return <p className="text-slate-400 text-sm">{page.summary || ''}</p>;
    return (
      <div className="space-y-3">
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full rounded-lg" loading="lazy" />
        ))}
      </div>
    );
  }

  // blocks / json 등 V1 미지원 포맷 → summary fallback + 안내
  return (
    <div className="space-y-2">
      {page.summary && <p className="text-[15px] leading-relaxed text-slate-700">{page.summary}</p>}
      <p className="text-xs text-slate-400">
        이 안내는 현재 형식으로 표시할 수 없습니다. 매장에 문의해 주세요.
      </p>
    </div>
  );
}

export function MultilingualProductPublicLandingPage() {
  const { publicKey = '' } = useParams<{ publicKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const localeParam = searchParams.get('locale') as StoreMlcLocale | null;

  const [data, setData] = useState<PublicMlcResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async (loc?: StoreMlcLocale) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await resolvePublicMlc(publicKey, loc || undefined);
      setData(res);
    } catch (e: any) {
      setData(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    load(localeParam || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, localeParam]);

  const switchLocale = (loc: StoreMlcLocale) => {
    setSearchParams({ locale: loc }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">KPA-Society</p>
        <h1 className="text-base font-bold text-slate-900 mt-0.5">
          {data?.title || (loading ? ' ' : '다국어 상품 안내')}
        </h1>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-6">
        {loading ? (
          <div className="py-24 text-center text-slate-300 text-sm">Loading…</div>
        ) : notFound || !data ? (
          <div className="py-24 text-center">
            <p className="text-slate-500 text-sm">안내 콘텐츠를 찾을 수 없습니다.</p>
            <p className="text-slate-400 text-xs mt-1">This guide is not available.</p>
          </div>
        ) : (
          <>
            {/* 언어 선택 */}
            {data.availableLocales.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {data.availableLocales.map((loc) => {
                  const active = (data.resolvedLocale || data.defaultLocale) === loc;
                  return (
                    <button
                      key={loc}
                      onClick={() => switchLocale(loc)}
                      className={`px-3 py-1.5 text-xs rounded-full border ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {LOCALE_LABELS[loc] || loc}
                    </button>
                  );
                })}
              </div>
            )}

            {data.fallbackUsed && data.requestedLocale && (
              <p className="text-[11px] text-amber-600 mb-3">
                요청하신 언어 콘텐츠가 없어 다른 언어로 표시합니다.
              </p>
            )}

            {data.page ? (
              <article className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">{data.page.title}</h2>
                <PageBody page={data.page} />
              </article>
            ) : (
              <div className="py-20 text-center text-slate-400 text-sm">
                표시할 안내가 없습니다.
              </div>
            )}
          </>
        )}
      </main>

      <footer className="px-5 py-6 text-center text-[11px] text-slate-400">
        문의는 매장에 직접 문의해 주세요 · KPA-Society
      </footer>
    </div>
  );
}

export default MultilingualProductPublicLandingPage;
