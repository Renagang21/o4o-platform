import { ProfessionalInfoSummary } from '../../components/ProfessionalInfoFields';
/**
 * 운영자 — 강의 검토 화면 (read-only)
 *
 * PR #225 merge-gate 11차 P2: 승인·반려 전에 강의 내용을 확인할 수 있어야 한다.
 * 이 화면은 learner enrollment 를 만들지 않고, 운영자에게 instructor 편집 권한도 주지 않는다.
 * 서버(`GET /lms/operator/courses/:courseId/review`)가 lecture scope 와 운영자 권한을 판정하며
 * legacy(KPA/PH) 강의는 404 로 비노출된다. 이 화면에서 콘텐츠를 편집할 수 없다.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CourseStatusBadge, LmsEmptyState, LmsLoading } from '@o4o/lms-ui';
import { useOperatorCourseReview } from './useOperatorCourseReview';
import OperatorReasonDialog from './OperatorReasonDialog';

export default function OperatorCourseReviewPage() {
  const { courseId = '' } = useParams();
  return <CourseReviewWorkspace key={courseId} courseId={courseId} />;
}
function CourseReviewWorkspace({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const { data, loading, error, actionError, busy, load, decide, clearActionError } = useOperatorCourseReview(courseId, () => navigate('/operator'));
  const [rejecting, setRejecting] = useState(false);

  if (loading) return <main className="page page-wide"><LmsLoading message="불러오는 중..." /></main>;
  if (error) return <main className="page page-wide">
    <div role="alert" className="notice notice-error">{error}</div><button className="btn" onClick={() => void load()}>다시 조회</button>
    <Link className="btn btn-ghost" to="/operator">강의 운영으로</Link>
  </main>;
  if (!data) return <main className="page page-wide"><LmsEmptyState title="강의를 찾을 수 없습니다" /></main>;

  const { course, curriculum } = data;
  return <main className="page page-wide">
    <div className="page-head row">
      <div>
        <h1>{course.title} <CourseStatusBadge status={course.status} /></h1>
        <p className="muted">
          운영자 검토 화면 · 읽기 전용 · 수강 등록 없음
          {course.rejectionReason ? ` · 반려 사유: ${course.rejectionReason}` : ''}
        </p>
      </div>
      <div className="row-actions">
        {course.status === 'pending_review' && <>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void decide('approve')}>승인(게시)</button>
          <button type="button" className="btn btn-ghost danger" disabled={busy} onClick={() => { clearActionError(); setRejecting(true); }}>반려</button>
        </>}
        <Link className="btn btn-ghost" to="/operator">목록</Link>
      </div>
    </div>

    {actionError && !rejecting && <p role="alert" className="notice notice-error">{actionError}</p>}
    <section className="card">
      <h2>강의 정보</h2>
      <p>{course.description || <span className="muted">설명 없음</span>}</p>
      <ul className="list-meta muted">
        <li>공개 범위: {course.visibility === 'members' ? '회원 전용' : '공개'}</li>
        <li>유료 여부: {course.isPaid ? '유료' : '무료'}</li>
        <li>수강 승인 필요: {course.requiresApproval ? '예' : '아니오'}</li>
        <li>강사 ID: {course.instructorId}</li>
      </ul>
    </section>

    <ProfessionalInfoSummary value={course.professionalInfo} />

    <section className="card">
      <h2>커리큘럼 ({curriculum.length})</h2>
      {curriculum.length === 0 && <LmsEmptyState title="등록된 레슨이 없습니다" />}
      <ol className="list">
        {curriculum.map((l) => <li key={l.id} className="list-item">
          <div className="list-main">
            <span className="list-title">{l.order}. {l.title}</span>
            <span className="muted">{l.type}{l.isPublished ? '' : ' · 초안'}{l.isFree ? ' · 무료 공개' : ''}</span>
          </div>
          {l.description && <div className="list-meta">{l.description}</div>}
          <div className="list-meta muted">
            퀴즈 {l.hasQuiz ? `있음(${l.quizQuestionCount}문항)` : '없음'}
            {' · '}과제 {l.hasAssignment ? '있음' : '없음'}
            {l.hasQuiz && <span> · 문항·정답은 검토 화면에서 노출하지 않습니다</span>}
          </div>
          {/* 13차 P2(Codex): 존재 여부만 보여주면 운영자가 내용을 확인하지 못한 채 승인하게 된다.
              서버가 이미 돌려주는 자료를 실제로 열람할 수 있게 한다 — 읽기 전용은 그대로다. */}
          {l.videoUrl
            ? <div className="list-meta">
                <video className="review-video" src={l.videoUrl} controls preload="metadata" />
                <a href={l.videoUrl} target="_blank" rel="noopener noreferrer">영상 원본 열기</a>
              </div>
            : <div className="list-meta muted">영상 없음</div>}
          {(l.attachments?.length ?? 0) > 0
            ? <ul className="list-meta">
                {l.attachments.map((a, i) => <li key={`${l.id}-att-${i}`}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name || `첨부 ${i + 1}`}</a>
                  {a.type ? <span className="muted"> · {a.type}</span> : null}
                </li>)}
              </ul>
            : <div className="list-meta muted">첨부 없음</div>}
          {l.content && <pre className="code-block">{JSON.stringify(l.content, null, 2)}</pre>}
        </li>)}
      </ol>
    </section>
    {rejecting && <OperatorReasonDialog title="강좌 반려" target={course.title} busy={busy} error={actionError} onCancel={() => setRejecting(false)} onConfirm={reason => void decide('reject', reason)} />}
  </main>;
}
