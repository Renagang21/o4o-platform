/**
 * TabletKioskPage — In-Store Tablet Kiosk View (canonical)
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 * WO-O4O-TABLET-INTERACTIVE-UX-ALIGN-V1
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 * WO-O4O-TABLET-RUNTIME-REDUCER-V1 — useState 9개 분산 → useReducer 단일 runtime state
 *
 * 성격: 매장 내 interactive device.
 *   ─ "쇼핑몰"이 아니라 "매장 안내 디바이스"이다.
 *   ─ 결제/장바구니/주문 흐름 없음. 핵심은 "관심 → 직원 안내" 연결.
 *   ─ 향후 확장 가능 영역(별도 WO):
 *       · idle playback layer (signage playlist embed) — 'idle' mode 추가 예정
 *       · AI 설명 / 추천 영역
 *       · consultation / waiting / promotion 템플릿
 *       · QR / 블로그 / 콘텐츠 연결
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
 *
 * 주입 영역 (서비스 wrapper 책임):
 * - api: HTTP 호출 함수 3종 (KPA = fetch, Cosmetics = axios 등 wrapper 가 흡수)
 * - showQrBadge: KPA QR 접속 진입 시 배지 표시 (서비스별 진입 패턴 차이)
 *
 * Runtime state 구조 (WO-O4O-TABLET-RUNTIME-REDUCER-V1):
 *   - 단일 RuntimeState + useReducer (이전: useState 9개 분산)
 *   - reducer 는 순수 함수, side-effect (polling/idle reset/네트워크 호출) 는 useEffect 에서 수행
 *   - 향후 idle / consultation / waiting 모드는 Mode 타입 + Action 만 추가하면 됨 (별도 WO)
 *   - 타이밍(3초 polling / 2분 auto-reset) 그대로 유지
 *
 * 외부 export 정책: 본 컴포넌트와 props 만. RuntimeState/Action 은 내부 전용.
 */

import { useEffect, useReducer, useRef } from 'react';
import { useParams } from 'react-router-dom';
import type {
  TabletProduct,
  InterestStatusDetail,
  TabletKioskApi,
} from './types';

// ── Display & view types (internal) ──

/**
 * Tablet runtime mode.
 * 향후 idle layer 도입 시 'idle' 추가 예정 (별도 WO-O4O-TABLET-IDLE-LAYER-V1).
 */
type Mode = 'browse' | 'detail' | 'submitted' | 'error';

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

// ── Reducer (internal) ──

interface RuntimeState {
  mode: Mode;
  products: DisplayProduct[];
  loading: boolean;
  /** 가장 최근 에러 메시지. truthy 면 (mode !== 'submitted' 일 때) error view 가 표시됨. */
  errorMessage: string | null;
  submitting: boolean;
  selectedProduct: DisplayProduct | null;
  customerName: string;
  customerNote: string;
  interestId: string | null;
  interestStatus: InterestStatusDetail | null;
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; products: DisplayProduct[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'SELECT_PRODUCT'; product: DisplayProduct }
  | { type: 'UPDATE_CUSTOMER_NAME'; value: string }
  | { type: 'UPDATE_CUSTOMER_NOTE'; value: string }
  /** detail → browse (selectedProduct + customer 입력 클리어, interest 상태는 손대지 않음) */
  | { type: 'BACK_TO_BROWSE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; requestId: string }
  | { type: 'SUBMIT_ERROR'; message: string }
  | { type: 'STATUS_UPDATE'; status: InterestStatusDetail }
  /** submitted/auto-reset → browse (모든 transient state 초기화) */
  | { type: 'RESET_TO_BROWSE' }
  /** error view 의 "다시 시도": errorMessage 만 클리어 + browse 모드로 복귀.
   *  selectedProduct/interestId 등은 보존 (기존 동작 유지) */
  | { type: 'CLEAR_ERROR' };

const initialState: RuntimeState = {
  mode: 'browse',
  products: [],
  loading: true,
  errorMessage: null,
  submitting: false,
  selectedProduct: null,
  customerName: '',
  customerNote: '',
  interestId: null,
  interestStatus: null,
};

function reducer(state: RuntimeState, action: Action): RuntimeState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, products: action.products };
    case 'LOAD_ERROR':
      // 기존 동작: setError(...) + setLoading(false) 만. mode 전환 없음.
      // render 단계에서 (errorMessage && mode !== 'submitted') 가 error view 진입 조건.
      return { ...state, loading: false, errorMessage: action.message };
    case 'SELECT_PRODUCT':
      return { ...state, mode: 'detail', selectedProduct: action.product };
    case 'UPDATE_CUSTOMER_NAME':
      return { ...state, customerName: action.value };
    case 'UPDATE_CUSTOMER_NOTE':
      return { ...state, customerNote: action.value };
    case 'BACK_TO_BROWSE':
      return {
        ...state,
        mode: 'browse',
        selectedProduct: null,
        customerName: '',
        customerNote: '',
      };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        mode: 'submitted',
        submitting: false,
        interestId: action.requestId,
        customerName: '',
        customerNote: '',
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        mode: 'error',
        submitting: false,
        errorMessage: action.message,
      };
    case 'STATUS_UPDATE':
      return { ...state, interestStatus: action.status };
    case 'RESET_TO_BROWSE':
      return {
        ...state,
        mode: 'browse',
        selectedProduct: null,
        customerName: '',
        customerNote: '',
        interestId: null,
        interestStatus: null,
        errorMessage: null,
      };
    case 'CLEAR_ERROR':
      // 기존 error view "다시 시도" 동작 그대로: errorMessage 만 클리어 + mode=browse.
      // selectedProduct/interestId 등 transient 는 보존.
      return { ...state, mode: 'browse', errorMessage: null };
    default:
      return state;
  }
}

