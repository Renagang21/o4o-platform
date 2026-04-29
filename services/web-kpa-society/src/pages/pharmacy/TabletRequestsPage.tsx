/**
 * TabletRequestsPage — Staff Consultation Request Management
 *
 * WO-STORE-TABLET-REQUEST-CHANNEL-V1
 * WO-O4O-TABLET-INTEREST-UX-REFACTOR-V1: Interest-only view
 * WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy service request tab
 * WO-O4O-STORE-REQUESTS-UNIFIED-MENU-V1: 상담 요청 통합 메뉴 승격
 *
 * 구조:
 * └─ 상담 요청 목록 (5초 polling)
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { GuideEditableSection } from '../../components/guide';
import {
  fetchStaffInterestRequests,
  updateInterestAction,
  type StaffInterestRequest,
} from '../../api/tabletStaff';

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function formatDuration(from: string, to: string): string {
  const diff = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000);
  if (diff < 60) return `${diff}초`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  return `${Math.floor(diff / 3600)}시간`;
}

export function TabletRequestsPage() {
  const [interestRequests, setInterestRequests] = useState<StaffInterestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInterests = useCallback(async () => {
    try {
      const data = await fetchStaffInterestRequests();
      setInterestRequests(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    setLoading(true);
    fetchInterests();
    pollRef.current = setInterval(fetchInterests, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchInterests]);

  const handleInterestAction = async (id: string, action: 'acknowledge' | 'complete' | 'cancel') => {
    try {
      await updateInterestAction(id, action);
      await fetchInterests();
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
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>상담 요청</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          <GuideEditableSection
            pageKey="store/requests"
            sectionKey="hero-description"
            defaultContent="매장에서 접수된 상담 요청을 관리합니다."
          />
        </p>
      </div>

      {/* WO-O4O-STORE-REQUEST-CONTEXT-LIGHT-V1: 요약 카운트 바 */}
      {!loading && interestRequests.length > 0 && (() => {
        const pendingCount = interestRequests.filter(r => r.status === 'REQUESTED').length;
        const acknowledgedCount = interestRequests.filter(r => r.status === 'ACKNOWLEDGED').length;
        return (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '14px', color: '#475569' }}>
            {pendingCount > 0 && (
              <span style={{ fontWeight: 600, color: '#d97706' }}>대기 {pendingCount}건</span>
            )}
            {pendingCount > 0 && acknowledgedCount > 0 && <span>·</span>}
            {acknowledgedCount > 0 && (
              <span style={{ fontWeight: 600, color: '#2563eb' }}>확인 {acknowledgedCount}건</span>
            )}
          </div>
        );
      })()}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : interestRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💡</div>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            <GuideEditableSection
              pageKey="store/requests"
              sectionKey="empty-description"
              defaultContent="현재 대기 중인 상담 요청이 없습니다"
            />
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {interestRequests.map((req) => {
            const isNew = req.status === 'REQUESTED';
            const elapsed = Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 1000);
            const urgency = isNew ? (elapsed >= 600 ? 'urgent' : elapsed >= 300 ? 'warning' : 'normal') : 'normal';
            const urgencyBorder = urgency === 'urgent' ? '2px solid #ef4444' : urgency === 'warning' ? '2px solid #f97316' : isNew ? '2px solid #f59e0b' : '1px solid #e2e8f0';
            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#fff',
                  border: urgencyBorder,
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isNew && urgency === 'urgent' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px' }}>
                        10분+
                      </span>
                    )}
                    {isNew && urgency === 'warning' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fff7ed', color: '#ea580c', padding: '2px 8px', borderRadius: '4px' }}>
                        5분+
                      </span>
                    )}
                    {isNew && urgency === 'normal' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px' }}>
                        NEW
                      </span>
                    )}
                    {req.status === 'ACKNOWLEDGED' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '4px' }}>
                        확인됨
                      </span>
                    )}
                    {req.status === 'ACKNOWLEDGED' && req.acknowledgedAt && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        응답 {formatDuration(req.createdAt, req.acknowledgedAt)}
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
                      onClick={() => handleInterestAction(req.id, 'acknowledge')}
                      style={{ ...btnStyle, backgroundColor: '#3b82f6', color: '#fff' }}
                    >
                      확인
                    </button>
                  )}
                  <button
                    onClick={() => handleInterestAction(req.id, 'complete')}
                    style={{ ...btnStyle, backgroundColor: '#22c55e', color: '#fff' }}
                  >
                    완료
                  </button>
                  <button
                    onClick={() => handleInterestAction(req.id, 'cancel')}
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
