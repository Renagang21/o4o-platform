/**
 * QualificationRequestsPage — 자격 신청 관리 (운영자)
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3: div-table → DataTable 표준 전환
 */

import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Trash2 } from 'lucide-react';
import { RowActionMenu, ActionBar } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  qualificationApi,
  getQualificationLabel,
  QUALIFICATION_TYPE_LABELS,
  type QualificationRequest,
  type QualificationType,
} from '../../api/qualification';
import { colors } from '../../styles/theme';

const statusConfig: Record<string, { text: string; cls: string }> = {
  pending: { text: '검토 중', cls: 'bg-amber-100 text-amber-700' },
  approved: { text: '승인됨', cls: 'bg-green-100 text-green-700' },
  rejected: { text: '반려됨', cls: 'bg-red-100 text-red-700' },
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
  plannedCourses: '개설 예정 강의',
  lectureSubjects: '주요 강의 주제/분야',
  targetAudience: '예상 강의 대상',
  lectureFormat: '강의 방식',
  referenceLinks: '참고 링크',
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
  const orderedKeys = [
    'displayName', 'organization', 'jobTitle', 'expertise',
    'bio', 'experience',
    'lectureTopics', 'lecturePlanSummary', 'portfolioUrl',
    'plannedCourses', 'lectureSubjects', 'targetAudience', 'lectureFormat', 'referenceLinks',
  ];
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

const qualificationActionPolicy = defineActionPolicy<QualificationRequest>('kpa:qualification:requests', {
  rules: [
    {
      key: 'review',
      label: '검토',
      visible: (row: QualificationRequest) => row.status === 'pending',
    },
    {
      key: 'detail',
      label: '상세보기',
      visible: (row: QualificationRequest) => row.status !== 'pending',
    },
    {
      key: 'delete',
      label: '삭제',
      visible: () => true,
    },
  ],
});

const QUALIFICATION_ACTION_ICONS: Record<string, React.ReactNode> = {
  review: <FileCheck className="w-4 h-4" />,
  detail: <FileCheck className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

export default function QualificationRequestsPage() {
  const [requests, setRequests] = useState<QualificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [selectedRequest, setSelectedRequest] = useState<QualificationRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const batch = useBatchAction();

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

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 신청 이력을 삭제하시겠습니까?\n승인된 자격 및 역할은 유지됩니다.')) return;
    setError(null);
    try {
      await qualificationApi.deleteRequest(id);
      setSuccess('삭제되었습니다.');
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || '삭제에 실패했습니다.');
    }
  }, [load]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}건의 신청 이력을 삭제하시겠습니까?\n승인된 자격 및 역할은 유지됩니다.`)) return;
    const ids = [...selectedIds];
    const result = await batch.executeBatch(
      (batchIds) => qualificationApi.batchDeleteRequests(batchIds),
      ids,
    );
    if (result) {
      setSelectedIds(new Set());
      setSuccess(`${ids.length}건 삭제가 완료되었습니다.`);
      await load();
    }
  }, [selectedIds, batch, load]);

  const columns: ListColumnDef<QualificationRequest>[] = [
    {
      key: 'user_id',
      header: '신청자',
      render: (_v, row) => {
        const accountName = row.user_name;
        const displayName = (row.request_data as any)?.displayName;
        const name = accountName || displayName;
        const openDetail = () => { setSelectedRequest(row); setReviewNote(''); setSuccess(null); };
        return (
          <div>
            {name
              ? (
                <button
                  type="button"
                  onClick={openDetail}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' as const }}
                >
                  <p className="text-sm font-medium text-blue-600 hover:underline">{name}</p>
                </button>
              )
              : (
                <button
                  type="button"
                  onClick={openDetail}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' as const }}
                >
                  <p className="text-xs text-blue-400 font-mono hover:underline">{row.user_id.slice(0, 8)}...</p>
                </button>
              )
            }
            {row.user_email && <p className="text-xs text-slate-500">{row.user_email}</p>}
          </div>
        );
      },
    },
    {
      key: 'qualification_type',
      header: '신청 유형',
      render: (value) => <span className="text-sm text-slate-700">{getQualificationLabel(value)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center' as const,
      render: (value) => {
        const sc = statusConfig[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
      },
    },
    {
      key: 'created_at',
      header: '신청일',
      render: (value) => (
        <span className="text-sm text-slate-500">
          {new Date(value).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'reviewed_at',
      header: '검토일',
      render: (_v, row) => (
        <span className="text-sm text-slate-500">
          {row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString('ko-KR') : '-'}
        </span>
      ),
    },
    {
      key: 'review_note',
      header: '검토 의견',
      render: (_v, row) => {
        const note = row.review_note;
        if (!note) return <span className="text-sm text-slate-400">-</span>;
        const truncated = note.length > 30 ? note.slice(0, 30) + '…' : note;
        return <span className="text-sm text-slate-600" title={note}>{truncated}</span>;
      },
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center' as const,
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(qualificationActionPolicy, row, {
            review: () => { setSelectedRequest(row); setReviewNote(''); setSuccess(null); },
            detail: () => { setSelectedRequest(row); setReviewNote(''); setSuccess(null); },
            delete: () => handleDelete(row.id),
          }, { icons: QUALIFICATION_ACTION_ICONS })}
        />
      ),
    },
  ];

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

      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'bulk-delete',
            label: `선택 삭제 (${selectedIds.size})`,
            onClick: handleBulkDelete,
            variant: 'danger' as const,
            icon: <Trash2 size={14} />,
            loading: batch.loading,
            group: 'danger',
            tooltip: '선택된 신청 이력을 삭제합니다. 승인된 자격 및 역할은 유지됩니다.',
            visible: selectedIds.size > 0,
          },
        ]}
      />

      <DataTable<QualificationRequest>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={loading}
        emptyMessage="신청 내역이 없습니다"
        tableId="kpa-qualification-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

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
            <h2 style={styles.modalTitle}>
              {selectedRequest.status === 'pending' ? '자격 신청 검토' : '자격 신청 상세'}
            </h2>

            {/* 신청자 정보 */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>신청자</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                {selectedRequest.user_name || (selectedRequest.request_data as any)?.displayName || '-'}
              </p>
              {selectedRequest.user_email && (
                <p style={{ fontSize: '13px', color: '#64748b' }}>{selectedRequest.user_email}</p>
              )}
              {selectedRequest.user_created_at && (
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  가입일: {new Date(selectedRequest.user_created_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>신청 유형</span>
              <span>{getQualificationLabel(selectedRequest.qualification_type)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>신청일</span>
              <span>{new Date(selectedRequest.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>상태</span>
              {(() => {
                const sc = statusConfig[selectedRequest.status] || { text: selectedRequest.status, cls: 'bg-slate-100 text-slate-600' };
                return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
              })()}
            </div>

            {(selectedRequest.qualification_type === 'instructor' || selectedRequest.qualification_type === 'lms_creator')
              ? <InstructorRequestDetail data={selectedRequest.request_data as Record<string, any>} />
              : Object.entries(selectedRequest.request_data).map(([k, v]) => (
                  <div key={k} style={styles.detailRow}>
                    <span style={styles.detailLabel}>{k}</span>
                    <span style={styles.detailValue}>{String(v)}</span>
                  </div>
                ))
            }

            {selectedRequest.status !== 'pending' ? (
              <>
                <div style={{ ...styles.formGroup, borderTop: `1px solid ${colors.neutral200}`, paddingTop: '16px', marginTop: '8px' }}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>검토일</span>
                    <span style={styles.detailValue}>
                      {selectedRequest.reviewed_at
                        ? new Date(selectedRequest.reviewed_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>검토 의견</span>
                    <span style={styles.detailValue}>{selectedRequest.review_note || '-'}</span>
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={() => setSelectedRequest(null)}>닫기</button>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
