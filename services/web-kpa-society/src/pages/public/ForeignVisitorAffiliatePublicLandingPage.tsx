/**
 * ForeignVisitorAffiliatePublicLandingPage — 외국인 관광객 제휴 QR 랜딩 (public/QR landing)
 *
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1
 *
 * 제휴마케팅 QR(shortCode) 스캔 시 진입하는 인증 없는 모바일 우선 화면.
 *   /foreign-visitor/affiliate/:shortCode
 *
 * - shortCode → store 식별(공개 안전 필드). partnerId/내부 id 미노출.
 * - 기존 매장 다국어 안내(store public landing)로 연결(storeSlug 있을 때).
 * - 결제 버튼 없음 · scan event 미기록(V1 no-op) · 인증/Layout/Guard 없음.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolveAffiliate, type AffiliateResolve } from '../../api/foreignVisitorAffiliate';

export function ForeignVisitorAffiliatePublicLandingPage() {
  const { shortCode = '' } = useParams<{ shortCode: string }>();
  const [data, setData] = useState<AffiliateResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    resolveAffiliate(shortCode)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) { setData(null); setNotFound(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shortCode]);

  const storeName = data?.storeName || '매장';
  const storeHref = data?.storeSlug ? `/store/${encodeURIComponent(data.storeSlug)}` : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">KPA-Society</p>
        <h1 className="text-base font-bold text-slate-900 mt-0.5">
          {loading ? ' ' : notFound ? '안내' : storeName}
        </h1>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-8">
        {loading ? (
          <div className="py-24 text-center text-slate-300 text-sm">Loading…</div>
        ) : notFound || !data ? (
          <div className="py-24 text-center">
            <p className="text-slate-500 text-sm">안내를 찾을 수 없습니다.</p>
            <p className="text-slate-400 text-xs mt-1">This guide is not available.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <div className="text-3xl mb-3">🛍️</div>
            <h2 className="text-lg font-semibold text-slate-900">환영합니다</h2>
            <p className="text-sm text-slate-500 mt-1">Welcome · ようこそ · 欢迎</p>
            <p className="text-sm text-slate-600 leading-relaxed mt-4">
              {storeName} 의 외국인 고객 안내 페이지입니다.<br />
              다국어 상품 안내와 매장 정보를 확인하실 수 있습니다.
            </p>
            {data.campaignName && (
              <p className="text-xs text-slate-400 mt-3">{data.campaignName}</p>
            )}

            {storeHref ? (
              <a
                href={storeHref}
                className="mt-6 inline-block w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
              >
                매장 안내 보기 · View store guide
              </a>
            ) : (
              <p className="mt-6 text-xs text-slate-400">
                자세한 안내는 매장 직원에게 문의해 주세요.<br />Please ask our staff for assistance.
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="px-5 py-6 text-center text-[11px] text-slate-400">
        문의는 매장에 직접 문의해 주세요 · KPA-Society
      </footer>
    </div>
  );
}

export default ForeignVisitorAffiliatePublicLandingPage;
