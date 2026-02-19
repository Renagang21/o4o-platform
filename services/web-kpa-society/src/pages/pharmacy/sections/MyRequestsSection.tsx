/**
 * MyRequestsSection - 내 약국 서비스 신청 상태 요약
 *
 * WO-PHARMACY-JOIN-REQUEST-UX-CONSOLIDATION-V1
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1: 독립 pharmacy-requests API 사용
 *
 * 개인의 약국 서비스 신청 내역을 표시.
 * 읽기 전용, 최대 5건.
 */

import { useState, useEffect } from 'react';
import { pharmacyRequestApi } from '../../../api/pharmacyRequestApi';
import type { PharmacyRequest } from '../../../api/pharmacyRequestApi';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  approved: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인',
  rejected: '반려',
};

const MAX_DISPLAY = 5;

export function MyRequestsSection() {
  const [requests, setRequests] = useState<PharmacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);
        const response = await pharmacyRequestApi.getMyRequests();
        if (cancelled) return;

        const items = (response.data?.items || []).slice(0, MAX_DISPLAY);
        setRequests(items);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        약국 서비스 신청 내역
      </h2>

      {loading && (
        <div style={emptyStyle}>불러오는 중...</div>
      )}

      {error && (
        <div style={{ ...emptyStyle, color: '#dc2626' }}>
          요청 내역을 불러올 수 없습니다
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div style={emptyStyle}>
          약국 서비스 신청 내역이 없습니다
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.map((req) => {
            const sc = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
            return (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {req.pharmacy_name} ({req.business_number})
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(req.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  background: sc.bg,
                  color: sc.text,
                  border: `1px solid ${sc.border}`,
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {STATUS_LABELS[req.status] || req.status}
                </span>
              </div>
            );
          })}

          <div style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#94a3b8',
            textAlign: 'center',
          }}>
            승인 후 자동 반영됩니다
          </div>
        </div>
      )}
    </section>
  );
}

const emptyStyle: React.CSSProperties = {
  padding: '32px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '14px',
  background: '#f8fafc',
  borderRadius: '12px',
  border: '1px dashed #e2e8f0',
};
