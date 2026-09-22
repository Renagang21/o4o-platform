/**
 * 강사 — 수강 승인 대기 목록 · 승인 / 반려 (WO Phase 2 §11 Instructor)
 * Platform Admin `/admin/lms-instructor` 의 수강 승인 기능을 Lecture 강사 surface 로 이전 (§11 · PLATFORM_ADMIN_LMS_INSTRUCTOR_SURFACE=MIGRATED).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { instructorApi, errorMessage, type LectureEnrollment } from '../../api/lecture';
import { useToast } from '../../components/Toast';

export default function InstructorEnrollmentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<LectureEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await instructorApi.pendingEnrollments({ limit: 100 }); setItems(res.data ?? []); }
    catch (err) { setError(errorMessage(err, '승인 대기 목록을 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setBusy(id);
    try { await instructorApi.approveEnrollment(id); toast.success('승인했습니다.'); await load(); }
    catch (err) { toast.error(errorMessage(err, '승인에 실패했습니다.')); }
    finally { setBusy(null); }
  }
  async function reject(id: string) {
    const reason = window.prompt('반려 사유를 입력하세요.');
    if (reason === null) return;
    setBusy(id);
    try { await instructorApi.rejectEnrollment(id, reason); toast.success('반려했습니다.'); await load(); }
    catch (err) { toast.error(errorMessage(err, '반려에 실패했습니다.')); }
    finally { setBusy(null); }
  }

  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to="/instructor">내 강의</Link> / 수강 승인</p><h1>수강 승인 대기</h1><p className="muted">승인이 필요한 강의에 신청한 학습자 목록입니다.</p></div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="대기 중인 신청이 없습니다" />}
    <ul className="list">
      {items.map((e) => <li key={e.id} className="list-item">
        <div className="list-main"><span className="list-title">{e.user?.name ?? e.user?.email ?? e.userId}</span><span className="muted">{e.course?.title}</span></div>
        <div className="list-meta muted">신청 {e.createdAt?.slice(0, 10)}</div>
        <div className="list-actions">
          <button type="button" className="btn btn-primary" disabled={busy === e.id} onClick={() => void approve(e.id)}>승인</button>
          <button type="button" className="btn btn-ghost danger" disabled={busy === e.id} onClick={() => void reject(e.id)}>반려</button>
        </div>
      </li>)}
    </ul>
  </main>;
}
