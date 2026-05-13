/**
 * CourseListPage — /instructor/courses
 *
 * WO-O4O-LMS-INSTRUCTOR-COURSES-DATATABLE-CANONICAL-V1
 *
 * O4O canonical table 패턴 적용:
 *   - BaseTable + RowActionMenu + ActionBar (@o4o/ui)
 *   - checkbox selection + 선택 삭제 + 개별 삭제 (confirm 포함)
 *   - row click → 강의 관리 페이지 이동
 *   - emptyMessage CTA 포함
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BaseTable,
  RowActionMenu,
  ActionBar,
  type O4OColumn,
  type RowActionItem,
  type ActionBarAction,
} from '@o4o/ui';
import { lmsInstructorApi, type Course } from '../../../api/lms-instructor';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 중',
  published: '발행됨',
  archived: '보관됨',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:          { bg: '#f3f4f6', text: '#6b7280' },
  pending_review: { bg: '#fef3c7', text: '#92400e' },
  published:      { bg: '#d1fae5', text: '#065f46' },
  archived:       { bg: '#fff7ed', text: '#9a3412' },
};

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CourseListPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  // ─── 데이터 로드 ──────────────────────────────────────────────────────────

  const fetchCourses = useCallback(() => {
    setLoading(true);
    lmsInstructorApi.myCourses()
      .then((res: any) => {
        const list = res.data?.data;
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch((err: any) => {
        if (err?.response?.data?.code === 'INSTRUCTOR_REQUIRED') {
          navigate('/instructor');
        } else {
          setError('강의 목록을 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ─── 삭제 핸들러 ─────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await lmsInstructorApi.deleteCourse(id);
      setCourses(prev => prev.filter(c => c.id !== id));
      setSelectedKeys(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      alert('강의 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedKeys);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map(id => lmsInstructorApi.deleteCourse(id)));
      setCourses(prev => prev.filter(c => !ids.includes(c.id)));
      setSelectedKeys(new Set());
    } catch {
      alert('일부 강의 삭제에 실패했습니다.');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedKeys]);

  // ─── 컬럼 정의 ───────────────────────────────────────────────────────────

  const columns = useMemo<O4OColumn<Course>[]>(() => [
    // 선택 컬럼 (BaseTable selectable 계약: key='_select', system=true, render 필수)
    {
      key: '_select',
      header: '',
      width: '44px',
      system: true,
      align: 'center' as const,
      onCellClick: () => {},
      render: (_v: unknown, row: Course) => (
        <input
          type="checkbox"
          checked={selectedKeys.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedKeys((prev) => {
              const next = new Set(prev);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      ),
    },
    // 썸네일
    {
      key: 'thumbnail',
      header: '썸네일',
      width: '80px',
      render: (_v, row) =>
        row.thumbnail ? (
          <img
            src={row.thumbnail}
            alt={row.title}
            style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6 }}
          />
        ) : (
          <div
            style={{
              width: 60, height: 44, borderRadius: 6,
              background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}
          >
            📚
          </div>
        ),
    },
    // 강의명
    {
      key: 'title',
      header: '강의명',
      render: (_v, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{row.title}</div>
          {row.description && (
            <div
              style={{
                fontSize: 12, color: '#6b7280', marginTop: 2,
                maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    // 상태
    {
      key: 'status',
      header: '상태',
      width: '100px',
      align: 'center',
      render: (_v, row) => {
        const s = STATUS_COLOR[row.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
        return (
          <span
            style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 999,
              fontSize: 11, fontWeight: 600,
              background: s.bg, color: s.text,
            }}
          >
            {STATUS_LABEL[row.status] ?? row.status}
          </span>
        );
      },
    },
    // 수강생 수
    {
      key: 'currentEnrollments',
      header: '수강생',
      width: '80px',
      align: 'center',
      render: (_v, row) => (
        <span style={{ fontSize: 13, color: '#374151' }}>
          {row.currentEnrollments ?? 0}명
        </span>
      ),
    },
    // 생성일
    {
      key: 'createdAt',
      header: '생성일',
      width: '100px',
      align: 'center',
      render: (_v, row) => (
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(row.createdAt)}</span>
      ),
    },
    // 액션
    {
      key: '_actions',
      header: '',
      width: '52px',
      align: 'center',
      system: 'last' as any,
      render: (_v, row) => {
        const actions: RowActionItem[] = [
          {
            key: 'edit',
            label: '수정',
            onClick: () => navigate(`/instructor/courses/${row.id}/edit`),
          },
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger',
            loading: deletingId === row.id,
            confirm: {
              title: '강의 삭제',
              message: `"${row.title}" 강의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
              variant: 'danger',
            },
            onClick: () => handleDelete(row.id),
          },
        ];
        return <RowActionMenu actions={actions} />;
      },
    },
  ], [navigate, deletingId, handleDelete]);

  // ─── Bulk ActionBar ───────────────────────────────────────────────────────

  const bulkActions: ActionBarAction[] = [
    {
      key: 'delete',
      label: '선택 삭제',
      variant: 'danger',
      loading: bulkBusy,
      confirm: {
        title: '선택 강의 삭제',
        message: `선택한 강의 ${selectedKeys.size}개를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger',
      },
      onClick: handleBulkDelete,
    },
  ];

  // ─── Empty State ──────────────────────────────────────────────────────────

  const emptyMessage = (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
      <p style={{ margin: '0 0 12px', fontSize: 15 }}>등록된 강의가 없습니다.</p>
      <Link
        to="/instructor/courses/new"
        style={{
          display: 'inline-block', padding: '10px 20px',
          background: '#4f46e5', color: '#fff',
          borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}
      >
        새 강의 만들기
      </Link>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* 헤더 */}
      <span
        style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 16, display: 'inline-block' }}
        onClick={() => navigate('/instructor')}
      >
        ← 강사 대시보드
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>내 강의 목록</h1>
        <button
          style={{
            padding: '10px 20px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
          onClick={() => navigate('/instructor/courses/new')}
        >
          + 새 강의 만들기
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px 0' }}>{error}</p>
      )}

      {/* Bulk ActionBar */}
      {selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {/* 건수 */}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          총 {courses.length}개
        </div>
      )}

      {/* 테이블 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>불러오는 중...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <BaseTable<Course>
            columns={columns}
            data={courses}
            rowKey={(row) => row.id}
            emptyMessage={emptyMessage}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            onRowClick={(row) => navigate(`/instructor/courses/${row.id}`)}
          />
        </div>
      )}
    </div>
  );
}
