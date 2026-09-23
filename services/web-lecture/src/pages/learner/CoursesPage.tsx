/**
 * 강의 목록 — `@o4o/lms-ui` CourseListView 재사용 (WO Phase 2 §11 Learner)
 * 공개 목록: published 만. 비로그인 = visibility=public 강제(서버). serviceKey 는 서버가 lecture 로 고정.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseListView, type CourseCardView } from '@o4o/lms-ui';
import { learnerApi, type LectureCourse } from '../../api/lecture';
import { LECTURE_ACCENT, coursePath } from '../../lib/lmsViewAdapter';
import { useAuth } from '../../contexts/AuthContext';
import { hasLectureMembership } from '../../components/AccessGate';

const PAGE_SIZE = 12;

function toCard(c: LectureCourse): CourseCardView {
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? undefined,
    thumbnailUrl: c.thumbnail,
    instructorName: c.instructorName ?? c.instructor?.name ?? undefined,
    lessonCount: c.lessonCount,
    durationMinutes: c.duration,
    enrollmentCount: c.enrollmentCount ?? c.currentEnrollments,
    visibility: c.visibility,
    status: c.status,
    isPaid: c.isPaid,
  };
}

export default function CoursesPage() {
  const { user, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res = await learnerApi.getCourses<LectureCourse>({ status: 'published', page, limit: PAGE_SIZE, ...(query ? { search: query } : {}) });
      setCourses((res.data ?? []).map(toCard));
      setTotalPages(res.pagination?.totalPages ?? res.totalPages ?? 1);
      setTotal(res.pagination?.total ?? res.data?.length ?? 0);
    } catch { setError(true); } finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => { void load(); }, [load]);

  const gate = isAuthenticated && !hasLectureMembership(user?.memberships)
    ? <div className="notice">활성 O4O 강의 서비스 membership 이 없으면 공개 강의만 열람할 수 있고 수강 신청은 할 수 없습니다.</div>
    : !isAuthenticated
      ? <div className="notice">회원 전용 강의와 수강 신청은 <Link to="/login">로그인</Link> 후 이용할 수 있습니다.</div>
      : null;

  return <main className="page page-wide">
    <CourseListView
      courses={courses}
      loading={loading}
      error={error}
      onRetry={() => void load()}
      accent={LECTURE_ACCENT}
      hrefFor={(c) => coursePath(c.id)}
      headerSlot={<div className="page-head"><h1>강의</h1><p className="muted">O4O 강의 서비스의 공개 강의 목록입니다.</p></div>}
      search={{ value: search, onChange: setSearch, onSubmit: () => { setPage(1); setQuery(search.trim()); }, placeholder: '강의 검색' }}
      countSlot={<span className="muted">총 {total}개</span>}
      gateSlot={gate}
      emptyState={<div className="empty">등록된 강의가 없습니다.</div>}
      paginationSlot={totalPages > 1 && <div className="pager">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</button>
      </div>}
    />
  </main>;
}
