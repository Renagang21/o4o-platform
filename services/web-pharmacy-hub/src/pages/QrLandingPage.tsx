/**
 * QrLandingPage — 공개 QR 랜딩 (`/qr/:slug`, 인증 없음)
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 A)
 *
 * 매장이 만든 QR 의 payload 는 `https://pharmacyhub.co.kr/qr/{slug}` 다.
 * 이 화면이 없으면 매장에서 인쇄한 QR 을 스캔했을 때 아무 데도 닿지 못한다 —
 * QR 관리 화면과 **같은 WO 에서 함께** 열어야 하는 이유다.
 *
 * 스캔 이벤트는 서버가 이 조회로 기록한다(프론트가 별도 추적 호출을 하지 않는다).
 * 소비자용 화면이므로 매장 셸(사이드바·관리 메뉴)을 씌우지 않는다.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ContentRenderer, hasStoreDescriptionMarkup } from '@o4o/content-editor';
import { fetchPublicQrLanding, type PublicQrLanding } from '../lib/api/pharmacyHubStoreQr';

export default function QrLandingPage() {
  const { slug = '' } = useParams();
  const [landing, setLanding] = useState<PublicQrLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetchPublicQrLanding(slug)
      .then((d) => {
        if (cancelled) return;
        setLanding(d);
        setError(null);
        // 외부 링크 QR 은 랜딩을 보여줄 것이 없다 — 스캔 기록 후 목적지로 보낸다.
        if (d.landingType === 'link' && d.landingTargetId) {
          window.location.replace(d.landingTargetId);
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '이 QR 은 현재 사용할 수 없습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <Shell><p className="text-sm text-gray-500">불러오는 중…</p></Shell>;
  }

  if (error || !landing) {
    return (
      <Shell>
        <p className="text-base font-medium text-gray-800">이 QR 은 현재 사용할 수 없습니다.</p>
        <p className="mt-2 text-sm text-gray-500">
          {error || '매장에서 새로 안내받은 QR 을 이용해 주세요.'}
        </p>
      </Shell>
    );
  }

  const page = landing.pageContent;
  const product = landing.productDetails;

  return (
    <Shell>
      <h1 className="text-lg font-bold text-gray-900">{page?.title || landing.title}</h1>
      {landing.description && <p className="mt-1 text-sm text-gray-500">{landing.description}</p>}

      {page?.body ? (
        <div className="mt-4">
          <ContentRenderer
            html={page.body}
            variant={hasStoreDescriptionMarkup(page.body) ? 'store-description' : 'product-detail'}
          />
        </div>
      ) : product ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-base font-semibold text-gray-900">{product.name}</p>
          {product.brandName && <p className="mt-1 text-sm text-gray-500">{product.brandName}</p>}
          {product.description && <p className="mt-3 text-sm text-gray-700">{product.description}</p>}
        </div>
      ) : landing.landingType === 'link' ? (
        <p className="mt-4 text-sm text-gray-500">연결된 주소로 이동하고 있습니다…</p>
      ) : (
        <p className="mt-4 text-sm text-gray-500">표시할 내용이 아직 준비되지 않았습니다.</p>
      )}

      {landing.consultationCtaEnabled && (
        <p className="mt-6 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {landing.consultationCtaLabel || '자세한 내용은 매장 약사에게 문의해 주세요.'}
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}