// ── Pure helpers ──

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

// ── Component ──

export interface TabletKioskPageProps {
  /** HTTP 호출 함수 3종 (서비스 wrapper 가 주입) */
  api: TabletKioskApi;
  /** QR 코드로 진입했는지 표시 (KPA 한정 — Cosmetics 는 false) */
  showQrBadge?: boolean;
}

export function TabletKioskPage({ api, showQrBadge = false }: TabletKioskPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    mode,
    products,
    loading,
    errorMessage,
    submitting,
    selectedProduct,
    customerName,
    customerNote,
    interestId,
    interestStatus,
  } = state;

  // Side-effect refs (reducer 외부에서 관리 — polling interval, auto-reset timeout)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load products (supplier + local merged)
  useEffect(() => {
    if (!slug) return;
    dispatch({ type: 'LOAD_START' });
    api.fetchProducts(slug, { limit: 50 })
      .then((res) => {
        const suppliers = res.data.map(mapSupplierProduct);
        const locals = ((res.localProducts as any[] | undefined) || []).map(mapLocalProduct);
        dispatch({ type: 'LOAD_SUCCESS', products: [...suppliers, ...locals] });
      })
      .catch((e) => dispatch({ type: 'LOAD_ERROR', message: e.message }));
  }, [slug, api]);

  // Submit interest request
  const handleSubmitInterest = async () => {
    if (!slug || !selectedProduct) return;
    if (selectedProduct.type === 'local') return; // Local products cannot create interest

    dispatch({ type: 'SUBMIT_START' });
    try {
      const result = await api.submitInterest(slug, {
        masterId: selectedProduct.masterId || selectedProduct.id,
        customerName: customerName.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
      });
      dispatch({ type: 'SUBMIT_SUCCESS', requestId: result.requestId });
    } catch (e: any) {
      dispatch({
        type: 'SUBMIT_ERROR',
        message: e.message || '관심 요청 생성에 실패했습니다.',
      });
    }
  };

  // Poll for status after submit (3s interval, 기존 타이밍 유지)
  useEffect(() => {
    if (mode !== 'submitted' || !slug || !interestId) return;

    const poll = () => {
      api.checkStatus(slug, interestId)
        .then((status) => dispatch({ type: 'STATUS_UPDATE', status }))
        .catch(() => {});
    };
    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mode, slug, interestId, api]);

  // Auto-reset after COMPLETED/CANCELLED (2 min, 기존 타이밍 유지)
  useEffect(() => {
    if (!interestStatus) return;
    if (interestStatus.status === 'COMPLETED' || interestStatus.status === 'CANCELLED') {
      idleRef.current = setTimeout(() => {
        dispatch({ type: 'RESET_TO_BROWSE' });
        if (pollRef.current) clearInterval(pollRef.current);
      }, 120_000);
    }
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestStatus?.status]);

  // 사용자 트리거 reset (submitted "처음으로" 버튼)
  const handleResetToBrowse = () => {
    dispatch({ type: 'RESET_TO_BROWSE' });
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const statusLabels: Record<string, { label: string; color: string; message: string }> = {
    REQUESTED: { label: '요청 접수됨', color: '#eab308', message: '직원이 곧 확인합니다. 잠시 기다려주세요.' },
    ACKNOWLEDGED: { label: '직원 확인 중', color: '#3b82f6', message: '직원이 요청을 확인했습니다. 곧 안내드리겠습니다.' },
    COMPLETED: { label: '완료', color: '#22c55e', message: '안내가 완료되었습니다. 감사합니다!' },
    CANCELLED: { label: '취소됨', color: '#ef4444', message: '요청이 취소되었습니다.' },
  };

  // ── Error view ──
  if (mode === 'error' || (errorMessage && mode !== 'submitted')) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.centerMessage}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>오류 발생</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{errorMessage}</p>
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} style={styles.primaryBtn}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // ── Submitted view ──
  if (mode === 'submitted') {
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
            <button onClick={handleResetToBrowse} style={styles.primaryBtn}>
              처음으로
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (mode === 'detail' && selectedProduct) {
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
                  onChange={(e) => dispatch({ type: 'UPDATE_CUSTOMER_NAME', value: e.target.value })}
                  placeholder="이름 (선택사항)"
                  style={styles.input}
                  maxLength={100}
                />
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => dispatch({ type: 'UPDATE_CUSTOMER_NOTE', value: e.target.value })}
                  placeholder="요청 사항 (선택사항)"
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
            onClick={() => dispatch({ type: 'BACK_TO_BROWSE' })}
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
              {submitting ? '요청 중...' : '직원에게 안내 요청'}
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
          {showQrBadge && (
            <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '4px' }}>
              QR 코드로 접속
            </span>
          )}
        </div>
        <span style={{ fontSize: '14px', color: '#64748b' }}>관심 있는 상품을 터치하면 자세히 안내해드립니다</span>
      </div>

      <div style={styles.body}>
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
            {products.map((p) => (
              <div
                key={`${p.type}-${p.id}`}
                onClick={() => dispatch({ type: 'SELECT_PRODUCT', product: p })}
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

export default TabletKioskPage;
