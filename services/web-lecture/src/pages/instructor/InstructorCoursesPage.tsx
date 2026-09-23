/** 강사 — 내 강의 목록 · 상태 · Publish 요청 (WO Phase 2 §11 Instructor) */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseStatusBadge, LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { instructorApi, errorMessage, type LectureCourse } from '../../api/lecture';
import { useToast } from '../../components/Toast';

export default function InstructorCoursesPage() {
  const toast = useToast();
  const [items, setItems] = useState<LectureCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await instructorApi.myCourses({ limit: 100 });
      setItems(res.data ?? []);
    } catch (err) { setError(errorMessage(err, '강의 목록을 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(id: string, label: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); toast.success(`${label} 완료`); await load(); }
    catch (err) { toast.error(errorMessage(err, `${label} 실패`)); }
    finally { setBusy(null); }
  }

  return <main className="page page-wide">
    <div className="page-head row">
      <div><h1>내 강의</h1><p className="muted">강의를 만들고 레슨·퀴즈·과제를 구성한 뒤 검토를 요청하세요. 게시는 운영자가 승인합니다.</p></div>
      <div className="row-actions">
        <Link className="btn btn-ghost" to="/instructor/enrollments">수강 승인</Link>
        <Link className="btn btn-primary" to="/instructor/courses/new">새 강의</Link>
      </div>
    </div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="개설한 강의가 없습니다" description="새 강의를 만들어 시작하세요." />}
    <ul className="list">
      {items.map((c) => <li key={c.id} className="list-item">
        <div className="list-main">
          <Link to={`/instructor/courses/${c.id}/edit`} className="list-title">{c.title}</Link>
          <CourseStatusBadge status={c.status} />
        </div>
        <div className="list-meta muted">레슨 {c.lessonCount ?? 0} · 수강 {c.currentEnrollments ?? c.enrollmentCount ?? 0} · {c.visibility === 'members' ? '회원 전용' : '공개'}{c.rejectionReason ? ` · 반려 사유: ${c.rejectionReason}` : ''}</div>
        <div className="list-actions">
          <Link className="btn btn-ghost" to={`/instructor/courses/${c.id}/edit`}>편집</Link>
          {(c.status === 'draft' || c.status === 'rejected') && <button type="button" className="btn" disabled={busy === c.id} onClick={() => void act(c.id, '검토 요청', () => instructorApi.submitForReview(c.id))}>검토 요청</button>}
          {c.status === 'published' && <button type="button" className="btn" disabled={busy === c.id} onClick={() => void act(c.id, '게시 중단', () => instructorApi.unpublish(c.id))}>게시 중단</button>}
          {c.status !== 'archived' && <button type="button" className="btn btn-ghost" disabled={busy === c.id} onClick={() => { if (window.confirm('강의를 보관 처리할까요?')) void act(c.id, '보관', () => instructorApi.archive(c.id)); }}>보관</button>}
        </div>
      </li>)}
    </ul>
  </main>;
}
