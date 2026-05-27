/**
 * QualificationRequestsPage — LMS 강사 자격 신청 관리 (GlycoPharm 운영자)
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-LMS-QUALIFICATION-WORKFLOW-V1
 *
 * KPA QualificationRequestsPage 이식.
 * serviceKey='glycopharm' — /api/v1/glycopharm/qualifications/requests
 */

import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Trash2 } from 'lucide-react';
import { RowActionMenu, ActionBar, BaseDetailDrawer } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  glycopharmQualificationApi,
  getQualificationLabel,
  QUALIFICATION_TYPE_LABELS,
  type QualificationRequest,
  type QualificationType,
} from '../../api/qualificationRequests';

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
    <div className="flex flex-wrap gap-1.5">
      {items.map((tag, i) => (
        <span key={i} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
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
          <div key={k} className="flex gap-3 mb-3 text-sm flex-wrap">
            <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">{label}</span>
            <span className="text-slate-700 flex-1 min-w-0 break-words">
              {Array.isArray(v) ? <TagList items={v} /> : String(v || '-')}
            </span>
          </div>
        );
      })}
      {Object.entries(data).filter(([k]) => !displayed.has(k)).map(([k, v]) => (
        <div key={k} className="flex gap-3 mb-3 text-sm flex-wrap">
          <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">{k}</span>
          <span className="text-slate-700 flex-1 min-w-0">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </div>
      ))}
    </>
  );
}

const qualificationActionPolicy = defineActionPolicy<QualificationRequest>('glycopharm:qualification:requests', {
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
      const res = await glycopharmQualificationApi.listRequests({
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
      const res = await glycopharmQualificationApi.reviewRequest(selectedRequest.id, {
        status,
        reviewNote: reviewNote || undefined,
      });
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
      await glycopharmQualificationApi.deleteRequest(id);
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
      (batchIds) => glycopharmQualificationApi.batchDeleteRequests(batchIds),
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
        const name = row.user_name || (row.request_data as any)?.displayName;
        const openDetail = () => { setSelectedRequest(row); setReviewNote(''); setSuccess(null); };
        return (
          <div>
            <button
              type="button"
              onClick={openDetail}
              className="text-left bg-transparent border-0 p-0 cursor-pointer"
            >
              {name
                ? <p className="text-sm font-medium text-blue-600 hover:underline">{name}</p>
                : <p className="text-xs text-blue-400 font-mono hover:underline">{row.user_id.slice(0, 8)}…</p>
              }
            </button>
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
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-5">강사 자격 신청 관리</h1>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-4">
          {success}
        </div>
      )}

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md"
        >
          <option value="">전체 상태</option>
          <option value="pending">검토 중</option>
          <option value="approved">승인됨</option>
          <option value="rejected">반려됨</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-300 rounded-md"
        >
          <option value="">전체 자격</option>
          {(Object.entries(QUALIFICATION_TYPE_LABELS) as [QualificationType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500 ml-auto">총 {total}건</span>
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
        emptyMessage="강사 자격 신청 내역이 없습니다"
        tableId="gp-qualification-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => { setSelectedRequest(row); setReviewNote(''); setSuccess(null); }}
      />

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-5">
          <button
            className="px-4 py-2 text-sm border border-slate-300 rounded-md cursor-pointer bg-white disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            className="px-4 py-2 text-sm border border-slate-300 rounded-md cursor-pointer bg-white disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </button>
        </div>
      )}

      {/* 검토 Drawer */}
      <BaseDetailDrawer
        open={!!selectedRequest}
        onClose={() => { setSelectedRequest(null); setReviewNote(''); }}
        title={selectedRequest ? (selectedRequest.status === 'pending' ? '자격 신청 검토' : '자격 신청 상세') : ''}
        width={560}
        actions={selectedRequest?.status === 'pending' ? [
          {
            label: '반려',
            onClick: () => handleReview('rejected'),
            variant: 'danger' as const,
            loading: reviewing,
            disabled: reviewing,
          },
          {
            label: '승인',
            onClick: () => handleReview('approved'),
            variant: 'primary' as const,
            loading: reviewing,
            disabled: reviewing,
          },
        ] : []}
      >
        {selectedRequest && (
          <div>
            {/* 신청자 정보 */}
            <div className="px-4 py-3 bg-slate-50 rounded-lg mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">신청자</p>
              <p className="text-base font-semibold text-slate-800 mb-0.5">
                {selectedRequest.user_name || (selectedRequest.request_data as any)?.displayName || '-'}
              </p>
              {selectedRequest.user_email && (
                <p className="text-sm text-slate-500">{selectedRequest.user_email}</p>
              )}
              {selectedRequest.user_created_at && (
                <p className="text-xs text-slate-400 mt-1">
                  가입일: {new Date(selectedRequest.user_created_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>

            <div className="flex gap-3 mb-3 text-sm flex-wrap">
              <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">신청 유형</span>
              <span>{getQualificationLabel(selectedRequest.qualification_type)}</span>
            </div>
            <div className="flex gap-3 mb-3 text-sm flex-wrap">
              <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">신청일</span>
              <span>{new Date(selectedRequest.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <div className="flex gap-3 mb-3 text-sm flex-wrap items-center">
              <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">상태</span>
              {(() => {
                const sc = statusConfig[selectedRequest.status] || { text: selectedRequest.status, cls: 'bg-slate-100 text-slate-600' };
                return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
              })()}
            </div>

            {(selectedRequest.qualification_type === 'instructor' || selectedRequest.qualification_type === 'lms_creator')
              ? <InstructorRequestDetail data={selectedRequest.request_data as Record<string, any>} />
              : Object.entries(selectedRequest.request_data).map(([k, v]) => (
                  <div key={k} className="flex gap-3 mb-3 text-sm flex-wrap">
                    <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">{k}</span>
                    <span className="text-slate-700">{String(v)}</span>
                  </div>
                ))
            }

            {selectedRequest.status !== 'pending' && (
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex gap-3 mb-3 text-sm flex-wrap">
                  <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">검토일</span>
                  <span className="text-slate-700">
                    {selectedRequest.reviewed_at
                      ? new Date(selectedRequest.reviewed_at).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex gap-3 mb-3 text-sm flex-wrap">
                  <span className="font-semibold text-slate-600 min-w-[90px] shrink-0 pt-0.5">검토 의견</span>
                  <span className="text-slate-700 whitespace-pre-wrap break-words">{selectedRequest.review_note || '-'}</span>
                </div>
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">검토 의견 (선택)</label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="승인/반려 사유를 입력해 주세요"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md resize-y box-border"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
