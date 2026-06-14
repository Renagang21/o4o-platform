/**
 * InstructorCoursesManager — 강사 강의 목록 공통 모듈
 *
 * WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1
 *
 * KPA `CourseListPage`(BaseTable + RowActionMenu + bulk delete)를 canonical 로 추출.
 * 서비스 차이(api adapter, route, 검색/bulk/완료율/수강자 action 유무)는 config 로 주입한다.
 * serviceKey hardcode 없음. API client 직접 import 없음(config.api adapter).
 *
 * 강의 생성/편집·레슨·퀴즈·과제·채점·credit/reward 는 본 모듈 범위 아님(별도 작업선).
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BaseTable, RowActionMenu, ActionBar, type O4OColumn, type RowActionItem, type ActionBarAction } from '@o4o/ui';

// ─── Config / types ───

export interface InstructorCourse {
  id: string;
  title: string;
  status: string;
  thumbnail?: string | null;
  description?: string | null;
  category?: string | null;
  lessonCount?: number;
  /** 수강생 수(서비스별 currentEnrollments/enrolledCount → wrapper 에서 매핑). */
  enrollmentCount?: number;
  /** 완료율(%) — 일부 서비스만. */
  completionRate?: number;
  createdAt?: string | null;
}

export type InstructorCourseRowAction = 'edit' | 'participants' | 'delete';

export interface InstructorCoursesApi {
  /** 강사 본인 강의 목록(envelope/필드 매핑은 wrapper 책임 → InstructorCourse[] 반환). */
  list: () => Promise<InstructorCourse[]>;
  /** 삭제 — 'delete' action 또는 bulkDelete 사용 시 필수. read-only 서비스는 생략. */
  delete?: (id: string) => Promise<unknown>;
}

export interface InstructorCoursesRoutes {
  dashboard: string;
  /** 새 강의 작성 경로 — 있을 때만 생성 CTA 노출(read-only 서비스는 생략). */
  create?: string;
  /** 'edit' action 경로 — 있을 때만 수정 action 노출. */
  edit?: (id: string) => string;
  /** row click 이동(강의 관리/상세) — 있을 때만 row click 활성. */
  manage?: (id: string) => string;
  /** 수강자 관리(있는 서비스만 — 'participants' action 사용 시 필수). */
  participants?: (id: string) => string;
}

export interface InstructorCoursesConfig {
  api: InstructorCoursesApi;
  routes: InstructorCoursesRoutes;
  /** 새 강의 버튼 accent. 기본 #4f46e5. */
  accent?: string;
  /** 제목 client-side 검색. 기본 false. */
  search?: boolean;
  /** 선택 + 선택 삭제(bulk). 기본 false. */
  bulkDelete?: boolean;
  /** row action 목록. 기본 ['edit','delete']. */
  rowActions?: InstructorCourseRowAction[];
  /** 컬럼 토글. */
  columns?: {
    /** 썸네일 컬럼(기본 true). 썸네일 데이터 없는 서비스는 false 권장. */
    thumbnail?: boolean;
    description?: boolean;
    category?: boolean;
    lessonCount?: boolean;
    createdAt?: boolean;
    completionRate?: boolean;
  };
}

export interface InstructorCoursesManagerProps {
  config: InstructorCoursesConfig;
}

// ─── Constants ───

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 중',
  published: '공개',
  rejected: '반려됨',
  archived: '보관됨',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:          { bg: '#f3f4f6', text: '#6b7280' },
  pending_review: { bg: '#fef3c7', text: '#92400e' },
  published:      { bg: '#d1fae5', text: '#065f46' },
  rejected:       { bg: '#fee2e2', text: '#b91c1c' },
  archived:       { bg: '#fff7ed', text: '#9a3412' },
};

