/**
 * MyJoinRequests - 내 가입/역할 요청 목록
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 */

import { useState, useEffect } from 'react';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import {
  JOIN_REQUEST_STATUS_LABELS,
  JOIN_REQUEST_TYPE_LABELS,
  REQUESTED_ROLE_LABELS,
} from '../../types/joinRequest';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  approved: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
};

export function MyJoinRequests() {
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await joinRequestApi.getMyRequests();
      setRequests(response.data);
    } catch (err: any) {
      setError(err.message || '요청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#dc2626' }}>
        {error}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
        가입/역할 요청 내역이 없습니다.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
        내 가입/역할 요청
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requests.map((req) => {
          const statusColor = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
          return (
            <div
              key={req.id}
              style={{
                padding: '14px 16px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                  {JOIN_REQUEST_TYPE_LABELS[req.request_type]}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    background: statusColor.bg,
                    color: statusColor.text,
                    border: `1px solid ${statusColor.border}`,
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {JOIN_REQUEST_STATUS_LABELS[req.status]}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                <span>요청 역할: {REQUESTED_ROLE_LABELS[req.requested_role]}</span>
                {req.requested_sub_role && (
                  <span> ({req.requested_sub_role})</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {new Date(req.created_at).toLocaleDateString('ko-KR')}
              </div>
              {req.review_note && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: '#f8fafc',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#475569',
                }}>
                  처리 메모: {req.review_note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
