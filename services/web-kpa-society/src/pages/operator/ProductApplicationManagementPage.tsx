/**
 * ProductApplicationManagementPage - 상품 판매 신청 관리 (Operator)
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 *
 * /hub/b2b에서 약국이 신청한 상품을 조회하고 승인/거절합니다.
 * 승인 시 organization_product_listings에 자동 생성됩니다.
 *
 * API:
 *   GET   /operator/product-applications         — 목록 조회
 *   GET   /operator/product-applications/stats    — 통계
 *   PATCH /operator/product-applications/:id/approve — 승인
 *   PATCH /operator/product-applications/:id/reject  — 거절
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';

// ============================================
// 타입
// ============================================

interface ProductApplication {
  id: string;
  organization_id: string;
  organizationName: string | null;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: {
    supplierName?: string;
    supplierId?: string;
    category?: string;
    [key: string]: unknown;
  };
  supplierName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

// ============================================
// 컴포넌트
// ============================================

export default function ProductApplicationManagementPage() {
  const [applications, setApplications] = useState<ProductApplication[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Stats }>('/operator/product-applications/stats');
      if (res.success) setStats(res.data);
    } catch {
      // silent
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get<{
        success: boolean;
        data: ProductApplication[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>('/operator/product-applications', params);

      setApplications(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      setError(e.message || '신청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadApplications(); }, [loadApplications]);

  const handleApprove = async (app: ProductApplication) => {
    if (!confirm(`"${app.product_name}" 신청을 승인하시겠습니까?\n승인 시 해당 약국의 매장 진열 상품에 자동 추가됩니다.`)) return;

    setActionLoading(app.id);
    try {
      await apiClient.patch(`/operator/product-applications/${app.id}/approve`, {});
      setToast({ type: 'success', message: `"${app.product_name}" 승인 완료. 매장 진열 상품이 생성되었습니다.` });
      loadApplications();
      loadStats();
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || '승인 처리에 실패했습니다.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectId) return;
    const app = applications.find(a => a.id === rejectId);
    if (!app) return;

    setActionLoading(rejectId);
    try {
      await apiClient.patch(`/operator/product-applications/${rejectId}/reject`, { reason: rejectReason || undefined });
      setToast({ type: 'success', message: `"${app.product_name}" 거절 처리되었습니다.` });
      setRejectId(null);
      setRejectReason('');
      loadApplications();
      loadStats();
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || '거절 처리에 실패했습니다.' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: '승인 대기', color: '#92400e', bg: '#fef3c7' },
    approved: { label: '승인', color: '#065f46', bg: '#d1fae5' },
    rejected: { label: '거절', color: '#991b1b', bg: '#fee2e2' },
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>상품 판매 신청 관리</h1>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 24 }}>
        약국이 약국 HUB에서 신청한 B2B 상품을 승인하거나 거절합니다.
      </p>

      {/* Toast */}
      {toast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', borderRadius: 8, border: '1px solid',
          fontSize: '0.875rem', marginBottom: 16,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          {toast.message}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'all' as StatusFilter, label: '전체', count: stats.pending + stats.approved + stats.rejected },
          { key: 'pending' as StatusFilter, label: '승인 대기', count: stats.pending },
          { key: 'approved' as StatusFilter, label: '승인', count: stats.approved },
          { key: 'rejected' as StatusFilter, label: '거절', count: stats.rejected },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => handleFilterChange(item.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              backgroundColor: statusFilter === item.key ? '#1e40af' : '#ffffff',
              color: statusFilter === item.key ? '#ffffff' : '#475569',
            }}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
          {error}
          <div style={{ marginTop: 12 }}>
            <button onClick={loadApplications} style={{
              padding: '6px 16px', fontSize: '0.8125rem', cursor: 'pointer',
              border: '1px solid #dc2626', borderRadius: 6, backgroundColor: 'transparent', color: '#dc2626',
            }}>다시 시도</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          신청 목록을 불러오는 중...
        </div>
      )}

      {/* Empty */}
      {!loading && !error && applications.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          {statusFilter === 'pending' ? '처리 대기 중인 신청이 없습니다.' : '해당 상태의 신청이 없습니다.'}
        </div>
      )}

      {/* Table */}
      {!loading && !error && applications.length > 0 && (
        <>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: 8 }}>
            총 {total}건
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>약국</th>
                  <th style={thStyle}>상품명</th>
                  <th style={thStyle}>공급사</th>
                  <th style={thStyle}>카테고리</th>
                  <th style={thStyle}>신청일</th>
                  <th style={thStyle}>상태</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const statusInfo = STATUS_LABELS[app.status] || STATUS_LABELS.pending;
                  const isActionTarget = actionLoading === app.id;

                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{app.organizationName || app.organization_id.slice(0, 8)}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500 }}>{app.product_name}</div>
                      </td>
                      <td style={tdStyle}>{app.supplierName || '-'}</td>
                      <td style={tdStyle}>{(app.product_metadata?.category as string) || '-'}</td>
                      <td style={tdStyle}>{new Date(app.requested_at).toLocaleDateString('ko-KR')}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                          fontSize: '0.6875rem', fontWeight: 600,
                          backgroundColor: statusInfo.bg, color: statusInfo.color,
                        }}>
                          {statusInfo.label}
                        </span>
                        {app.reject_reason && (
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 2 }}>
                            사유: {app.reject_reason}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {app.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={isActionTarget}
                              style={{
                                padding: '4px 12px', borderRadius: 6, border: 'none',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                backgroundColor: '#1e40af', color: '#ffffff',
                                opacity: isActionTarget ? 0.6 : 1,
                              }}
                            >
                              {isActionTarget ? '처리중...' : '승인'}
                            </button>
                            <button
                              onClick={() => { setRejectId(app.id); setRejectReason(''); }}
                              disabled={isActionTarget}
                              style={{
                                padding: '4px 12px', borderRadius: 6,
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                backgroundColor: '#ffffff', color: '#dc2626',
                                border: '1px solid #fecaca',
                                opacity: isActionTarget ? 0.6 : 1,
                              }}
                            >
                              거절
                            </button>
                          </div>
                        )}
                        {app.status === 'approved' && app.reviewed_at && (
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {new Date(app.reviewed_at).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ ...pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
              >
                &laquo; 이전
              </button>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                style={{ ...pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
              >
                다음 &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 32,
            maxWidth: 420, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>
              상품 신청 거절
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 16px' }}>
              거절 사유를 입력해주세요 (선택).
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="거절 사유 (선택)"
              rows={3}
              style={{
                width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
                fontSize: '0.875rem', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: '0.875rem', cursor: 'pointer', backgroundColor: '#fff',
                }}
              >
                취소
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!!actionLoading}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: '#dc2626', color: '#fff',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading ? '처리중...' : '거절 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 스타일 헬퍼
// ============================================

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#475569',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#334155',
};

const pageBtn: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#475569',
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
};
