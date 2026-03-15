/**
 * InterestRequestsPage — Staff Interest Request Management (K-Cosmetics)
 *
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1
 *
 * 구조:
 * ├─ 5초 폴링으로 관심 요청 목록 자동 갱신
 * ├─ 요청 카드: 상품명, 고객명, 메모, 경과 시간, 상태 뱃지
 * └─ 액션: 확인(acknowledge) → 완료(complete) / 취소(cancel)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  fetchInterestRequests,
  updateInterestAction,
  type StaffInterestRequest,
} from '../../api/tabletInterest';

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

export default function InterestRequestsPage() {
  const [requests, setRequests] = useState<StaffInterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchInterestRequests();
      setRequests(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const handleAction = async (id: string, action: 'acknowledge' | 'complete' | 'cancel') => {
    try {
      await updateInterestAction(id, action);
      await fetchData();
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
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>관심 요청 관리</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          매장 태블릿에서 접수된 관심 요청을 관리합니다.
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
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💡</div>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            현재 대기 중인 관심 요청이 없습니다
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req) => {
            const isNew = req.status === 'REQUESTED';
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
                    {req.status === 'ACKNOWLEDGED' && (
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

                {/* Product */}
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  {req.productName}
                </div>

                {/* Note */}
                {req.customerNote && (
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                    {req.customerNote}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {req.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleAction(req.id, 'acknowledge')}
                      style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' }}
                    >
                      확인
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(req.id, 'complete')}
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
