/**
 * CheckoutPage — KPA Storefront Checkout + Payment
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * 경로: /store/:slug/checkout
 * 인증 필요 — 로그인 안 되어있으면 안내
 *
 * 흐름: Cart 확인 → 주문 생성 → Toss 결제
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Truck, Store } from 'lucide-react';
import * as cartService from '../../services/cartService';
import type { CartItem } from '../../services/cartService';
import { getReferralCookie } from '../../utils/referral';

// ============================================================================
// Types
// ============================================================================

interface OrderResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

interface PaymentPrepareResponse {
  paymentId: string;
  transactionId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  clientKey: string;
}

// ============================================================================
// API
// ============================================================================

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/kpa`;
}

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken') || localStorage.getItem('access_token');
}

async function createOrder(
  organizationId: string,
  items: Array<{ productId: string; quantity: number }>,
  deliveryMethod: 'pickup' | 'delivery',
  shippingAddress?: Record<string, string>,
  referral?: { referrerId: string; referrerType: string },
): Promise<OrderResponse> {
  const body: Record<string, unknown> = { organizationId, items, deliveryMethod, shippingAddress };
  if (referral) body.referral = referral;

  const res = await fetch(`${getApiBase()}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '주문 생성에 실패했습니다');
  return json.data;
}

async function preparePayment(
  orderId: string,
  successUrl: string,
  failUrl: string,
): Promise<PaymentPrepareResponse> {
  const res = await fetch(`${getApiBase()}/payments/prepare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ orderId, successUrl, failUrl }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || '결제 준비에 실패했습니다');
  return json.data;
}

// ============================================================================
// Component
// ============================================================================

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [shippingAddress, setShippingAddress] = useState({ recipientName: '', phone: '', zipCode: '', address1: '', address2: '', memo: '' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!getAccessToken();

  useEffect(() => {
    if (slug) {
      const cart = cartService.getCart(slug);
      setItems(cart.items);
    }
  }, [slug]);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const shippingFee = deliveryMethod === 'delivery' ? 3000 : 0;
  const total = subtotal + shippingFee;

  const handleCheckout = useCallback(async () => {
    if (!slug || items.length === 0 || processing) return;
    setProcessing(true);
    setError(null);

    try {
      // For now, use a placeholder organizationId
      // In production, this would come from the store's slug resolution
      const storeRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/stores/resolve/${encodeURIComponent(slug)}`
      );
      const storeJson = await storeRes.json();
      if (!storeJson.success || !storeJson.data?.found) {
        throw new Error('매장 정보를 찾을 수 없습니다');
      }

      // Resolve storeId (organizationId) from slug
      const resolveRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/stores/${encodeURIComponent(slug)}`
      );
      const resolveJson = await resolveRes.json();
      const organizationId = resolveJson.data?.storeId || resolveJson.data?.id;
      if (!organizationId) throw new Error('매장 ID를 확인할 수 없습니다');

      // 1. Create order (with referral attribution if present)
      const referral = getReferralCookie();
      const order = await createOrder(
        organizationId,
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryMethod,
        deliveryMethod === 'delivery' ? shippingAddress : undefined,
        referral ? { referrerId: referral.referrerId, referrerType: referral.referrerType } : undefined,
      );

      // 2. Prepare payment
      const origin = window.location.origin;
      const payment = await preparePayment(
        order.orderId,
        `${origin}/store/${slug}/payment/success?orderId=${order.orderId}`,
        `${origin}/store/${slug}/payment/fail`,
      );

      // 3. Load Toss SDK and open payment widget
      const { loadTossPayments } = await import('@tosspayments/payment-sdk');
      const tossPayments = await loadTossPayments(payment.clientKey);

      await tossPayments.requestPayment('카드', {
        amount: payment.amount,
        orderId: order.orderNumber,
        orderName: items.length === 1 ? items[0].productName : `${items[0].productName} 외 ${items.length - 1}건`,
        successUrl: `${origin}/store/${slug}/payment/success?orderId=${order.orderId}&paymentId=${payment.paymentId}`,
        failUrl: `${origin}/store/${slug}/payment/fail`,
      });
    } catch (err: any) {
      if (err.code === 'USER_CANCEL') {
        // User cancelled payment — not an error
        setProcessing(false);
        return;
      }
      setError(err.message || '결제 처리 중 오류가 발생했습니다');
      setProcessing(false);
    }
  }, [slug, items, deliveryMethod, shippingAddress, processing]);

  if (!slug) return null;

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>장바구니가 비어있습니다</h2>
          <Link to={`/store/${slug}`} style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none' }}>매장으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => navigate(`/store/${slug}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '15px', fontWeight: 600, padding: 0 }}
          >
            <ArrowLeft size={20} />
            주문하기
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        {/* Items */}
        <section style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>주문 상품</h3>
          {items.map((item) => (
            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#0f172a', margin: 0 }}>{item.productName}</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>수량: {item.quantity}</p>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                {(item.unitPrice * item.quantity).toLocaleString()}원
              </span>
            </div>
          ))}
        </section>

        {/* Delivery Method */}
        <section style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>수령 방법</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDeliveryMethod('pickup')}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                border: deliveryMethod === 'pickup' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: deliveryMethod === 'pickup' ? '#eff6ff' : '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}
            >
              <Store size={20} color={deliveryMethod === 'pickup' ? '#2563eb' : '#94a3b8'} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: deliveryMethod === 'pickup' ? '#2563eb' : '#64748b' }}>매장 수령</span>
            </button>
            <button
              onClick={() => setDeliveryMethod('delivery')}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                border: deliveryMethod === 'delivery' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: deliveryMethod === 'delivery' ? '#eff6ff' : '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}
            >
              <Truck size={20} color={deliveryMethod === 'delivery' ? '#2563eb' : '#94a3b8'} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: deliveryMethod === 'delivery' ? '#2563eb' : '#64748b' }}>배송 (+3,000원)</span>
            </button>
          </div>

          {deliveryMethod === 'delivery' && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input placeholder="수령인" value={shippingAddress.recipientName} onChange={(e) => setShippingAddress({ ...shippingAddress, recipientName: e.target.value })} style={inputStyle} />
              <input placeholder="연락처" value={shippingAddress.phone} onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })} style={inputStyle} />
              <input placeholder="우편번호" value={shippingAddress.zipCode} onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })} style={inputStyle} />
              <input placeholder="주소" value={shippingAddress.address1} onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })} style={inputStyle} />
              <input placeholder="상세주소" value={shippingAddress.address2} onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })} style={inputStyle} />
              <input placeholder="배송 메모 (선택)" value={shippingAddress.memo} onChange={(e) => setShippingAddress({ ...shippingAddress, memo: e.target.value })} style={inputStyle} />
            </div>
          )}
        </section>

        {/* Summary */}
        <section style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>결제 금액</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>상품 금액</span>
            <span style={{ color: '#0f172a', fontSize: '14px' }}>{subtotal.toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>배송비</span>
            <span style={{ color: '#0f172a', fontSize: '14px' }}>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>총 결제 금액</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>{total.toLocaleString()}원</span>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Login Notice */}
        {!isLoggedIn && (
          <div style={{ backgroundColor: '#fff7ed', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
            <p style={{ color: '#c2410c', fontSize: '14px', margin: 0 }}>결제를 위해 로그인이 필요합니다.</p>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handleCheckout}
          disabled={processing || !isLoggedIn}
          style={{
            width: '100%', height: '52px', borderRadius: '12px', border: 'none',
            backgroundColor: processing || !isLoggedIn ? '#94a3b8' : '#2563eb',
            color: '#fff', fontSize: '17px', fontWeight: 700, cursor: processing || !isLoggedIn ? 'not-allowed' : 'pointer',
          }}
        >
          {processing ? '처리 중...' : `${total.toLocaleString()}원 결제하기`}
        </button>

        <div style={{ height: '32px' }} />
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box',
};

export default CheckoutPage;
