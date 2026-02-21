/**
 * PharmacyRequestManagementPage - 약국 서비스 신청 관리 (운영자)
 *
 * WO-KPA-A-PHARMACY-REQUEST-OPERATOR-UI-V1
 *
 * 약국 개설자 신청(kpa_pharmacy_requests)을 조회하고 승인/반려합니다.
 * API: pharmacyRequestApi.getPending / approve / reject
 */

import { useState, useEffect, useCallback } from 'react';
import { pharmacyRequestApi } from '../../api/pharmacyRequestApi';
import type { PharmacyRequest } from '../../api/pharmacyRequestApi';

type TabType = 'pending' | 'processed';

export default function PharmacyRequestManagementPage() {
  const [tab, setTab] = useState<TabType>('pending');
  const [requests, setRequests] = useState<(PharmacyRequest & { user?: { name: string; email: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNoteId, setReviewNoteId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pharmacyRequestApi.getPending({ page, limit: 20 });
      setRequests(response.data.items);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
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
    if (!confirm('이 약국 서비스 신청을 승인하시겠습니까?\n승인 시 해당 사용자에게 pharmacy_owner 권한이 부여됩니다.')) return;

    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await pharmacyRequestApi.approve(id, note);
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
    if (!confirm('이 약국 서비스 신청을 반려하시겠습니까?')) return;

    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await pharmacyRequestApi.reject(id, note);
      setReviewNoteId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      alert(`반려 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setActionLoading(null);
    }
  };

  /** 사업자번호 포맷 (000-00-00000) */
  const formatBizNo = (num: string) => {
    const d = num.replace(/\D/g, '');
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    return num;
  };

  /** 전화번호 포맷 */
  const formatPhone = (num: string | null) => {
    if (!num) return '-';
    const d = num.replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
    return num;
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
        약국 서비스 신청 관리
      </h2>
      <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
        약국 개설자의 서비스 이용 신청을 확인하고 승인/반려합니다.
        승인 시 해당 사용자의 pharmacist_role이 pharmacy_owner로 변경됩니다.
      </p>

      {/* Tab */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => { setTab('pending'); setPage(1); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: tab === 'pending' ? 700 : 400,
            color: tab === 'pending' ? '#2563eb' : '#64748b',
            borderBottom: tab === 'pending' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          대기 중 {!loading && tab === 'pending' && total > 0 ? `(${total})` : ''}
        </button>
        <button
          onClick={() => setTab('processed')}
          disabled
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            color: '#94a3b8',
            borderBottom: '2px solid transparent',
            cursor: 'not-allowed',
          }}
        >
          처리 완료 (준비 중)
        </button>
      </div>

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
          대기 중인 약국 서비스 신청이 없습니다.
        </div>
      ) : (
        <>
          {/* Card List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#fff',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {req.pharmacy_name}
                    </span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      대기
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(req.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    {' '}
                    {new Date(req.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Info Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>신청자: </span>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {(req as any).user?.name || '(이름 없음)'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>이메일: </span>
                    <span style={{ color: '#0f172a' }}>
                      {(req as any).user?.email || '-'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>사업자번호: </span>
                    <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                      {formatBizNo(req.business_number)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>약국 전화: </span>
                    <span style={{ color: '#0f172a' }}>
                      {formatPhone(req.pharmacy_phone)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>개설자 핸드폰: </span>
                    <span style={{ color: '#0f172a' }}>
                      {formatPhone(req.owner_phone)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>세금계산서 이메일: </span>
                    <span style={{ color: '#0f172a' }}>
                      {req.tax_invoice_email || '-'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() =>
                      reviewNoteId === req.id
                        ? setReviewNoteId(null)
                        : (setReviewNoteId(req.id), setReviewNote(''))
                    }
                    style={{
                      padding: '6px 14px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    메모 {reviewNoteId === req.id ? '닫기' : '추가'}
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading === req.id}
                    style={{
                      padding: '6px 16px',
                      background: actionLoading === req.id ? '#86efac' : '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
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
                      padding: '6px 16px',
                      background: actionLoading === req.id ? '#fca5a5' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: actionLoading === req.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    반려
                  </button>
                </div>

                {/* Review Note Input */}
                {reviewNoteId === req.id && (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="text"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="처리 메모 입력 (선택사항)"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
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
