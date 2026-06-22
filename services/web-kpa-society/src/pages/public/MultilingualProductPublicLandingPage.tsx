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

function PageBody({ page, large = false }: { page: NonNullable<PublicMlcResolve['page']>; large?: boolean }) {
  const format = page.contentFormat;
  const proseCls = large
    ? 'prose prose-slate prose-lg max-w-none text-lg leading-relaxed'
    : 'prose prose-slate max-w-none text-[15px] leading-relaxed';
  const summaryCls = large ? 'text-slate-400 text-lg' : 'text-slate-400 text-sm';

  if (format === 'html') {
    const html = typeof (page.content as any)?.html === 'string' ? (page.content as any).html : '';
    if (!html.trim()) return <p className={summaryCls}>{page.summary || ''}</p>;
    return (
      <div
        className={proseCls}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
      />
    );
  }

  if (format === 'image_sequence') {
    const images = (page.assets || [])
      .map((a) => (typeof (a as any)?.url === 'string' ? (a as any).url : null))
      .filter(Boolean) as string[];
    if (images.length === 0) return <p className={summaryCls}>{page.summary || ''}</p>;
    return (
      <div className={large ? 'space-y-5' : 'space-y-3'}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full rounded-lg" loading="lazy" />
        ))}
      </div>
    );
  }

  // blocks / json 등 V1 미지원 포맷 → summary fallback + 안내
  return (
    <div className="space-y-2">
      {page.summary && <p className={large ? 'text-lg leading-relaxed text-slate-700' : 'text-[15px] leading-relaxed text-slate-700'}>{page.summary}</p>}
      <p className={large ? 'text-sm text-slate-400' : 'text-xs text-slate-400'}>
        지원하지 않는 콘텐츠 형식입니다. 매장 직원에게 문의해 주세요.
      </p>
    </div>
  );
}

/** CTA 버튼 (page.buttons: {label,url}) — tablet 본문 하단. */
function CtaButtons({ buttons, large = false }: { buttons: Array<Record<string, unknown>>; large?: boolean }) {
  const items = (buttons || [])
    .map((b) => ({
      label: typeof (b as any)?.label === 'string' ? ((b as any).label as string) : '',
      url: typeof (b as any)?.url === 'string' ? ((b as any).url as string) : '',
    }))
    .filter((b) => b.label && b.url);
  if (items.length === 0) return null;
  return (
    <div className={large ? 'flex flex-col gap-3 mt-7' : 'flex flex-col gap-2 mt-4'}>
      {items.map((b, i) => (
        <a
          key={i}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            large
              ? 'block text-center px-6 py-4 min-h-[56px] text-lg font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800'
              : 'block text-center px-4 py-2.5 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800'
          }
        >
          {b.label}
        </a>
      ))}
    </div>
  );
}

export function MultilingualProductPublicLandingPage() {
  const { publicKey = '' } = useParams<{ publicKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const localeParam = searchParams.get('locale') as StoreMlcLocale | null;
  // WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1: 같은 publicKey/resolve 재사용, 렌더링 모드만 분리
  const isTablet = searchParams.get('mode') === 'tablet';

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
    const next: Record<string, string> = { locale: loc };
    if (isTablet) next.mode = 'tablet';
    setSearchParams(next, { replace: true });
  };

  // ── 태블릿 표시 모드 (매장 응대용 큰 화면 / 터치 친화) ──
  if (isTablet) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">KPA-Society</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                {data?.title || (loading ? ' ' : '다국어 상품 안내')}
              </h1>
            </div>
            {/* 언어 선택 — 큰 터치 버튼 */}
            {data && data.availableLocales.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {data.availableLocales.map((loc) => {
                  const active = (data.resolvedLocale || data.defaultLocale) === loc;
                  return (
                    <button
                      key={loc}
                      onClick={() => switchLocale(loc)}
                      className={`min-h-[44px] px-5 py-2.5 text-base rounded-xl border ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {LOCALE_LABELS[loc] || loc}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-6 sm:px-8 py-8">
          {loading ? (
            <div className="py-32 text-center text-slate-300 text-lg">Loading…</div>
          ) : notFound || !data ? (
            <div className="py-32 text-center">
              <p className="text-slate-500 text-lg">안내 콘텐츠를 찾을 수 없습니다.</p>
              <p className="text-slate-400 text-base mt-2">This guide is not available.</p>
            </div>
          ) : (
            <>
              {data.fallbackUsed && data.requestedLocale && (
                <p className="text-sm text-amber-600 mb-4">
                  선택한 언어의 콘텐츠가 없어 대체 언어로 표시 중입니다.
                </p>
              )}
              {data.page ? (
                <article className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-5">{data.page.title}</h2>
                  {data.page.summary && (
                    <p className="text-lg text-slate-600 leading-relaxed mb-5">{data.page.summary}</p>
                  )}
                  <PageBody page={data.page} large />
                  <CtaButtons buttons={data.page.buttons || []} large />
                </article>
              ) : (
                <div className="py-24 text-center text-slate-400 text-lg">표시할 안내가 없습니다.</div>
              )}
            </>
          )}
        </main>

        <footer className="px-8 py-8 text-center">
          <p className="text-lg font-medium text-slate-600">매장 직원에게 문의해 주세요.</p>
          <p className="text-sm text-slate-400 mt-1">Please ask our staff for assistance. · KPA-Society</p>
        </footer>
      </div>
    );
  }

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
