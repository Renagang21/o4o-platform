/** 내 강의 (수강 목록 · 진행) — `/lms/enrollments/me` (WO Phase 2 §11 Learner) */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CourseProgressBar, LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { learnerApi, errorMessage, type LectureEnrollment } from '../../api/lecture';
import { coursePath } from '../../lib/lmsViewAdapter';

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기', approved: '승인됨', in_progress: '학습 중', completed: '수료', rejected: '반려', cancelled: '취소', expired: '만료',
};

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LectureEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await learnerApi.getMyEnrollments<LectureEnrollment>({ limit: 100 });
        if (alive) setItems(res.data ?? []);
      } catch (err) { if (alive) setError(errorMessage(err, '수강 목록을 불러오지 못했습니다.')); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return <main className="page page-wide">
    <div className="page-head"><h1>내 강의</h1><p className="muted">수강 신청한 강의와 진행 상황입니다.</p></div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="수강 중인 강의가 없습니다" description="강의 목록에서 관심 있는 강의를 신청해 보세요." actionLabel="강의 둘러보기" onAction={() => navigate('/courses')} />}
    <ul className="list">
      {items.map((e) => <li key={e.id} className="list-item">
        <div className="list-main">
          <Link to={coursePath(e.courseId)} className="list-title">{e.course?.title ?? '강의'}</Link>
          <span className={`badge badge-${e.status}`}>{STATUS_LABEL[e.status] ?? e.status}</span>
        </div>
        <CourseProgressBar percent={e.progressPercentage ?? e.progress ?? 0} />
        <div className="list-meta muted">완료 {e.completedLessons ?? 0}/{e.course?.lessonCount ?? '-'} 레슨</div>
      </li>)}
    </ul>
  </main>;
}
