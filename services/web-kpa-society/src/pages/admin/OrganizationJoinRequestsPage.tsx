/**
 * OrganizationJoinRequestsPage - 조직 가입/역할 요청 관리 (운영자)
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import {
  JOIN_REQUEST_TYPE_LABELS,
  REQUESTED_ROLE_LABELS,
} from '../../types/joinRequest';

export function OrganizationJoinRequestsPage() {
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNoteId, setReviewNoteId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await joinRequestApi.getPending({ page, limit: 20 });
      setRequests(response.data.items);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || '요청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (id: string) => {
    if (!confirm('이 요청을 승인하시겠습니까?')) return;

    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await joinRequestApi.approve(id, note);
      setReviewNoteId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      alert(`승인 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('이 요청을 반려하시겠습니까?')) return;

    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await joinRequestApi.reject(id, note);
      setReviewNoteId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      alert(`반려 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
        조직 가입/역할 요청 관리
      </h2>
      <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '14px' }}>
        대기 중인 가입 및 역할 요청을 확인하고 승인/반려합니다.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
          {error}
          <button
            onClick={loadRequests}
            style={{
              display: 'block',
              margin: '12px auto 0',
              padding: '8px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f8fafc',
          borderRadius: '8px',
          color: '#94a3b8',
        }}>
          대기 중인 요청이 없습니다.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>요청 유형</th>
                  <th style={thStyle}>요청 역할</th>
                  <th style={thStyle}>세부 역할</th>
                  <th style={thStyle}>요청자 ID</th>
                  <th style={thStyle}>조직 ID</th>
                  <th style={thStyle}>요청일</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      {JOIN_REQUEST_TYPE_LABELS[req.request_type]}
                    </td>
                    <td style={tdStyle}>
                      {REQUESTED_ROLE_LABELS[req.requested_role]}
                    </td>
                    <td style={tdStyle}>
                      {req.requested_sub_role || '-'}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', fontFamily: 'monospace' }}>
                      {req.user_id.slice(0, 8)}...
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', fontFamily: 'monospace' }}>
                      {req.organization_id.slice(0, 8)}...
                    </td>
                    <td style={tdStyle}>
                      {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() =>
                            reviewNoteId === req.id
                              ? setReviewNoteId(null)
                              : (setReviewNoteId(req.id), setReviewNote(''))
                          }
                          style={{
                            padding: '4px 10px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          메모
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actionLoading === req.id}
                          style={{
                            padding: '4px 12px',
                            background: actionLoading === req.id ? '#86efac' : '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: actionLoading === req.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actionLoading === req.id}
                          style={{
                            padding: '4px 12px',
                            background: actionLoading === req.id ? '#fca5a5' : '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: actionLoading === req.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          반려
                        </button>
                      </div>
                      {reviewNoteId === req.id && (
                        <div style={{ marginTop: '8px' }}>
                          <input
                            type="text"
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="처리 메모 입력"
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={paginationBtnStyle(page <= 1)}
              >
                이전
              </button>
              <span style={{ padding: '6px 12px', fontSize: '14px', color: '#475569' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={paginationBtnStyle(page >= totalPages)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#1e293b',
};

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    background: disabled ? '#f1f5f9' : '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: disabled ? '#94a3b8' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
