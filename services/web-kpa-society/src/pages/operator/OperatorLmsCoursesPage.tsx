/**
 * OperatorLmsCoursesPage — KPA-a Operator 강의 관리
 *
 * WO-KPA-OPERATOR-LMS-MENU-AND-MANAGEMENT-PAGE-RESTORE-V1
 *
 * 구조:
 *   - 상단 헤더 + 검색
 *   - 강의 목록 DataTable (모든 상태 포함 — draft/published/archived)
 *   - RowActionMenu: 상세 이동 / 비공개 처리 / 아카이브(종료) / 완전 삭제
 *   - archived 강의만 완전 삭제 가능 (cascade: lessons, enrollments, certificates 등)
 *
 * WO-KPA-OPERATOR-LMS-BULK-ACTION-FIX-V1:
 *   - 운영자 전용 API 사용 (/kpa/lms/operator/courses/:id/archive)
 *   - requireKpaScope('kpa:operator') 기반 — 타인 강의 종료 가능
 *   - 수강 기록이 있는 강의도 아카이브 가능 (데이터 보존)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, RefreshCw, AlertCircle, Search, Loader2, Archive, EyeOff, Trash2, Check, X } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, Pagination, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { lmsApi } from '../../api';
import { toast } from '@o4o/error-handling';
import type { Course } from '../../types';

// ─── Status config ───

const STATUS_CONFIG: Record<string, { text: string; cls: string }> = {
  published: { text: '공개', cls: 'bg-green-50 text-green-700' },
  draft: { text: '준비중', cls: 'bg-amber-50 text-amber-600' },
  pending_review: { text: '검토 대기', cls: 'bg-blue-50 text-blue-700' },
  rejected: { text: '반려됨', cls: 'bg-red-50 text-red-700' },
  archived: { text: '종료', cls: 'bg-slate-100 text-slate-500' },
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending_review', label: '검토 대기' },
  { value: 'draft', label: '준비중' },
  { value: 'published', label: '공개' },
  { value: 'rejected', label: '반려됨' },
  { value: 'archived', label: '종료' },
];

// ─── Action Policy ───

const courseActionPolicy = defineActionPolicy<Course>('kpa:lms:courses', {
  rules: [
    {
      key: 'view',
      label: '상세 보기',
    },
    // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
    {
      key: 'approve',
      label: '승인 (공개)',
      visible: (row) => row.status === 'pending_review',
      confirm: (row) => ({
        title: '강의 승인',
        message: `"${row.title}" 강의를 승인하여 공개 처리합니다.`,
        confirmText: '승인',
      }),
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      visible: (row) => row.status === 'pending_review',
    },
    {
      key: 'unpublish',
      label: '비공개 처리',
      visible: (row) => row.status === 'published',
    },
    {
      key: 'archive',
      label: '강의 종료',
      variant: 'danger',
      divider: true,
      visible: (row) => row.status !== 'archived',
      confirm: (row) => ({
        title: '강의 종료',
        message: `"${row.title}" 강의를 종료(보관) 처리합니다. 공개 목록에서 제거되며, 수강 기록은 유지됩니다.`,
        variant: 'danger' as const,
        confirmText: '종료 처리',
      }),
    },
    {
      key: 'hard-delete',
      label: '완전 삭제',
      variant: 'danger',
      visible: (row) => row.status === 'archived',
      confirm: (row) => ({
        title: '완전 삭제',
        message: `"${row.title}"\n\n종��된 강의를 완전 삭제합니다.\n레슨, 수강 기록, 수료증 등 모든 관련 데이터가 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '완전 삭제',
      }),
    },
  ],
});

const COURSE_ACTION_ICONS: Record<string, React.ReactNode> = {
  view: <BookOpen className="w-4 h-4" />,
  approve: <Check className="w-4 h-4" />,
  reject: <X className="w-4 h-4" />,
  unpublish: <EyeOff className="w-4 h-4" />,
  archive: <Archive className="w-4 h-4" />,
  'hard-delete': <Trash2 className="w-4 h-4" />,
};

// ─── Helpers ───

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR');
}

// ─── Component ───

export default function OperatorLmsCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 상태 필터 + 반려 사유 modal
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; course: Course | null; reason: string; submitting: boolean }>(
    { open: false, course: null, reason: '', submitting: false },
  );
  const batch = useBatchAction();
  const PAGE_SIZE = 20;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: status 필터 적용 가능 (전체 / 검토대기 / 공개 등)
      const res = await lmsApi.getCourses({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      const data = (res as any).data ?? [];
      const pag = (res as any).pagination;
      setCourses(Array.isArray(data) ? data : []);
      setTotal(pag?.total ?? (res as any).total ?? 0);
    } catch {
      setError('강의 목록을 불러오지 못했습니다.');
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
    setSelectedIds(new Set());
  };

  // 페이지 변경 시 선택 초기화
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  const handleUnpublish = async (course: Course) => {
    try {
      await lmsApi.operatorUnpublishCourse(course.id);
      toast.success(`"${course.title}" 비공개 처리되었습니다`);
      fetchCourses();
    } catch (err: any) {
      const reason = (err as any)?.data?.error || err?.message || '비공개 처리에 실패했습니다';
      toast.error(reason);
    }
  };

  const handleArchive = async (course: Course) => {
    try {
      await lmsApi.operatorArchiveCourse(course.id);
      toast.success(`"${course.title}" 강의가 종료 처리되었습니다`);
      fetchCourses();
    } catch (err: any) {
      const reason = (err as any)?.data?.error || err?.message || '종료 처리에 실패했습니다';
      toast.error(reason);
    }
  };

  const handleHardDelete = async (course: Course) => {
    try {
      await lmsApi.operatorHardDeleteCourse(course.id);
      toast.success(`"${course.title}" 강의가 완전 삭제되었습니다`);
      fetchCourses();
    } catch (err: any) {
      const reason = (err as any)?.data?.error || err?.message || '완전 삭제에 실패했습니다';
      toast.error(reason);
    }
  };

  // WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 승인 / 반려
  const handleApprove = async (course: Course) => {
    try {
      await lmsApi.operatorApproveCourse(course.id);
      toast.success(`"${course.title}" 승인되어 공개되었습니다`);
      fetchCourses();
    } catch (err: any) {
      const reason = (err as any)?.data?.error || err?.message || '승인에 실패했습니다';
      toast.error(reason);
    }
  };

  const openRejectModal = (course: Course) => {
    setRejectModal({ open: true, course, reason: '', submitting: false });
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.course) return;
    const reason = rejectModal.reason.trim();
    if (!reason) {
      toast.error('반려 사유를 입력해주세요');
      return;
    }
    setRejectModal((s) => ({ ...s, submitting: true }));
    try {
      await lmsApi.operatorRejectCourse(rejectModal.course.id, reason);
      toast.success(`"${rejectModal.course.title}" 반려되었습니다`);
      setRejectModal({ open: false, course: null, reason: '', submitting: false });
      fetchCourses();
    } catch (err: any) {
      const msg = (err as any)?.data?.error || err?.message || '반려 처리에 실패했습니다';
      toast.error(msg);
      setRejectModal((s) => ({ ...s, submitting: false }));
    }
  };

  // ─── Bulk Actions ───

  const handleBulkUnpublish = async () => {
    const targetIds = [...selectedIds].filter((id) => {
      const c = courses.find((course) => course.id === id);
      return c?.status === 'published';
    });
    if (targetIds.length === 0) return;

    const result = await batch.executeBatch(
      async (ids) => {
        const results: { id: string; status: string; error?: string }[] = [];
        for (const id of ids) {
          try {
            await lmsApi.operatorUnpublishCourse(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            const c = courses.find((co) => co.id === id);
            const serverError = (err as any)?.data?.error;
            const reason = serverError || err?.message || '처리 실패';
            results.push({ id, status: 'failed', error: c ? `${c.title}: ${reason}` : reason });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );

    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchCourses();
    }
  };

  const handleBulkArchive = async () => {
    const targetIds = [...selectedIds].filter((id) => {
      const c = courses.find((course) => course.id === id);
      return c && c.status !== 'archived';
    });
    if (targetIds.length === 0) return;

    const result = await batch.executeBatch(
      async (ids) => {
        const results: { id: string; status: string; error?: string }[] = [];
        for (const id of ids) {
          try {
            await lmsApi.operatorArchiveCourse(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            const c = courses.find((co) => co.id === id);
            const serverError = (err as any)?.data?.error;
            const reason = serverError || err?.message || '처리 실패';
            results.push({ id, status: 'failed', error: c ? `${c.title}: ${reason}` : reason });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );

    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchCourses();
    }
  };

  const handleBulkHardDelete = async () => {
    const targetIds = [...selectedIds].filter((id) => courses.find((c) => c.id === id)?.status === 'archived');
    if (targetIds.length === 0) return;

    const result = await batch.executeBatch(
      async (ids) => {
        const results: { id: string; status: string; error?: string }[] = [];
        for (const id of ids) {
          try {
            await lmsApi.operatorHardDeleteCourse(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            const c = courses.find((co) => co.id === id);
            const serverError = (err as any)?.data?.error;
            const reason = serverError || err?.message || '삭제 실패';
            results.push({ id, status: 'failed', error: c ? `${c.title}: ${reason}` : reason });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );

    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchCourses();
    }
  };

  const selectedPublishedCount = [...selectedIds].filter((id) => courses.find((c) => c.id === id)?.status === 'published').length;
  const selectedArchivableCount = [...selectedIds].filter((id) => { const c = courses.find((co) => co.id === id); return c != null && c.status !== 'archived'; }).length;
  const selectedArchivedCount = [...selectedIds].filter((id) => courses.find((c) => c.id === id)?.status === 'archived').length;

  const bulkActions = [
    {
      key: 'unpublish',
      label: `비공개 처리 (${selectedPublishedCount})`,
      onClick: handleBulkUnpublish,
      variant: 'default' as const,
      icon: <EyeOff size={14} />,
      loading: batch.loading,
      group: 'actions',
      tooltip: '선택된 공개 강의를 일괄 비공개 처리합니다',
      visible: selectedPublishedCount > 0,
    },
    {
      key: 'archive',
      label: `강의 종료 (${selectedArchivableCount})`,
      onClick: handleBulkArchive,
      variant: 'danger' as const,
      icon: <Archive size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 강의를 일괄 종료(보관) 처리합니다',
      visible: selectedArchivableCount > 0,
      confirm: {
        title: '일괄 강의 종료',
        message: `${selectedArchivableCount}개 강의를 종료(보관) 처리합니다.\n공개 목록에서 제거되며, 수강 기록은 유지됩니다.`,
        variant: 'danger' as const,
        confirmText: '종료 처리',
      },
    },
    {
      key: 'hard-delete',
      label: `완전 삭제 (${selectedArchivedCount})`,
      onClick: handleBulkHardDelete,
      variant: 'danger' as const,
      icon: <Trash2 size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 종료 강의를 일괄 완전 삭제합니다 (되돌릴 수 없음)',
      visible: selectedArchivedCount > 0,
      confirm: {
        title: '일괄 완전 삭제',
        message: `${selectedArchivedCount}개 종료 강의를 완전 삭제합니다.\n레슨, 수강 기록, 수료증 등 모든 관련 데이터가 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '완전 삭제',
      },
    },
  ];

  // ─── Columns ───

  const columns: ListColumnDef<Course>[] = [
    {
      key: 'title',
      header: '강의명',
      render: (v) => (
        <span className="font-medium text-slate-800 text-sm block truncate max-w-xs">{v || '(제목 없음)'}</span>
      ),
    },
    {
      key: 'instructorName',
      header: '강사',
      width: '120px',
      render: (_v, row) => (
        <span className="text-sm text-slate-600">
          {(row as any).instructor?.name || row.instructorName || '-'}
        </span>
      ),
    },
    {
      key: 'category',
      header: '유형',
      width: '100px',
      render: (v) => (
        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
          {v || '-'}
        </span>
      ),
    },
    {
      key: 'lessonCount',
      header: '레슨',
      width: '70px',
      align: 'center',
      render: (v) => <span className="text-sm text-slate-500">{v ?? 0}개</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      align: 'center',
      render: (v) => {
        const sc = STATUS_CONFIG[v as string] || { text: v, cls: 'bg-slate-100 text-slate-500' };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
            {sc.text}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '100px',
      render: (v) => <span className="text-sm text-slate-500">{formatDate(v as string)}</span>,
    },
    {
      key: '_actions',
      header: '',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(courseActionPolicy, row, {
            view: () => navigate(`/lms/course/${row.id}`),
            approve: () => handleApprove(row),
            reject: () => openRejectModal(row),
            unpublish: () => handleUnpublish(row),
            archive: () => handleArchive(row),
            'hard-delete': () => handleHardDelete(row),
          }, { icons: COURSE_ACTION_ICONS })}
        />
      ),
    },
  ];

  // ─── Render ───

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>강의 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertCircle size={28} style={{ margin: '0 auto 12px', color: '#dc2626' }} />
        <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{error}</p>
        <button onClick={fetchCourses} style={retryBtnStyle}>
          <RefreshCw size={14} /> 다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>강의 관리</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            전체 강의 조회 · 상태 관리 · 종료 처리 — 총 {total}개
          </p>
        </div>
        <button onClick={fetchCourses} style={refreshBtnStyle}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* 정책 안내 */}
      <div style={{ padding: '10px 14px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#0c4a6e' }}>
        강의 데이터와 수강 기록 보존을 위해 <strong>종료(보관)</strong> 처리합니다. 종료된 강의는 <strong>완전 삭제</strong>할 수 있습니다.
      </div>

      {/* Search + Status Filter — WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1 */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="강의명 검색..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', minWidth: 130, cursor: 'pointer' }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="submit" style={searchBtnStyle}>검색</button>
        {(search || statusFilter) && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1); }} style={clearBtnStyle}>
            초기화
          </button>
        )}
      </form>

      {/* Bulk Actions */}
      <div style={{ marginBottom: selectedIds.size > 0 ? 12 : 0 }}>
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          actions={bulkActions}
        />
      </div>

      {/* Table */}
      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>
            {search ? `"${search}"에 해당하는 강의가 없습니다` : '등록된 강의가 없습니다'}
          </p>
        </div>
      ) : (
        <>
          <DataTable<Course>
            columns={columns}
            data={courses}
            rowKey="id"
            emptyMessage="강의가 없습니다"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={Math.ceil(total / PAGE_SIZE)}
              onPageChange={setPage}
              total={total}
            />
          )}
        </>
      )}

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); fetchCourses(); }}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 반려 사유 입력 modal */}
      {rejectModal.open && rejectModal.course && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !rejectModal.submitting) setRejectModal({ open: false, course: null, reason: '', submitting: false }); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, marginBottom: 8 }}>강의 반려</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, marginBottom: 16 }}>
              "<strong>{rejectModal.course.title}</strong>" 반려 사유를 입력해주세요. 강사에게 표시되며 수정 후 재요청 시 참고합니다.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((s) => ({ ...s, reason: e.target.value }))}
              placeholder="예: 강의 본문이 비어있습니다. 레슨을 추가한 뒤 다시 요청해주세요."
              rows={5}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 14, color: '#1e293b', boxSizing: 'border-box', outline: 'none', resize: 'vertical',
              }}
              autoFocus
              disabled={rejectModal.submitting}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setRejectModal({ open: false, course: null, reason: '', submitting: false })}
                disabled={rejectModal.submitting}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectModal.submitting || !rejectModal.reason.trim()}
                style={{
                  padding: '8px 16px', background: rejectModal.submitting || !rejectModal.reason.trim() ? '#fca5a5' : '#dc2626',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: rejectModal.submitting || !rejectModal.reason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {rejectModal.submitting ? '처리 중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───

const retryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  backgroundColor: '#fff',
  color: '#475569',
};

const refreshBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  backgroundColor: '#fff',
  color: '#475569',
};

const searchBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  flexShrink: 0,
};

const clearBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  flexShrink: 0,
};
