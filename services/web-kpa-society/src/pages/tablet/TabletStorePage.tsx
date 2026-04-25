/**
 * TabletStorePage — In-Store Tablet Kiosk View
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 *
 * 구조:
 * ├─ 상품 그리드 (TABLET 채널 상품 — Supplier + Local 혼합)
 * ├─ 상품 상세 오버레이
 * ├─ 관심 표시 (Interest Request, 결제 없음)
 * └─ 요청 상태 추적 화면
 *
 * - Layout/Header 없음 (전체화면 kiosk mode)
 * - 인증 불필요
 * - 제출 후 3초 polling으로 상태 추적
 * - 2분 idle 후 자동 리셋
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchTabletProducts,
  submitTabletInterest,
  checkTabletInterestStatus,
  type TabletProduct,
  type InterestStatusDetail,
} from '../../api/tablet';

type ViewMode = 'browse' | 'detail' | 'submitted' | 'error';

interface DisplayProduct {
  id: string;
  masterId?: string;
  type: 'supplier' | 'local';
  name: string;
  price?: number;
  priceDisplay?: string;
  description?: string;
  summary?: string;
  category?: string;
  imageUrl?: string;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

function mapSupplierProduct(p: TabletProduct): DisplayProduct {
  return {
    id: p.id,
    masterId: p.id,
    type: 'supplier',
    name: p.name,
    price: p.channel_price || p.sale_price || p.price,
    description: p.description,
    summary: p.short_description,
    category: p.category,
    imageUrl: p.images?.[0]?.url,
  };
}

function mapLocalProduct(p: any): DisplayProduct {
  return {
    id: p.id,
    type: 'local',
    name: p.name,
    priceDisplay: p.price_display,
    description: p.description,
    summary: p.summary,
    category: p.category,
    imageUrl: p.thumbnail_url || p.images?.[0],
  };
}

export function TabletStorePage() {
  const { slug } = useParams<{ slug: string }>();
  // WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: QR 접속 경로 감지
  const fromQr = new URLSearchParams(window.location.search).get('from') === 'qr';
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [displayProducts, setDisplayProducts] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail view
  const [selectedProduct, setSelectedProduct] = useState<DisplayProduct | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Submitted state
  const [interestId, setInterestId] = useState<string | null>(null);
  const [interestStatus, setInterestStatus] = useState<InterestStatusDetail | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load products (supplier + local merged)
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchTabletProducts(slug, { limit: 50 })
      .then((res) => {
        const suppliers = res.data.map(mapSupplierProduct);
        const locals = ((res as any).localProducts || []).map(mapLocalProduct);
        setDisplayProducts([...suppliers, ...locals]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Submit interest request
  const handleSubmitInterest = async () => {
    if (!slug || !selectedProduct) return;
    if (selectedProduct.type === 'local') return; // Local products cannot create interest

    setSubmitting(true);
    try {
      const result = await submitTabletInterest(slug, {
        masterId: selectedProduct.masterId || selectedProduct.id,
        customerName: customerName.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
      });
      setInterestId(result.requestId);
      setViewMode('submitted');
      setCustomerName('');
      setCustomerNote('');
    } catch (e: any) {
      setError(e.message || '관심 요청 생성에 실패했습니다.');
      setViewMode('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Poll for status after submit
  useEffect(() => {
    if (viewMode !== 'submitted' || !slug || !interestId) return;

    const poll = () => {
      checkTabletInterestStatus(slug, interestId)
        .then(setInterestStatus)
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [viewMode, slug, interestId]);

  // Auto-reset after COMPLETED/CANCELLED (2 min)
  useEffect(() => {
    if (!interestStatus) return;
    if (interestStatus.status === 'COMPLETED' || interestStatus.status === 'CANCELLED') {
      idleRef.current = setTimeout(() => {
        resetToDefault();
      }, 120_000);
    }
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [interestStatus?.status]);

  const resetToDefault = () => {
    setViewMode('browse');
    setSelectedProduct(null);
    setInterestId(null);
    setInterestStatus(null);
    setError(null);
    setCustomerName('');
    setCustomerNote('');
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const statusLabels: Record<string, { label: string; color: string; message: string }> = {
    REQUESTED: { label: '요청 접수됨', color: '#eab308', message: '직원이 곧 확인합니다. 잠시 기다려주세요.' },
    ACKNOWLEDGED: { label: '직원 확인 중', color: '#3b82f6', message: '직원이 요청을 확인했습니다. 곧 안내드리겠습니다.' },
    COMPLETED: { label: '완료', color: '#22c55e', message: '안내가 완료되었습니다. 감사합니다!' },
    CANCELLED: { label: '취소됨', color: '#ef4444', message: '요청이 취소되었습니다.' },
  };

  // ── Error view ──
  if (viewMode === 'error' || (error && viewMode !== 'submitted')) {
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
    const st = interestStatus ? statusLabels[interestStatus.status] : statusLabels.REQUESTED;
    const isDone = interestStatus?.status === 'COMPLETED' || interestStatus?.status === 'CANCELLED';
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
            {st.message}
          </p>
          {interestStatus?.productName && (
            <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto 24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <span style={{ fontSize: '15px', color: '#334155' }}>{interestStatus.productName}</span>
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

  // ── Detail view ──
  if (viewMode === 'detail' && selectedProduct) {
    const isLocal = selectedProduct.type === 'local';
    return (
      <div style={styles.fullscreen}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'auto' }}>
          {/* Product Image */}
          <div style={styles.detailImageArea}>
            {selectedProduct.imageUrl ? (
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' as const }} />
            ) : (
              <div style={{ fontSize: '64px', color: '#cbd5e1' }}>📦</div>
            )}
          </div>

          {/* Product Info */}
          <div style={styles.detailInfo}>
            {selectedProduct.category && (
              <span style={styles.categoryBadge}>{selectedProduct.category}</span>
            )}
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0' }}>{selectedProduct.name}</h2>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#2563eb', margin: '0 0 16px' }}>
              {selectedProduct.price ? formatPrice(selectedProduct.price) : selectedProduct.priceDisplay || '가격 문의'}
            </p>
            {selectedProduct.description && (
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>{selectedProduct.description}</p>
            )}
            {selectedProduct.summary && (
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>{selectedProduct.summary}</p>
            )}

            {/* Customer Info (optional) */}
            {!isLocal && (
              <div style={{ margin: '16px 0' }}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="이름 (선택사항)"
                  style={styles.input}
                  maxLength={100}
                />
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="메모 (선택사항)"
                  style={{ ...styles.input, marginTop: '8px' }}
                  maxLength={200}
                />
              </div>
            )}

            {/* Local product notice */}
            {isLocal && (
              <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', margin: '16px 0' }}>
                <span style={{ fontSize: '14px', color: '#92400e' }}>매장 자체 상품입니다. 직원에게 직접 문의해주세요.</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={styles.actionBar}>
          <button
            onClick={() => { setViewMode('browse'); setSelectedProduct(null); setCustomerName(''); setCustomerNote(''); }}
            style={styles.backBtn}
          >
            돌아가기
          </button>
          {!isLocal && (
            <button
              onClick={handleSubmitInterest}
              disabled={submitting}
              style={{ ...styles.interestBtn, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? '요청 중...' : '관심 있어요'}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>상품 안내</h1>
          {fromQr && (
            <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '4px' }}>
              QR 코드로 접속
            </span>
          )}
        </div>
        <span style={{ fontSize: '14px', color: '#64748b' }}>관심 있는 상품을 터치해주세요</span>
      </div>

      <div style={styles.body}>
        {loading ? (
          <div style={styles.centerMessage}>
            <p style={{ color: '#94a3b8' }}>상품을 불러오는 중...</p>
          </div>
        ) : displayProducts.length === 0 ? (
          <div style={styles.centerMessage}>
            <p style={{ color: '#94a3b8' }}>표시할 상품이 없습니다.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {displayProducts.map((p) => (
              <div
                key={`${p.type}-${p.id}`}
                onClick={() => { setSelectedProduct(p); setViewMode('detail'); }}
                style={styles.productCard}
              >
                <div style={styles.productImgArea}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={styles.productImg} />
                  ) : (
                    <div style={{ fontSize: '32px', color: '#cbd5e1' }}>📦</div>
                  )}
                </div>
                <div style={styles.productInfo}>
                  <span style={styles.productName}>{p.name}</span>
                  <span style={styles.productPrice}>
                    {p.price ? formatPrice(p.price) : p.priceDisplay || '가격 문의'}
                  </span>
                </div>
                {p.type === 'local' && (
                  <div style={styles.localBadge}>자체</div>
                )}
              </div>
            ))}
          </div>
        )}
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
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  productCard: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border-color 0.15s, transform 0.1s',
  },
  productImgArea: {
    height: '140px',
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
  localBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  // Detail view
  detailImageArea: {
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    flexShrink: 0,
  },
  detailInfo: {
    padding: '24px',
    flex: 1,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: '13px',
    fontWeight: 500,
  },
  actionBar: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderTop: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  backBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    flex: 1,
  },
  interestBtn: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#f59e0b',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    flex: 2,
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
