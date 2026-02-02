/**
 * ServiceEnrollmentManagementPage - 서비스 이용 신청 관리
 *
 * WO-ADMIN-SERVICE-ENROLLMENT-APPROVAL-V1
 *
 * 운영자가 플랫폼 서비스 신청을 조회하고 승인/반려 처리.
 * 서비스 비종속: pharmacy, glycopharm 등 모든 승인 기반 서비스 공통.
 *
 * WordPress Admin UI 스타일 (KpaOperatorDashboardPage 패턴 준수)
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from '../../components/admin';
import {
  listAdminServices,
  listEnrollments,
  reviewEnrollment,
} from '../../api/admin-platform-services';
import type { AdminServiceItem, EnrollmentItem } from '../../api/admin-platform-services';
import { colors } from '../../styles/theme';

type StatusFilter = 'applied' | 'approved' | 'rejected' | 'all';

const STATUS_LABELS: Record<string, string> = {
  applied: '대기',
  approved: '승인',
  rejected: '반려',
};

const STATUS_COLORS: Record<string, string> = {
  applied: '#d97706',  // amber
  approved: '#059669', // green
  rejected: '#dc2626', // red
};

export function ServiceEnrollmentManagementPage() {
  const [services, setServices] = useState<AdminServiceItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('applied');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // 서비스 목록 로딩
  useEffect(() => {
    listAdminServices()
      .then((items) => {
        const approvalServices = items.filter((s) => s.approvalRequired);
        setServices(approvalServices);
        if (approvalServices.length > 0) {
          setSelectedService(approvalServices[0].code);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 신청 목록 로딩
  const loadEnrollments = useCallback(async () => {
    if (!selectedService) return;
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const items = await listEnrollments(selectedService, status);
      setEnrollments(items);
    } catch {
      setEnrollments([]);
    }
  }, [selectedService, statusFilter]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  // 승인 처리
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await reviewEnrollment(id, 'approved');
      await loadEnrollments();
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  // 반려 처리
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await reviewEnrollment(id, 'rejected', rejectNote || undefined);
      setRejectingId(null);
      setRejectNote('');
      await loadEnrollments();
    } catch {
      // silent
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectForm = (id: string) => {
    setRejectingId(id);
    setRejectNote('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectNote('');
  };

  if (loading) {
    return (
      <div>
        <AdminHeader title="서비스 신청 관리" subtitle="서비스 이용 신청 승인/반려" />
        <div style={wp.content}>
          <p style={wp.loadingText}>불러오는 중...</p>
        </div>
      </div>
    );
  }

  const selectedServiceName = services.find((s) => s.code === selectedService)?.name || '';

  return (
    <div>
      <AdminHeader title="서비스 신청 관리" subtitle="서비스 이용 신청 승인/반려" />

      <div style={wp.content}>
        {/* ─── 필터 영역 ─── */}
        <div style={wp.wpBox}>
          <div style={wp.filterBar}>
            <label style={wp.filterLabel}>서비스</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={wp.filterSelect}
            >
              {services.map((svc) => (
                <option key={svc.code} value={svc.code}>
                  {svc.iconEmoji || ''} {svc.name}
                </option>
              ))}
            </select>

            <label style={{ ...wp.filterLabel, marginLeft: '16px' }}>상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={wp.filterSelect}
            >
              <option value="applied">대기</option>
              <option value="approved">승인</option>
              <option value="rejected">반려</option>
              <option value="all">전체</option>
            </select>

            <span style={wp.filterCount}>{enrollments.length}건</span>
          </div>
        </div>

        {/* ─── 신청 목록 ─── */}
        <div style={wp.wpBox}>
          <div style={wp.wpBoxHeader}>
            <div>
              <h2 style={wp.wpBoxTitle}>
                {selectedServiceName} 신청 목록
              </h2>
              <span style={wp.wpBoxSubtitle}>
                {statusFilter === 'all'
                  ? '전체 상태'
                  : `${STATUS_LABELS[statusFilter]} 상태`} 표시 중
              </span>
            </div>
            <span style={wp.itemCount}>{enrollments.length}개 항목</span>
          </div>

          {enrollments.length > 0 ? (
            <div style={wp.listContainer}>
              {enrollments.map((item) => (
                <div key={item.id}>
                  <div style={wp.listItem}>
                    <div style={wp.listItemLeft}>
                      <div
                        style={{
                          ...wp.listItemAccent,
                          backgroundColor: STATUS_COLORS[item.status] || '#94a3b8',
                        }}
                      />
                      <div style={wp.listItemContent}>
                        <div style={wp.listItemTitle}>
                          {item.user?.name || item.userId}
                        </div>
                        <div style={wp.listItemMeta}>
                          {item.user?.email || ''}
                          {item.appliedAt && (
                            <> · 신청일: {new Date(item.appliedAt).toLocaleDateString('ko-KR')}</>
                          )}
                          {item.note && <> · 사유: {item.note}</>}
                        </div>
                      </div>
                    </div>

                    <div style={wp.listItemRight}>
                      <span
                        style={{
                          ...wp.badge,
                          color: STATUS_COLORS[item.status] || '#6b7280',
                          borderColor: STATUS_COLORS[item.status] || '#d1d5db',
                        }}
                      >
                        {STATUS_LABELS[item.status] || item.status}
                      </span>

                      {item.status === 'applied' && (
                        <div style={wp.actionButtons}>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={processingId === item.id}
                            style={wp.approveBtn}
                          >
                            {processingId === item.id ? '...' : '승인'}
                          </button>
                          <button
                            onClick={() => openRejectForm(item.id)}
                            disabled={processingId === item.id}
                            style={wp.rejectBtn}
                          >
                            반려
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 반려 사유 입력 인라인 */}
                  {rejectingId === item.id && (
                    <div style={wp.rejectForm}>
                      <input
                        type="text"
                        placeholder="반려 사유 (선택)"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        style={wp.rejectInput}
                      />
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={processingId === item.id}
                        style={wp.rejectConfirmBtn}
                      >
                        반려 확인
                      </button>
                      <button onClick={cancelReject} style={wp.cancelBtn}>
                        취소
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={wp.emptyState}>
              <p style={wp.emptyText}>해당 조건의 신청이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WordPress Admin 스타일 ──────────────────────────────────
const wp: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    backgroundColor: '#f0f0f1',
  },
  loadingText: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: '48px 0',
    margin: 0,
  },

  // WordPress Box
  wpBox: {
    backgroundColor: colors.white,
    border: '1px solid #c3c4c7',
    borderRadius: '0',
    boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
  },
  wpBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid #c3c4c7',
  },
  wpBoxTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1d2327',
    margin: 0,
  },
  wpBoxSubtitle: {
    fontSize: '13px',
    color: '#646970',
    marginTop: '2px',
    display: 'block',
  },
  itemCount: {
    fontSize: '13px',
    color: '#646970',
    whiteSpace: 'nowrap',
  },

  // Filter bar
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#f6f7f7',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1d2327',
  },
  filterSelect: {
    fontSize: '13px',
    padding: '4px 8px',
    border: '1px solid #8c8f94',
    borderRadius: '3px',
    backgroundColor: colors.white,
    color: '#2c3338',
    outline: 'none',
  },
  filterCount: {
    fontSize: '13px',
    color: '#646970',
    marginLeft: 'auto',
  },

  // List
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #dcdcde',
  },
  listItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  listItemAccent: {
    width: '4px',
    height: '40px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  listItemContent: {
    minWidth: 0,
  },
  listItemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1d2327',
  },
  listItemMeta: {
    fontSize: '13px',
    color: '#646970',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },

  // Badge
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
  },

  // Action buttons
  actionButtons: {
    display: 'flex',
    gap: '6px',
  },
  approveBtn: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: '#059669',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#dc2626',
    backgroundColor: colors.white,
    border: '1px solid #dc2626',
    borderRadius: '3px',
    cursor: 'pointer',
  },

  // Reject form inline
  rejectForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 20px 12px 56px',
    borderBottom: '1px solid #dcdcde',
    backgroundColor: '#fef2f2',
  },
  rejectInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #fca5a5',
    borderRadius: '3px',
    outline: 'none',
    backgroundColor: colors.white,
  },
  rejectConfirmBtn: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  cancelBtn: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#646970',
    backgroundColor: colors.white,
    border: '1px solid #8c8f94',
    borderRadius: '3px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#a7aaad',
    margin: 0,
  },
};

export default ServiceEnrollmentManagementPage;
