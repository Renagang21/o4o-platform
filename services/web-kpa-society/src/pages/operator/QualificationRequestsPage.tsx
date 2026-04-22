/**
 * QualificationRequestsPage — 자격 신청 관리 (운영자)
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 */

import { useState, useEffect, useCallback } from 'react';
import {
  qualificationApi,
  getQualificationLabel,
  QUALIFICATION_TYPE_LABELS,
  type QualificationRequest,
  type QualificationType,
} from '../../api/qualification';
import { colors } from '../../styles/theme';

const STATUS_LABELS: Record<string, string> = {
  pending: '검토 중',
  approved: '승인됨',
  rejected: '반려됨',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

const INSTRUCTOR_FIELD_LABELS: Record<string, string> = {
  displayName: '표시 이름',
  organization: '소속 기관',
  jobTitle: '직책',
  expertise: '전문 분야',
  bio: '자기소개',
  experience: '경력 사항',
  lectureTopics: '강의 주제',
  lecturePlanSummary: '강의 계획 요약',
  portfolioUrl: '포트폴리오 URL',
};

function TagList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map((tag, i) => (
        <span key={i} style={{ padding: '2px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function InstructorRequestDetail({ data }: { data: Record<string, any> }) {
  const orderedKeys = ['displayName', 'organization', 'jobTitle', 'expertise', 'bio', 'experience', 'lectureTopics', 'lecturePlanSummary', 'portfolioUrl'];
  const displayed = new Set<string>();

  return (
    <>
      {orderedKeys.map(k => {
        if (!(k in data)) return null;
        displayed.add(k);
        const v = data[k];
        const label = INSTRUCTOR_FIELD_LABELS[k] || k;
        return (
          <div key={k} style={styles.detailRow}>
            <span style={styles.detailLabel}>{label}</span>
            <span style={{ ...styles.detailValue }}>
              {Array.isArray(v) ? <TagList items={v} /> : String(v || '-')}
            </span>
          </div>
        );
      })}
      {Object.entries(data).filter(([k]) => !displayed.has(k)).map(([k, v]) => (
        <div key={k} style={styles.detailRow}>
          <span style={styles.detailLabel}>{k}</span>
          <span style={styles.detailValue}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </div>
      ))}
    </>
  );
}

export default function QualificationRequestsPage() {
  const [requests, setRequests] = useState<QualificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState<QualificationRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await qualificationApi.listRequests({
        status: statusFilter || undefined,
        qualificationType: typeFilter || undefined,
        page,
        limit: 20,
      });
      if (res.data.success) {
        setRequests(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    setReviewing(true);
    setError(null);
    try {
      const res = await qualificationApi.reviewRequest(selectedRequest.id, { status, reviewNote: reviewNote || undefined });
      if (res.data.success) {
        setSuccess(status === 'approved' ? '승인되었습니다.' : '반려되었습니다.');
        setSelectedRequest(null);
        setReviewNote('');
        await load();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || '처리에 실패했습니다.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>자격 신청 관리</h1>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {success && <div style={styles.successBanner}>{success}</div>}

      {/* 필터 */}
      <div style={styles.filters}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={styles.select}>
          <option value="">전체 상태</option>
          <option value="pending">검토 중</option>
          <option value="approved">승인됨</option>
          <option value="rejected">반려됨</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} style={styles.select}>
          <option value="">전체 자격</option>
          {(Object.entries(QUALIFICATION_TYPE_LABELS) as [QualificationType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span style={styles.totalBadge}>총 {total}건</span>
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={styles.loading}>불러오는 중...</div>
      ) : requests.length === 0 ? (
        <div style={styles.empty}>신청 내역이 없습니다.</div>
      ) : (
        <div style={styles.table}>
          {/* 헤더 */}
          <div style={styles.tableHeader}>
            <span style={{ flex: 2 }}>신청자 ID</span>
            <span style={{ flex: 1.5 }}>자격 유형</span>
            <span style={{ flex: 1 }}>상태</span>
            <span style={{ flex: 1.5 }}>신청일</span>
            <span style={{ flex: 1 }}>관리</span>
          </div>
          {requests.map(r => (
            <div key={r.id} style={styles.tableRow}>
              <span style={{ flex: 2, fontSize: '13px', color: colors.neutral600 }}>{r.user_id.slice(0, 8)}...</span>
              <span style={{ flex: 1.5 }}>{getQualificationLabel(r.qualification_type)}</span>
              <span style={{ flex: 1 }}>
                <span style={{ ...styles.statusBadge, backgroundColor: STATUS_COLORS[r.status] }}>
                  {STATUS_LABELS[r.status]}
                </span>
              </span>
              <span style={{ flex: 1.5, fontSize: '13px', color: colors.neutral500 }}>
                {new Date(r.created_at).toLocaleDateString('ko-KR')}
              </span>
              <span style={{ flex: 1 }}>
                {r.status === 'pending' && (
                  <button style={styles.reviewBtn} onClick={() => { setSelectedRequest(r); setReviewNote(''); setSuccess(null); }}>
                    검토
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button style={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            다음
          </button>
        </div>
      )}

      {/* 검토 모달 */}
      {selectedRequest && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRequest(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>자격 신청 검토</h2>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>자격 유형</span>
              <span>{getQualificationLabel(selectedRequest.qualification_type)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>신청일</span>
              <span>{new Date(selectedRequest.created_at).toLocaleDateString('ko-KR')}</span>
            </div>

            {selectedRequest.qualification_type === 'instructor'
              ? <InstructorRequestDetail data={selectedRequest.request_data as Record<string, any>} />
              : Object.entries(selectedRequest.request_data).map(([k, v]) => (
                  <div key={k} style={styles.detailRow}>
                    <span style={styles.detailLabel}>{k}</span>
                    <span style={styles.detailValue}>{String(v)}</span>
                  </div>
                ))
            }

            <div style={styles.formGroup}>
              <label style={styles.label}>검토 의견 (선택)</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="승인/반려 사유를 입력해 주세요"
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setSelectedRequest(null)}>
                취소
              </button>
              <button
                style={{ ...styles.rejectBtn, ...(reviewing ? styles.disabledBtn : {}) }}
                onClick={() => handleReview('rejected')}
                disabled={reviewing}
              >
                반려
              </button>
              <button
                style={{ ...styles.approveBtn, ...(reviewing ? styles.disabledBtn : {}) }}
                onClick={() => handleReview('approved')}
                disabled={reviewing}
              >
                {reviewing ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px 32px' },
  title: { fontSize: '22px', fontWeight: 700, color: colors.neutral900, marginBottom: '20px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '14px' },
  successBanner: { padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', marginBottom: '16px', fontSize: '14px' },
  filters: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const },
  select: { padding: '8px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px' },
  totalBadge: { fontSize: '14px', color: colors.neutral500, marginLeft: 'auto' },
  loading: { padding: '40px', textAlign: 'center', color: colors.neutral400 },
  empty: { padding: '40px', textAlign: 'center', color: colors.neutral400 },
  table: { backgroundColor: colors.white, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '12px 16px', backgroundColor: colors.neutral50, fontSize: '13px', fontWeight: 600, color: colors.neutral600, borderBottom: `1px solid ${colors.neutral200}` },
  tableRow: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${colors.neutral100}`, fontSize: '14px', color: colors.neutral800 },
  statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, color: colors.white },
  reviewBtn: { padding: '5px 12px', fontSize: '13px', color: colors.primary, backgroundColor: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '5px', cursor: 'pointer' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' },
  pageBtn: { padding: '8px 16px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', cursor: 'pointer', backgroundColor: colors.white },
  pageInfo: { fontSize: '14px', color: colors.neutral600 },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { backgroundColor: colors.white, borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' as const },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: colors.neutral900, marginBottom: '20px' },
  detailRow: { display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px' },
  detailLabel: { fontWeight: 600, color: colors.neutral600, minWidth: '80px' },
  detailValue: { color: colors.neutral700, flex: 1, whiteSpace: 'pre-wrap' as const },
  formGroup: { marginTop: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: 500, color: colors.neutral700, marginBottom: '6px' },
  textarea: { width: '100%', padding: '10px 12px', fontSize: '14px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  cancelBtn: { padding: '9px 18px', fontSize: '14px', color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  rejectBtn: { padding: '9px 18px', fontSize: '14px', fontWeight: 500, color: colors.white, backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  approveBtn: { padding: '9px 18px', fontSize: '14px', fontWeight: 500, color: colors.white, backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  disabledBtn: { opacity: 0.6, cursor: 'not-allowed' },
};
