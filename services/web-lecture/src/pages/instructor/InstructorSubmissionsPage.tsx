/** 강사 — 과제 제출물 채점 (WO Phase 2 §11 Instructor 평가) */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { instructorApi, errorMessage, type LectureSubmission } from '../../api/lecture';
import { useToast } from '../../components/Toast';

export default function InstructorSubmissionsPage() {
  const { lessonId = '' } = useParams<{ lessonId: string }>();
  const toast = useToast();
  const [courseId, setCourseId] = useState('');
  const [items, setItems] = useState<LectureSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await instructorApi.lessonSubmissions(lessonId);
      setCourseId(res.data.courseId);
      setItems(res.data.items ?? []);
    } catch (err) { setError(errorMessage(err, '제출물을 불러오지 못했습니다.')); }
    finally { setLoading(false); }
  }, [lessonId]);
  useEffect(() => { void load(); }, [load]);

  async function grade(id: string, gradingStatus: 'graded' | 'returned') {
    const d = draft[id] ?? { score: '', feedback: '' };
    const score = gradingStatus === 'graded' ? Number(d.score) : null;
    if (gradingStatus === 'graded' && (d.score === '' || Number.isNaN(score))) { toast.error('점수를 입력하세요.'); return; }
    setBusy(id);
    try { await instructorApi.gradeSubmission(id, { gradingStatus, score, feedback: d.feedback }); toast.success('처리했습니다.'); await load(); }
    catch (err) { toast.error(errorMessage(err, '채점에 실패했습니다.')); }
    finally { setBusy(null); }
  }

  return <main className="page page-wide">
    <div className="page-head"><p className="muted"><Link to={courseId ? `/instructor/courses/${courseId}/edit` : '/instructor'}>강의 편집</Link> / 제출물</p><h1>과제 제출물</h1></div>
    {loading && <LmsLoading message="불러오는 중..." />}
    {error && <div className="notice notice-error">{error}</div>}
    {!loading && !error && items.length === 0 && <LmsEmptyState title="제출된 과제가 없습니다" />}
    <ul className="list">
      {items.map((s) => <li key={s.id} className="list-item">
        <div className="list-main"><span className="list-title">{s.userName ?? s.userId}</span><span className={`badge badge-${s.gradingStatus ?? 'ungraded'}`}>{s.gradingStatus === 'graded' ? `채점 ${s.score ?? '-'}점` : s.gradingStatus === 'returned' ? '반환' : '미채점'}</span></div>
        <div className="list-meta muted">제출 {s.submittedAt?.slice(0, 16).replace('T', ' ')}</div>
        <pre className="submission">{s.content}</pre>
        {s.feedback && <p className="muted">피드백: {s.feedback}</p>}
        <div className="field-row">
          <label className="field"><span>점수</span><input type="number" min={0} max={100} value={draft[s.id]?.score ?? (s.score ?? '')} onChange={(e) => setDraft({ ...draft, [s.id]: { score: e.target.value, feedback: draft[s.id]?.feedback ?? s.feedback ?? '' } })} /></label>
          <label className="field grow"><span>피드백</span><input value={draft[s.id]?.feedback ?? s.feedback ?? ''} onChange={(e) => setDraft({ ...draft, [s.id]: { score: draft[s.id]?.score ?? String(s.score ?? ''), feedback: e.target.value } })} /></label>
        </div>
        <div className="list-actions">
          <button type="button" className="btn btn-primary" disabled={busy === s.id} onClick={() => void grade(s.id, 'graded')}>채점 확정</button>
          <button type="button" className="btn btn-ghost" disabled={busy === s.id} onClick={() => void grade(s.id, 'returned')}>보완 요청(반환)</button>
        </div>
      </li>)}
    </ul>
  </main>;
}
