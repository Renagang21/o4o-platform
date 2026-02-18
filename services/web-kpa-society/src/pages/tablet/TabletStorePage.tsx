/**
 * TabletStorePage — In-Store Tablet Kiosk View
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * 구조:
 * ├─ 상품 그리드 (TABLET 채널 상품)
 * ├─ 장바구니 사이드바
 * ├─ 주문 요청 버튼 (결제 없음)
 * └─ 요청 상태 추적 화면
 *
 * - Layout/Header 없음 (전체화면 kiosk mode)
 * - 인증 불필요
 * - 제출 후 3초 polling으로 상태 추적
 * - 2분 idle 후 자동 리셋
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchTabletProducts,
  submitTabletRequest,
  checkTabletRequestStatus,
  type TabletProduct,
  type TabletRequestDetail,
} from '../../api/tablet';

type ViewMode = 'browse' | 'submitted' | 'error';

interface CartItem {
  product: TabletProduct;
  quantity: number;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export function TabletStorePage({ service }: { service?: string }) {
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [products, setProducts] = useState<TabletProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');

  // Submitted state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<TabletRequestDetail | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load products
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchTabletProducts(slug, { limit: 50 }, service)
      .then((res) => setProducts(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Cart helpers
  const addToCart = useCallback((product: TabletProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: Math.min(c.quantity + 1, 99) } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  }, []);

  const cartTotal = cart.reduce(
    (sum, c) => sum + (c.product.channel_price || c.product.sale_price || c.product.price) * c.quantity,
    0,
  );

  // Submit request
  const handleSubmit = async () => {
    if (!slug || cart.length === 0) return;
    setSubmitting(true);
    try {
      const result = await submitTabletRequest(slug, {
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity })),
        note: note.trim() || undefined,
        customerName: customerName.trim() || undefined,
      }, service);
      setRequestId(result.requestId);
      setViewMode('submitted');
      setCart([]);
      setNote('');
      setCustomerName('');
    } catch (e: any) {
      setError(e.message || '요청 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // Poll for status after submit
  useEffect(() => {
    if (viewMode !== 'submitted' || !slug || !requestId) return;

    const poll = () => {
      checkTabletRequestStatus(slug, requestId, service)
        .then(setRequestStatus)
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [viewMode, slug, requestId]);

  // Auto-reset after served/cancelled (2 min)
  useEffect(() => {
    if (!requestStatus) return;
    if (requestStatus.status === 'served' || requestStatus.status === 'cancelled') {
      idleRef.current = setTimeout(() => {
        resetToDefault();
      }, 120_000);
    }
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [requestStatus?.status]);

  const resetToDefault = () => {
    setViewMode('browse');
    setRequestId(null);
    setRequestStatus(null);
    setError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    requested: { label: '요청 접수됨', color: '#eab308' },
    acknowledged: { label: '직원 확인 중', color: '#3b82f6' },
    served: { label: '완료', color: '#22c55e' },
    cancelled: { label: '취소됨', color: '#ef4444' },
  };

  // ── Error view ──
  if (error && viewMode !== 'submitted') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.centerMessage}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>오류 발생</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
          <button onClick={() => { setError(null); setViewMode('browse'); }} style={styles.primaryBtn}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted view ──
  if (viewMode === 'submitted') {
    const st = requestStatus ? statusLabels[requestStatus.status] : statusLabels.requested;
    const isDone = requestStatus?.status === 'served' || requestStatus?.status === 'cancelled';
    return (
      <div style={styles.fullscreen}>
        <div style={styles.centerMessage}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: st.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: st.color }} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            {st.label}
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '32px' }}>
            {requestStatus?.status === 'requested' && '직원이 곧 확인합니다. 잠시 기다려주세요.'}
            {requestStatus?.status === 'acknowledged' && '직원이 요청을 확인했습니다. 곧 준비됩니다.'}
            {requestStatus?.status === 'served' && '요청이 완료되었습니다. 감사합니다!'}
            {requestStatus?.status === 'cancelled' && '요청이 취소되었습니다.'}
          </p>
          {requestStatus?.items && (
            <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              {requestStatus.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '15px' }}>
                  <span>{item.productName} x{item.quantity}</span>
                  <span style={{ color: '#64748b' }}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          )}
          {isDone && (
            <button onClick={resetToDefault} style={styles.primaryBtn}>
              새 요청
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Browse view ──
  return (
    <div style={styles.fullscreen}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>매장 주문 요청</h1>
        <span style={{ fontSize: '14px', color: '#64748b' }}>원하시는 상품을 선택해주세요</span>
      </div>

      <div style={styles.body}>
        {/* Product Grid */}
        <div style={styles.productArea}>
          {loading ? (
            <div style={styles.centerMessage}>
              <p style={{ color: '#94a3b8' }}>상품을 불러오는 중...</p>
            </div>
          ) : products.length === 0 ? (
            <div style={styles.centerMessage}>
              <p style={{ color: '#94a3b8' }}>표시할 상품이 없습니다.</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {products.map((p) => {
                const displayPrice = p.channel_price || p.sale_price || p.price;
                const inCart = cart.find((c) => c.product.id === p.id);
                return (
                  <div key={p.id} onClick={() => addToCart(p)} style={{ ...styles.productCard, ...(inCart ? { borderColor: '#3b82f6' } : {}) }}>
                    <div style={styles.productImgArea}>
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} style={styles.productImg} />
                      ) : (
                        <div style={{ fontSize: '32px', color: '#cbd5e1' }}>📦</div>
                      )}
                    </div>
                    <div style={styles.productInfo}>
                      <span style={styles.productName}>{p.name}</span>
                      <span style={styles.productPrice}>{formatPrice(displayPrice)}</span>
                    </div>
                    {inCart && (
                      <div style={styles.cartBadge}>{inCart.quantity}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div style={styles.cartSidebar}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>장바구니</h3>

          {cart.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              상품을 선택해주세요
            </p>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.map((c) => (
                <div key={c.product.id} style={styles.cartItem}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {c.product.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatPrice((c.product.channel_price || c.product.sale_price || c.product.price) * c.quantity)}
                    </div>
                  </div>
                  <div style={styles.qtyControls}>
                    <button onClick={() => updateQuantity(c.product.id, -1)} style={styles.qtyBtn}>−</button>
                    <span style={{ minWidth: '24px', textAlign: 'center' as const, fontSize: '14px' }}>{c.quantity}</span>
                    <button onClick={() => updateQuantity(c.product.id, 1)} style={styles.qtyBtn}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="이름 (선택사항)"
                style={styles.input}
                maxLength={50}
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="요청사항 (선택사항)"
                style={{ ...styles.input, marginTop: '8px' }}
                maxLength={200}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0', fontWeight: 700, fontSize: '16px' }}>
                <span>합계</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...styles.primaryBtn, width: '100%', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? '요청 중...' : '주문 요청'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  productArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
  },
  productCard: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  productImgArea: {
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  productImg: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain' as const,
  },
  productInfo: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  productPrice: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#2563eb',
  },
  cartBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartSidebar: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: '#fff',
    borderLeft: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    overflowY: 'auto',
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  qtyBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  primaryBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  centerMessage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center' as const,
    padding: '48px',
  },
};

export default TabletStorePage;
