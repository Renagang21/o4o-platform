/**
 * CheckoutPage — KPA Storefront (매장 현장 결제 안내)
 *
 * WO-O4O-STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL-V1
 *   상위: IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1
 *
 * 정책: 소비자 → 매장 상품 구매 결제는 O4O 대상이 아니다(STORE_SALE_PAYMENT 제외).
 *   각 매장의 POS/카드/현금/간편결제로 처리하며, O4O 에는 소비자→매장 결제 경로가 존재하지 않는다.
 *
 * 본 WO(frontend-only): 기존 storefront checkout → O4O PaymentCore/Toss 진입을 제거하고,
 *   "매장에서 직접 결제" 안내로 대체한다. 백엔드 payments prepare/confirm 차단은 후속
 *   WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1 에서 수행한다.
 *
 * 경로: /store/:slug/checkout (라우트 유지 — 직접 접근 시 안내 표시)
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Info } from 'lucide-react';

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/store/${slug ?? ''}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '15px', fontWeight: 600, padding: 0 }}
          >
            <ArrowLeft size={20} />
            매장으로
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        <section style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px 20px', marginTop: '24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Store size={28} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
            상품 결제는 매장에서 진행해 주세요
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, marginBottom: '20px' }}>
            온라인 상품 결제는 제공되지 않습니다.<br />
            상품 구매·결제는 매장에서 직접(카드·현금·간편결제) 진행해 주세요.
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px 14px', marginBottom: '24px' }}>
            <Info size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              매장 상품 정보·소개는 계속 확인하실 수 있습니다. 구매를 원하시면 매장으로 문의해 주세요.
            </p>
          </div>

          <button
            onClick={() => navigate(`/store/${slug ?? ''}`)}
            style={{
              width: '100%', height: '52px', borderRadius: '12px', border: 'none',
              backgroundColor: '#2563eb', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            매장으로 돌아가기
          </button>
        </section>
      </main>
    </div>
  );
}

export default CheckoutPage;
