/**
 * ForeignVisitorAffiliatePublicLandingPage — 제휴 QR 랜딩 (public, 인증 없음)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#79)
 *
 *   /foreign-visitor/affiliate/:shortCode
 *
 * 파트너 QR payload = https://pharmacyhub.co.kr/foreign-visitor/affiliate/{shortCode}
 * (origin 은 서버의 PUBLIC_WEB_ORIGIN_BY_SERVICE 가 결정한다). 이 화면이 없으면
 * 매장이 인쇄한 QR 이 아무 데도 닿지 못하므로 QR 관리와 **같은 WO 에서 함께** 연다.
 *
 * KPA 원본은 여기서 매장 공개 storefront(/store/{slug})로 이어주지만,
 * Pharmacy-Hub 에는 매장 slug 단위 공개 storefront 화면이 없다.
 * 없는 경로를 링크로 노출하지 않는다(dead navigation 금지) — 대신 매장 안내 문구만 보여준다.
 * 다국어 상품 안내(#76)는 상품별 publicKey QR(/multilingual-products/{publicKey})로 따로 스캔된다.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolveAffiliate, type AffiliateResolve } from '../../lib/api/pharmacyHubForeignVisitorAffiliate';

export default function ForeignVisitorAffiliatePublicLandingPage() {
  const { shortCode = '' } = useParams<{ shortCode: string }>();
  const [data, setData] = useState<AffiliateResolve | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    resolveAffiliate(shortCode)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  const storeName = data?.storeName || '매장';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">Pharmacy-Hub</p>
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
              {storeName} 의 외국인 고객 안내 페이지입니다.
              <br />
              매장에 비치된 상품별 QR 을 스캔하시면 다국어 상품 안내를 보실 수 있습니다.
            </p>
            {data.campaignName && <p className="text-xs text-slate-400 mt-3">{data.campaignName}</p>}
            <p className="mt-6 text-xs text-slate-400">
              자세한 안내는 매장 직원에게 문의해 주세요.
              <br />
              Please ask our staff for assistance.
            </p>
          </div>
        )}
      </main>

      <footer className="px-5 py-6 text-center text-[11px] text-slate-400">
        문의는 매장에 직접 문의해 주세요 · Pharmacy-Hub
      </footer>
    </div>
  );
}
