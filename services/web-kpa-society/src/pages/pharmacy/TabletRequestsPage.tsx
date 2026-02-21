/**
 * TabletRequestsPage — Staff Tablet Request Management
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 *
 * 구조:
 * ├─ 활성 요청 목록 (5초 polling)
 * ├─ 요청 카드: 상품, 고객명, 메모, 경과 시간
 * └─ 액션 버튼: 확인 / 완료 / 취소
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchStaffTabletRequests, updateTabletRequestAction, type StaffTabletRequest } from '../../api/tabletStaff';

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export function TabletRequestsPage() {
  const [requests, setRequests] = useState<StaffTabletRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve pharmacy slug from cockpit
  useEffect(() => {
    const fetchSlug = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL
          ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/glycopharm`
          : '/api/v1/glycopharm';
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/cockpit/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && json.data?.storeSlug) {
          setSlug(json.data.storeSlug);
        } else {
          setError('매장 정보를 찾을 수 없습니다.');
        }
      } catch {
        setError('매장 정보를 불러올 수 없습니다.');
      }
    };
    fetchSlug();
  }, []);

  // Poll for requests
  const fetchRequests = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await fetchStaffTabletRequests(slug);
      setRequests(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetchRequests();
    pollRef.current = setInterval(fetchRequests, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [slug, fetchRequests]);

  const handleAction = async (requestId: string, action: 'acknowledge' | 'serve' | 'cancel') => {
    if (!slug) return;
    try {
      await updateTabletRequestAction(slug, requestId, action);
      await fetchRequests();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Force re-render elapsed times every 10s
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>태블릿 주문 요청</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          매장 태블릿에서 접수된 주문 요청을 관리합니다.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            현재 대기 중인 태블릿 요청이 없습니다
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req) => {
            const total = req.items.reduce((s, i) => s + i.price * i.quantity, 0);
            const isNew = req.status === 'requested';
            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#fff',
                  border: isNew ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isNew && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px' }}>
                        NEW
                      </span>
                    )}
                    {req.status === 'acknowledged' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '4px' }}>
                        확인됨
                      </span>
                    )}
                    {req.customerName && (
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{req.customerName}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{formatElapsed(req.createdAt)}</span>
                </div>

                {/* Items */}
                <div style={{ marginBottom: '12px' }}>
                  {req.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '14px' }}>
                      <span style={{ color: '#334155' }}>{item.productName} x{item.quantity}</span>
                      <span style={{ color: '#64748b' }}>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1px solid #f1f5f9', fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>
                    <span>합계</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Note */}
                {req.note && (
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    💬 {req.note}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {req.status === 'requested' && (
                    <button
                      onClick={() => handleAction(req.id, 'acknowledge')}
                      style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' }}
                    >
                      확인
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(req.id, 'serve')}
                    style={{ ...btnStyle, backgroundColor: '#22c55e', color: '#fff' }}
                  >
                    완료
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'cancel')}
                    style={{ ...btnStyle, backgroundColor: '#fff', color: '#ef4444', border: '1px solid #fecaca' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

export default TabletRequestsPage;
