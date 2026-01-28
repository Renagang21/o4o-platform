/**
 * MyRequestsSection - 이 약국의 요청 상태 요약
 *
 * WO-PHARMACY-JOIN-REQUEST-UX-CONSOLIDATION-V1
 * WO-PHARMACY-CONTEXT-AUTO-REFRESH-V1: 승인 감지 → Context 자동 refresh
 *
 * 현재 pharmacy Context 기준으로 내 JoinRequest를 표시.
 * 승인된 요청 감지 시 OrganizationContext를 자동 갱신.
 * 읽기 전용, 최대 5건.
 */

import { useState, useEffect, useRef } from 'react';
import { useOrganization } from '../../../contexts';
import { joinRequestApi } from '../../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../../types/joinRequest';
import {
  JOIN_REQUEST_STATUS_LABELS,
  JOIN_REQUEST_TYPE_LABELS,
} from '../../../types/joinRequest';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  approved: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
};

const PHARMACY_REQUEST_TYPES = new Set(['pharmacy_join', 'pharmacy_operator']);
const MAX_DISPLAY = 5;

export function MyRequestsSection() {
  const { currentOrganization, refreshAccessibleOrganizations } = useOrganization();
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState(false);

  // Track previously known request IDs + statuses to detect approval
  const prevStatusMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(false);
        const response = await joinRequestApi.getMyRequests();
        if (cancelled) return;

        // Filter: current pharmacy + pharmacy request types only
        const filtered = response.data
          .filter(
            (r) =>
              r.organization_id === currentOrganization.id &&
              PHARMACY_REQUEST_TYPES.has(r.request_type),
          )
          .slice(0, MAX_DISPLAY);

        // Detect newly approved requests
        const prevMap = prevStatusMapRef.current;
        let hasNewApproval = false;

        for (const req of filtered) {
          const prevStatus = prevMap.get(req.id);
          if (prevStatus && prevStatus !== 'approved' && req.status === 'approved') {
            hasNewApproval = true;
          }
        }

        // Update prev map
        const nextMap = new Map<string, string>();
        for (const req of filtered) {
          nextMap.set(req.id, req.status);
        }
        prevStatusMapRef.current = nextMap;

        setRequests(filtered);

        // Trigger context refresh on approval detection
        if (hasNewApproval) {
          refreshAccessibleOrganizations();
          setRefreshNotice(true);
          setTimeout(() => {
            if (!cancelled) setRefreshNotice(false);
          }, 4000);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [currentOrganization.id, refreshAccessibleOrganizations]);

  return (
    <section>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        이 약국의 요청 상태
      </h2>

      {/* 권한 반영 알림 */}
      {refreshNotice && (
        <div style={{
          padding: '10px 16px',
          marginBottom: '12px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1e40af',
          fontWeight: 500,
        }}>
          권한이 반영되었습니다.
        </div>
      )}

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
          이 약국에 대한 요청 내역이 없습니다
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
                    {JOIN_REQUEST_TYPE_LABELS[req.request_type]}
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
                  {JOIN_REQUEST_STATUS_LABELS[req.status]}
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
