/**
 * PaymentSuccessPage — Toss 결제 성공 후 리다이렉트 페이지
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * 경로: /store/:slug/payment/success?orderId=...&paymentKey=...&paymentId=...&amount=...
 *
 * Toss SDK가 successUrl로 리다이렉트 → 여기서 confirm API 호출 → 완료 표시
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import * as cartService from '../../services/cartService';
import { clearReferralCookie } from '../../utils/referral';

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa`;
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken') || localStorage.getItem('access_token');
}

export function PaymentSuccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState(true);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    if (!paymentKey || !orderId || !paymentId) {
      // No payment params — just show success (already confirmed)
      setConfirming(false);
      if (slug) cartService.clearCart(slug);
      clearReferralCookie();
      return;
    }

    const confirmPayment = async () => {
      try {
        const res = await fetch(`${getApiBase()}/payments/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ paymentId, paymentKey, orderId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || '결제 확인에 실패했습니다');

        setOrderNumber(json.data?.orderNumber || null);
        if (slug) cartService.clearCart(slug);
      clearReferralCookie();
      } catch (err: any) {
        setError(err.message || '결제 확인 중 오류가 발생했습니다');
      } finally {
        setConfirming(false);
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, paymentId, slug]);

  if (confirming) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} color="#2563eb" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', color: '#64748b' }}>결제를 확인하고 있습니다...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😟</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>결제 확인 실패</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
          <Link
            to={`/store/${slug}`}
            style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}
          >
            매장으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <CheckCircle size={56} color="#059669" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>주문이 완료되었습니다</h2>
        {orderNumber && (
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
            주문번호: <strong style={{ color: '#0f172a' }}>{orderNumber}</strong>
          </p>
        )}
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>감사합니다. 주문이 정상적으로 접수되었습니다.</p>

        <Link
          to={`/store/${slug}`}
          style={{ display: 'inline-block', padding: '14px 32px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: 600 }}
        >
          매장 홈으로
        </Link>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