function formatDate(d: string | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

// ─── Component ───

export function InstructorCoursesManager({ config }: InstructorCoursesManagerProps) {
  const navigate = useNavigate();
  const api = config.api;
  const routes = config.routes;
  const accent = config.accent ?? '#4f46e5';
  const rowActions = config.rowActions ?? ['edit', 'delete'];
  const showSearch = config.search ?? false;
  const showBulk = (config.bulkDelete ?? false) && !!api.delete;
  const showThumbnail = config.columns?.thumbnail ?? true;
  const showDescription = config.columns?.description ?? false;
  const showCategory = config.columns?.category ?? false;
  const showLessonCount = config.columns?.lessonCount ?? false;
  const showCreatedAt = config.columns?.createdAt ?? false;
  const showCompletion = config.columns?.completionRate ?? false;

  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCourses = useCallback(() => {
    setLoading(true);
    api.list()
      .then((list) => setCourses(Array.isArray(list) ? list : []))
      .catch(() => setError('강의 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleDelete = useCallback(async (id: string) => {
    if (!api.delete) return;
    setDeletingId(id);
    try {
      await api.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setSelectedKeys((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      alert('강의 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }, [api]);

  const handleBulkDelete = useCallback(async () => {
    if (!api.delete) return;
    const del = api.delete;
    const ids = Array.from(selectedKeys);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => del(id)));
      setCourses((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelectedKeys(new Set());
    } catch {
      alert('일부 강의 삭제에 실패했습니다.');
    } finally {
      setBulkBusy(false);
    }
  }, [api, selectedKeys]);

  const filtered = useMemo(
    () => (showSearch && search ? courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())) : courses),
    [courses, search, showSearch],
  );

  const columns = useMemo<O4OColumn<InstructorCourse>[]>(() => {
    const cols: O4OColumn<InstructorCourse>[] = [];

    if (showBulk) {
      cols.push({
        key: '_select',
        header: '',
        width: '44px',
        system: true,
        align: 'center' as const,
        onCellClick: () => {},
        render: (_v: unknown, row: InstructorCourse) => (
          <input
            type="checkbox"
            checked={selectedKeys.has(row.id)}
            onChange={(e) => {
              e.stopPropagation();
              setSelectedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                return next;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: accent }}
          />
        ),
      });
    }

    if (showThumbnail) {
      cols.push({
        key: 'thumbnail',
        header: '썸네일',
        width: '80px',
        render: (_v, row) =>
          row.thumbnail ? (
            <img src={row.thumbnail} alt={row.title} style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <div style={{ width: 60, height: 44, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📚</div>
          ),
      });
    }

    cols.push({
      key: 'title',
      header: '강의명',
      render: (_v, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{row.title}</div>
          {showDescription && row.description && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.description}
            </div>
          )}
        </div>
      ),
    });

    cols.push({
      key: 'status',
      header: '상태',
      width: '100px',
      align: 'center',
      render: (_v, row) => {
        const s = STATUS_COLOR[row.status] ?? { bg: '#f3f4f6', text: '#6b7280' };
        return (
          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
            {STATUS_LABEL[row.status] ?? row.status}
          </span>
        );
      },
    });

    if (showCategory) {
      cols.push({
        key: 'category',
        header: '카테고리',
        width: '120px',
        render: (_v, row) => <span style={{ fontSize: 13, color: '#374151' }}>{row.category || '-'}</span>,
      });
    }

    cols.push({
      key: 'enrollmentCount',
      header: '수강생',
      width: '80px',
      align: 'center',
      render: (_v, row) => <span style={{ fontSize: 13, color: '#374151' }}>{row.enrollmentCount ?? 0}명</span>,
    });

    if (showLessonCount) {
      cols.push({
        key: 'lessonCount',
        header: '레슨',
        width: '70px',
        align: 'center',
        render: (_v, row) => <span style={{ fontSize: 13, color: '#374151' }}>{row.lessonCount ?? 0}</span>,
      });
    }

    if (showCompletion) {
      cols.push({
        key: 'completionRate',
        header: '완료율',
        width: '80px',
        align: 'center',
        render: (_v, row) => (
          <span style={{ fontSize: 13, color: '#374151' }}>
            {row.completionRate !== undefined ? `${Math.round(row.completionRate)}%` : '-'}
          </span>
        ),
      });
    }

    if (showCreatedAt) {
      cols.push({
        key: 'createdAt',
        header: '생성일',
        width: '100px',
        align: 'center',
        render: (_v, row) => <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(row.createdAt)}</span>,
      });
    }

    if (rowActions.length > 0) {
      cols.push({
        key: '_actions',
        header: '',
        width: '52px',
        align: 'center',
        system: 'last' as any,
        render: (_v, row) => {
          const actions: RowActionItem[] = [];
          if (rowActions.includes('edit') && routes.edit) {
            actions.push({ key: 'edit', label: '수정', onClick: () => navigate(routes.edit!(row.id)) });
          }
          if (rowActions.includes('participants') && routes.participants) {
            actions.push({ key: 'participants', label: '수강자', onClick: () => navigate(routes.participants!(row.id)) });
          }
          if (rowActions.includes('delete') && api.delete) {
            actions.push({
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
            });
          }
          return <RowActionMenu actions={actions} />;
        },
      });
    }

    return cols;
  }, [showBulk, showThumbnail, showDescription, showCategory, showLessonCount, showCompletion, showCreatedAt, rowActions, routes, navigate, deletingId, handleDelete, selectedKeys, accent, api]);

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

  const emptyMessage = (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
      <p style={{ margin: '0 0 12px', fontSize: 15 }}>
        {showSearch && search ? '검색 결과가 없습니다.' : '등록된 강의가 없습니다.'}
      </p>
      {routes.create && !(showSearch && search) && (
        <Link
          to={routes.create}
          style={{ display: 'inline-block', padding: '10px 20px', background: accent, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          새 강의 만들기
        </Link>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* 헤더 */}
      <span
        style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 16, display: 'inline-block' }}
        onClick={() => navigate(routes.dashboard)}
      >
        ← 강사 대시보드
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>내 강의 목록</h1>
        {routes.create && (
          <button
            style={{ padding: '10px 20px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate(routes.create!)}
          >
            + 새 강의 만들기
          </button>
        )}
      </div>

      {showSearch && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="강의 제목 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', width: '100%', maxWidth: 320 }}
          />
        </div>
      )}

      {error && <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px 0' }}>{error}</p>}

      {/* Bulk ActionBar */}
      {showBulk && selectedKeys.size > 0 && (
        <ActionBar
          selectedCount={selectedKeys.size}
          actions={bulkActions}
          onClearSelection={() => setSelectedKeys(new Set())}
        />
      )}

      {!loading && !error && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          총 {courses.length}개{showSearch && search ? ` · 표시 ${filtered.length}개` : ''}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>불러오는 중...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <BaseTable<InstructorCourse>
            columns={columns}
            data={filtered}
            rowKey={(row) => row.id}
            emptyMessage={emptyMessage}
            selectable={showBulk}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            onRowClick={routes.manage ? (row) => navigate(routes.manage!(row.id)) : undefined}
          />
        </div>
      )}
    </div>
  );
}

export default InstructorCoursesManager;
