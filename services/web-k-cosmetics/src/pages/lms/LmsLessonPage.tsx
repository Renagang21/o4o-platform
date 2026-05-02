/**
 * LmsLessonPage — K-Cosmetics 레슨 플레이어
 *
 * WO-KCOS-KPA-LMS-STEP3-LESSON-PLAYER-V1
 *
 * KPA-Society LmsLessonPage 구조 기준.
 * KPA 대비 차이: 문구 치환 + 스타일 인라인화 + 수료증 링크 안전 처리 + ContentRenderer 공유.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { ContentRenderer } from '@o4o/content-editor';
import { lmsApi } from '../../api/lms';
import type { LmsCourse, LmsLesson, LmsEnrollment, LmsQuiz, LmsQuizResult, LmsAssignment, LmsAssignmentSubmission, LmsLive } from '../../api/lms';
import { aiApi, type AiAnalyzeResult } from '../../api/ai';

// ─── 색상 (KPA colors/typography 대응) ───────────────────────────────────────

const C = {
  primary: '#db2777',
  white: '#ffffff',
  neutral900: '#0f172a', neutral800: '#1e293b', neutral700: '#334155',
  neutral600: '#475569', neutral500: '#64748b', neutral400: '#94a3b8',
  neutral300: '#cbd5e1', neutral200: '#e2e8f0', neutral100: '#f1f5f9',
  neutral50: '#f8fafc',
  accentGreen: '#22c55e',
};

// WO-O4O-LMS-UX-REFINEMENT-V1
const LESSON_TYPE_LABEL: Record<string, string> = {
  article: '문서',
  video: '동영상',
  quiz: '퀴즈',
  assignment: '과제',
  live: '라이브',
};
const LESSON_TYPE_ICON: Record<string, string> = {
  article: '📄',
  video: '🎬',
  quiz: '❓',
  assignment: '📝',
  live: '🔴',
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LmsLesson | null>(null);
  const [enrollment, setEnrollment] = useState<LmsEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<LmsQuiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
  const [quizResult, setQuizResult] = useState<LmsQuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Assignment state (WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1)
  const [assignment, setAssignment] = useState<LmsAssignment | null>(null);
  const [mySubmission, setMySubmission] = useState<LmsAssignmentSubmission | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  // Live state (WO-O4O-LMS-LIVE-MINIMAL-V1)
  const [live, setLive] = useState<LmsLive | null>(null);
  const [liveJoining, setLiveJoining] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // AI state (WO-O4O-LMS-AI-MINIMAL-V1)
  const [aiResult, setAiResult] = useState<AiAnalyzeResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 수료 모달
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (courseId && lessonId) loadData();
  }, [courseId, lessonId]);

  // Reset quiz state when lesson changes
  useEffect(() => {
    setQuiz(null);
    setSelectedAnswers({});
    setQuizResult(null);
    // WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
    setAssignment(null);
    setMySubmission(null);
    setAssignmentDraft('');
    // WO-O4O-LMS-LIVE-MINIMAL-V1
    setLive(null);
    // WO-O4O-LMS-AI-MINIMAL-V1
    setAiResult(null);
    setAiError(null);
  }, [lessonId]);

  // WO-O4O-LMS-LIVE-MINIMAL-V1
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [live]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, lessonsRes, lessonRes] = await Promise.all([
        lmsApi.getCourse(courseId!),
        lmsApi.getLessons(courseId!),
        lmsApi.getLesson(courseId!, lessonId!),
      ]);

      const courseData = (courseRes as any).data?.course ?? (courseRes as any).data ?? null;
      const lessonsData = Array.isArray((lessonsRes as any).data) ? (lessonsRes as any).data : [];
      const lessonData = (lessonRes as any).data?.lesson ?? (lessonRes as any).data ?? null;

      setCourse(courseData);
      setLessons(lessonsData);
      setCurrentLesson(lessonData);

      try {
        const enrollmentRes = await lmsApi.getEnrollmentByCourse(courseId!);
        const enrollmentData = (enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null;
        setEnrollment(enrollmentData);
      } catch {
        // 미시작 상태
      }

      // WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1: lowercase across the board
      const lessonType = lessonData?.type as string | undefined;

      if (lessonType === 'quiz') {
        try {
          const quizRes = await lmsApi.getQuizForLesson(lessonId!);
          if ((quizRes as any).data?.quiz) {
            setQuiz((quizRes as any).data.quiz);
          }
        } catch {
          // No quiz available
        }
      }

      // WO-O4O-LMS-LIVE-MINIMAL-V1
      if (lessonType === 'live') {
        try {
          const lRes = await lmsApi.getLiveForLesson(lessonId!);
          const l = (lRes as any).data?.live ?? null;
          if (l) setLive(l);
        } catch {
          // 강사 미설정 정상
        }
      }

      // WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
      if (lessonType === 'assignment') {
        try {
          const aRes = await lmsApi.getAssignmentForLesson(lessonId!);
          const a = (aRes as any).data?.assignment ?? null;
          if (a) {
            setAssignment(a);
            try {
              const sRes = await lmsApi.getMyAssignmentSubmission(a.id);
              const sub = (sRes as any).data?.submission ?? null;
              setMySubmission(sub);
              setAssignmentDraft(sub?.content ?? '');
            } catch {
              // 미제출 정상
            }
          }
        } catch {
          // 강사 미등록 정상
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '레슨을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!courseId || !lessonId) return;

    try {
      const res = await lmsApi.updateProgress(courseId, lessonId, true);
      const updatedEnrollment = (res as any).data?.enrollment ?? (res as any).data ?? null;
      setEnrollment(updatedEnrollment);

      // 다음 레슨으로 이동
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        navigate(`/lms/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        // 마지막 레슨 완료 → 수료 모달
        const isCourseDone = (updatedEnrollment as any)?.status === 'completed'
          || (updatedEnrollment as any)?.progressPercentage >= 100
          || (updatedEnrollment as any)?.progress >= 100;
        if (isCourseDone) {
          setShowCompletionModal(true);
        } else {
          toast.success('모든 레슨을 완료했습니다!');
        }
      }
    } catch {
      toast.error('진도 업데이트에 실패했습니다.');
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizSubmit = async () => {
    if (!quiz) return;

    const unanswered = quiz.questions.filter(q => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`${unanswered.length}개 문제를 아직 풀지 않았습니다.`);
      return;
    }

    setSubmitting(true);
    try {
      const answers = Object.entries(selectedAnswers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const res = await lmsApi.submitQuiz(quiz.id, answers);
      const result = (res as any).data ?? res;
      setQuizResult(result);

      if (result.passed) {
        const credits = result.creditsEarned;
        toast.success(credits > 0
          ? `퀴즈를 통과했습니다! (+${credits} 크레딧)`
          : '퀴즈를 통과했습니다!');
        try {
          const enrollmentRes = await lmsApi.getEnrollmentByCourse(courseId!);
          const enrollmentData = (enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null;
          setEnrollment(enrollmentData);
        } catch {
          // ignore
        }
      } else {
        toast.error('불합격입니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '퀴즈 제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setQuizResult(null);
    setAiResult(null);
    setAiError(null);
  };

  // WO-O4O-LMS-AI-MINIMAL-V1
  const callAi = async (
    fn: () => Promise<{ data: AiAnalyzeResult }>,
  ) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fn();
      const data = (res as any).data ?? null;
      if (data) setAiResult(data);
      else setAiError('AI 응답을 해석하지 못했습니다.');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 호출에 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiQuiz = () => {
    if (!quiz || !quizResult) return;
    callAi(() =>
      aiApi.analyzeQuiz({
        lessonId: currentLesson?.id,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
        })),
        userAnswers: Object.entries(selectedAnswers).map(([questionId, answer]) => ({
          questionId,
          answer: answer as any,
        })),
        score: quizResult.score,
        passingScore: quiz.passingScore,
      }) as any,
    );
  };

  const handleAiLive = () => {
    if (!live || !currentLesson) return;
    callAi(() =>
      aiApi.summarizeLive({
        lessonId: currentLesson.id,
        title: currentLesson.title,
        description: currentLesson.description ?? undefined,
        notes: typeof currentLesson.content === 'string' ? currentLesson.content : undefined,
      }) as any,
    );
  };

  const handleAiAssignment = () => {
    if (!mySubmission || !mySubmission.content) return;
    callAi(() =>
      aiApi.feedbackAssignment({
        lessonId: currentLesson?.id,
        instructions: assignment?.instructions ?? undefined,
        submissionContent: mySubmission.content || '',
      }) as any,
    );
  };

  // WO-O4O-LMS-LIVE-MINIMAL-V1
  const handleLiveJoin = async () => {
    if (!live?.liveUrl || !lessonId) return;
    setLiveJoining(true);
    try {
      window.open(live.liveUrl, '_blank', 'noopener,noreferrer');
      const res = await lmsApi.joinLive(lessonId);
      const lessonCompleted = (res as any).data?.lessonCompleted ?? false;
      try {
        const enrollmentRes = await lmsApi.getEnrollmentByCourse(courseId!);
        const enrollmentData = (enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null;
        setEnrollment(enrollmentData);

        const isLast = lessons.findIndex(l => l.id === lessonId) === lessons.length - 1;
        const isCourseDone = (enrollmentData as any)?.status === 'completed'
          || (enrollmentData as any)?.progressPercentage >= 100
          || (enrollmentData as any)?.progress >= 100;
        if (isLast && lessonCompleted && isCourseDone) {
          setShowCompletionModal(true);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '참여 처리에 실패했습니다.');
    } finally {
      setLiveJoining(false);
    }
  };

  // WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
  const handleAssignmentSubmit = async () => {
    if (!assignment) return;
    if (!assignmentDraft.trim()) {
      toast.error('제출 내용을 입력해주세요.');
      return;
    }
    setAssignmentSubmitting(true);
    try {
      const res = await lmsApi.submitAssignment(assignment.id, assignmentDraft.trim());
      const sub = (res as any).data?.submission ?? null;
      const lessonCompleted = (res as any).data?.lessonCompleted ?? false;
      if (sub) setMySubmission(sub);
      toast.success('제출되었습니다.');

      try {
        const enrollmentRes = await lmsApi.getEnrollmentByCourse(courseId!);
        const enrollmentData = (enrollmentRes as any).data?.enrollment ?? (enrollmentRes as any).data ?? null;
        setEnrollment(enrollmentData);

        const isLast = lessons.findIndex(l => l.id === lessonId) === lessons.length - 1;
        const isCourseDone = (enrollmentData as any)?.status === 'completed'
          || (enrollmentData as any)?.progressPercentage >= 100
          || (enrollmentData as any)?.progress >= 100;
        if (isLast && lessonCompleted && isCourseDone) {
          setShowCompletionModal(true);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '제출에 실패했습니다.');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: C.neutral500 }}>
        레슨을 불러오는 중...
      </div>
    );
  }

  if (error || !course || !currentLesson) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: C.neutral500 }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', color: C.neutral900, marginBottom: '8px' }}>레슨을 찾을 수 없습니다</h2>
        <p style={{ marginBottom: '24px' }}>{error || '삭제되었거나 존재하지 않는 레슨입니다.'}</p>
        <button
          onClick={() => navigate(`/lms/course/${courseId}`)}
          style={{ padding: '10px 24px', backgroundColor: C.primary, color: C.white, border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
        >
          강의로 돌아가기
        </button>
      </div>
    );
  }

  const currentIndex = lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const completedLessonIds: string[] = (enrollment as any)?.metadata?.completedLessonIds || [];
  const isCompleted = completedLessonIds.includes(currentLesson.id);
  // WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1: type is always lowercase
  const isQuizLesson = currentLesson.type === 'quiz' && quiz;
  const isAssignmentLesson = currentLesson.type === 'assignment';
  const isLiveLesson = currentLesson.type === 'live';

  // WO-O4O-LMS-AI-MINIMAL-V1
  const renderAiPanel = () => {
    if (!aiLoading && !aiResult && !aiError) return null;
    return (
      <div style={{ marginTop: '16px', padding: '24px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#5b21b6', marginBottom: '12px' }}>✨ AI 분석</h4>
        {aiLoading && <p style={{ fontSize: '14px', color: C.neutral500 }}>분석 중입니다…</p>}
        {aiError && !aiLoading && <p style={{ fontSize: '14px', color: '#991b1b' }}>{aiError}</p>}
        {aiResult && !aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            {aiResult.summary && (
              <p style={{ fontSize: '14px', color: C.neutral800, whiteSpace: 'pre-wrap' as const }}>{aiResult.summary}</p>
            )}
            {aiResult.insights.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.neutral700, marginBottom: '6px' }}>인사이트</div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: C.neutral700 }}>
                  {aiResult.insights.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                </ul>
              </div>
            )}
            {aiResult.recommendations.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.neutral700, marginBottom: '6px' }}>추천</div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: C.neutral700 }}>
                  {aiResult.recommendations.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const liveStatus: 'unset' | 'scheduled' | 'in_progress' | 'ended' = (() => {
    if (!isLiveLesson) return 'unset';
    if (!live?.liveStartAt || !live?.liveEndAt) return 'unset';
    const start = new Date(live.liveStartAt).getTime();
    const end = new Date(live.liveEndAt).getTime();
    const t = now.getTime();
    if (t < start) return 'scheduled';
    if (t > end) return 'ended';
    return 'in_progress';
  })();

  return (
    <div style={S.wrapper}>
      {/* 사이드바 */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <Link to={`/lms/course/${courseId}`} style={S.backLink}>
            ← 강의로 돌아가기
          </Link>
          <h2 style={S.courseTitle}>{course.title}</h2>
        </div>

        <div style={S.lessonList}>
          {lessons.map((lesson, index) => {
            const isActive = lesson.id === lessonId;
            const isLessonCompleted = completedLessonIds.includes(lesson.id);

            return (
              <Link
                key={lesson.id}
                to={`/lms/course/${courseId}/lesson/${lesson.id}`}
                style={{
                  ...S.lessonItem,
                  ...(isActive ? S.lessonItemActive : {}),
                }}
              >
                <span style={S.lessonNumber}>
                  {isLessonCompleted ? '✓' : index + 1}
                </span>
                <span style={S.lessonTypeIcon} aria-hidden>
                  {LESSON_TYPE_ICON[lesson.type as string] || '📄'}
                </span>
                <span style={S.lessonTitle}>{lesson.title}</span>
              </Link>
            );
          })}
        </div>

        {enrollment && (
          <div style={S.progressInfo}>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${enrollment.progress}%` }} />
            </div>
            <span style={S.progressText}>
              진도율: {enrollment.progress}% ({completedLessonIds.length} / {lessons.length})
            </span>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={S.main}>
        <div style={S.lessonHeader}>
          <div style={S.headerMeta}>
            <span style={S.lessonOrder}>{currentIndex + 1} / {lessons.length}</span>
            <span style={S.typeBadge}>
              {LESSON_TYPE_ICON[currentLesson.type as string] || '📄'} {LESSON_TYPE_LABEL[currentLesson.type as string] || currentLesson.type}
            </span>
            {isCompleted && <span style={S.statusBadgeCompleted}>✓ 완료</span>}
            {isLiveLesson && liveStatus === 'scheduled' && (
              <span style={S.statusBadgeScheduled}>⏰ 예정</span>
            )}
            {isLiveLesson && liveStatus === 'in_progress' && (
              <span style={S.statusBadgeLive}>🔴 진행 중</span>
            )}
          </div>
          <h1 style={S.title}>{currentLesson.title}</h1>
        </div>

        {/* WO-O4O-LMS-LIVE-MINIMAL-V1: 라이브 영역 */}
        {isLiveLesson ? (
          live && live.liveStartAt && live.liveEndAt && live.liveUrl ? (
            <div style={{ marginTop: '24px', padding: '28px', backgroundColor: C.white, border: `1px solid ${C.neutral200}`, borderRadius: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.neutral900, marginBottom: '8px' }}>라이브 일정</h3>
              <p style={{ fontSize: '15px', color: C.neutral700, lineHeight: 1.6 }}>
                시작: {new Date(live.liveStartAt).toLocaleString('ko-KR')}<br />
                종료: {new Date(live.liveEndAt).toLocaleString('ko-KR')}
              </p>

              {liveStatus === 'scheduled' && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                  <p style={{ fontSize: '15px', color: '#1e40af' }}>
                    📅 라이브 예정 — 시작 시간이 되면 참여 버튼이 활성화됩니다.
                  </p>
                </div>
              )}

              {liveStatus === 'in_progress' && (
                <div style={{ marginTop: '16px' }}>
                  <button
                    style={{ ...S.submitButton, opacity: liveJoining ? 0.6 : 1 }}
                    onClick={handleLiveJoin}
                    disabled={liveJoining}
                  >
                    🔴 {liveJoining ? '참여 처리 중...' : '지금 참여하기'}
                  </button>
                  <p style={{ fontSize: '13px', color: C.neutral500, marginTop: '8px' }}>참여 클릭 시 진도가 완료 처리됩니다.</p>
                </div>
              )}

              {liveStatus === 'ended' && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <a
                    href={live.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...S.navButton, display: 'inline-block', textDecoration: 'none' }}
                  >
                    ▶ 다시보기
                  </a>
                  {/* WO-O4O-LMS-AI-MINIMAL-V1 */}
                  <button style={S.aiButton} onClick={handleAiLive} disabled={aiLoading}>
                    ✨ {aiLoading ? '요약 중…' : 'AI 요약 보기'}
                  </button>
                </div>
              )}
              {/* WO-O4O-LMS-AI-MINIMAL-V1: live panel */}
              {liveStatus === 'ended' && renderAiPanel()}
            </div>
          ) : (
            <div style={{ marginTop: '24px', padding: '28px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>라이브가 아직 준비되지 않았습니다</h3>
              <p style={{ fontSize: '15px', color: '#92400e' }}>강사가 라이브 일정과 URL을 등록하면 참여할 수 있습니다.</p>
            </div>
          )
        ) : isAssignmentLesson ? (
          /* WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1: 과제 영역 */
          assignment ? (
            <>
              <div style={{ marginTop: '24px', padding: '28px', backgroundColor: C.white, border: `1px solid ${C.neutral200}`, borderRadius: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: C.neutral900, marginBottom: '8px' }}>과제 안내</h3>
                {assignment.instructions ? (
                  <p style={{ fontSize: '15px', color: C.neutral700, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {assignment.instructions}
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: C.neutral500 }}>설명이 등록되지 않았습니다.</p>
                )}
                {assignment.dueDate && (
                  <p style={{ fontSize: '13px', color: '#92400e', marginTop: '8px' }}>
                    마감일: {new Date(assignment.dueDate).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '16px', padding: '28px', backgroundColor: C.white, border: `1px solid ${C.neutral200}`, borderRadius: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: C.neutral900, marginBottom: '12px' }}>
                  {mySubmission ? '내 제출' : '제출하기'}
                </h4>
                <textarea
                  value={assignmentDraft}
                  onChange={(e) => setAssignmentDraft(e.target.value)}
                  placeholder="과제 내용을 입력하세요"
                  style={{ width: '100%', minHeight: '160px', padding: '12px 16px', border: `1px solid ${C.neutral300}`, borderRadius: '8px', fontSize: '14px', color: C.neutral700, outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' as const }}>
                  <button
                    style={{ ...S.submitButton, opacity: assignmentSubmitting ? 0.6 : 1 }}
                    onClick={handleAssignmentSubmit}
                    disabled={assignmentSubmitting}
                  >
                    {assignmentSubmitting ? '제출 중...' : mySubmission ? '재제출하기' : '제출하기'}
                  </button>
                  {/* WO-O4O-LMS-AI-MINIMAL-V1 */}
                  {mySubmission && (
                    <button style={S.aiButton} onClick={handleAiAssignment} disabled={aiLoading}>
                      ✨ {aiLoading ? '분석 중…' : 'AI 피드백 받기'}
                    </button>
                  )}
                  {mySubmission && (
                    <span style={{ fontSize: '13px', color: C.neutral500 }}>
                      마지막 제출: {new Date(mySubmission.submittedAt).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
              </div>
              {/* WO-O4O-LMS-AI-MINIMAL-V1: assignment panel */}
              {mySubmission && renderAiPanel()}
            </>
          ) : (
            <div style={{ marginTop: '24px', padding: '28px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>과제가 아직 준비되지 않았습니다</h3>
              <p style={{ fontSize: '15px', color: '#92400e' }}>강사가 과제 내용을 등록하면 제출할 수 있습니다.</p>
            </div>
          )
        ) : isQuizLesson ? (
          <div>
            {quiz.description && (
              <div style={S.quizDescCard}>
                <p style={{ fontSize: '15px', color: C.neutral600 }}>{quiz.description}</p>
                <p style={{ fontSize: '13px', color: C.neutral500, marginTop: '8px' }}>
                  합격 기준: {quiz.passingScore}점 이상
                </p>
              </div>
            )}

            {/* 결과 표시 */}
            {quizResult && (
              <div style={{
                ...S.quizResultCard,
                backgroundColor: quizResult.passed ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${quizResult.passed ? '#86efac' : '#fca5a5'}`,
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: quizResult.passed ? '#166534' : '#991b1b', marginBottom: '12px' }}>
                  {quizResult.passed ? '합격' : '불합격'}
                </h3>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
                  <div>
                    <span style={{ fontSize: '13px', color: C.neutral500 }}>점수</span>
                    <p style={{ fontSize: '20px', fontWeight: 600, color: C.neutral900 }}>{Math.round(quizResult.score)}점</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: C.neutral500 }}>정답</span>
                    <p style={{ fontSize: '20px', fontWeight: 600, color: C.neutral900 }}>{quizResult.correctCount} / {quizResult.total}</p>
                  </div>
                  {quizResult.creditsEarned > 0 && (
                    <div>
                      <span style={{ fontSize: '13px', color: C.neutral500 }}>크레딧</span>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: '#166534' }}>+{quizResult.creditsEarned} C</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' as const }}>
                  {!quizResult.passed && (
                    <button style={S.retryButton} onClick={handleRetry}>다시 시도</button>
                  )}
                  {/* WO-O4O-LMS-AI-MINIMAL-V1 */}
                  <button style={S.aiButton} onClick={handleAiQuiz} disabled={aiLoading}>
                    ✨ {aiLoading ? '분석 중…' : 'AI 분석 보기'}
                  </button>
                </div>
              </div>
            )}

            {/* WO-O4O-LMS-AI-MINIMAL-V1: quiz panel */}
            {quizResult && renderAiPanel()}

            {/* 문제 목록 */}
            {!quizResult && quiz.questions.map((question, qIndex) => (
              <div key={question.id} style={S.questionCard}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: C.neutral900, marginBottom: '16px' }}>
                  {qIndex + 1}. {question.question}
                  {question.points && question.points > 1 && (
                    <span style={{ fontSize: '13px', color: C.neutral400, marginLeft: '8px' }}>({question.points}점)</span>
                  )}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                  {question.options?.map((option, oIndex) => {
                    const isSelected = selectedAnswers[question.id] === option;
                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleAnswerSelect(question.id, option)}
                        style={{ ...S.optionButton, ...(isSelected ? S.optionButtonSelected : {}) }}
                      >
                        <span style={S.optionLabel}>{String.fromCharCode(65 + oIndex)}</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 제출 버튼 */}
            {!quizResult && (
              <div style={{ textAlign: 'center' as const, marginTop: '24px' }}>
                <button
                  style={{ ...S.submitButton, opacity: submitting ? 0.6 : 1 }}
                  onClick={handleQuizSubmit}
                  disabled={submitting}
                >
                  {submitting ? '채점 중...' : '제출'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 비디오 영역 */}
            <div style={S.videoContainer}>
              {currentLesson.videoUrl ? (
                <video style={S.video} src={currentLesson.videoUrl} controls autoPlay />
              ) : (
                <div style={S.videoPlaceholder}>
                  <span>🎬</span>
                  <p>동영상이 준비 중입니다</p>
                </div>
              )}
            </div>

            {/* 내용 */}
            {currentLesson.content && (
              <div style={S.contentCard}>
                <ContentRenderer html={currentLesson.content} style={S.content} />
              </div>
            )}
          </>
        )}

        {/* 네비게이션 */}
        <div style={S.navigation}>
          {prevLesson ? (
            <Link to={`/lms/course/${courseId}/lesson/${prevLesson.id}`} style={S.navButton}>
              ← 이전 레슨
            </Link>
          ) : (
            <div />
          )}

          {!isCompleted && enrollment && !isQuizLesson && !isAssignmentLesson && !isLiveLesson && (
            <button style={S.completeButton} onClick={handleComplete}>
              ✓ 완료
            </button>
          )}

          {nextLesson ? (
            <Link to={`/lms/course/${courseId}/lesson/${nextLesson.id}`} style={S.navButton}>
              다음 레슨 →
            </Link>
          ) : (
            <Link to={`/lms/course/${courseId}`} style={S.navButton}>
              강의로 돌아가기 →
            </Link>
          )}
        </div>
      </main>

      {/* 수료 축하 모달 */}
      {showCompletionModal && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>🎉</div>
            <h2 style={S.modalTitle}>수료를 축하합니다!</h2>
            <p style={S.modalBody}>
              <strong>{course?.title}</strong>의 모든 레슨을 완료했습니다.<br />
              수료증이 발급되었습니다.
            </p>
            <div style={S.modalActions}>
              <button
                style={S.modalCertBtn}
                onClick={() => toast.info('수료증 기능은 준비 중입니다.')}
              >
                수료증 보기
              </button>
              <button
                style={S.modalCloseBtn}
                onClick={() => { setShowCompletionModal(false); navigate(`/lms/course/${courseId}`); }}
              >
                강의 페이지로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles (KPA styles 기준, colors/typography 인라인화) ────────────────────

const S: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: '320px', backgroundColor: C.neutral900, color: C.white,
    padding: '20px', position: 'fixed', left: 0, top: 0, bottom: 0, overflowY: 'auto',
  },
  sidebarHeader: { marginBottom: '24px' },
  backLink: { color: C.neutral400, textDecoration: 'none', fontSize: '14px' },
  courseTitle: { fontSize: '16px', fontWeight: 600, color: C.white, marginTop: '12px' },
  lessonList: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  lessonItem: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
    borderRadius: '8px', textDecoration: 'none', color: C.neutral400, fontSize: '14px',
  },
  lessonItemActive: {
    backgroundColor: C.primary, color: C.white,
    borderLeft: `3px solid ${C.accentGreen}`, paddingLeft: '9px',
  },
  lessonTypeIcon: { fontSize: '14px', flexShrink: 0 },
  lessonNumber: {
    width: '24px', height: '24px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', flexShrink: 0,
  },
  lessonTitle: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  lessonDuration: { fontSize: '12px', opacity: 0.7 },
  progressInfo: {
    marginTop: '24px', padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px',
  },
  progressBar: {
    height: '6px', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px', overflow: 'hidden', marginBottom: '8px',
  },
  progressFill: { height: '100%', backgroundColor: C.accentGreen },
  progressText: { fontSize: '13px', color: C.neutral400 },
  main: { flex: 1, marginLeft: '320px', padding: '32px', maxWidth: '900px' },
  lessonHeader: { marginBottom: '24px' },
  headerMeta: {
    display: 'flex', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap' as const, marginBottom: '8px',
  },
  lessonOrder: { fontSize: '13px', color: C.neutral500 },
  typeBadge: {
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
    fontWeight: 600, backgroundColor: C.neutral100, color: C.neutral700,
  },
  statusBadgeCompleted: {
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
    fontWeight: 600, backgroundColor: '#d1fae5', color: '#065f46',
  },
  statusBadgeScheduled: {
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
    fontWeight: 600, backgroundColor: '#dbeafe', color: '#1e40af',
  },
  statusBadgeLive: {
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px',
    fontWeight: 700, backgroundColor: '#fee2e2', color: '#991b1b',
  },
  title: { fontSize: '24px', fontWeight: 700, color: C.neutral900, marginTop: '8px' },
  videoContainer: {
    aspectRatio: '16/9', backgroundColor: C.neutral900,
    borderRadius: '12px', overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'contain' as const },
  videoPlaceholder: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', color: C.white,
  },
  contentCard: {
    marginTop: '24px', backgroundColor: C.white,
    border: `1px solid ${C.neutral200}`, borderRadius: '12px', padding: '28px',
  },
  content: { fontSize: '15px', color: C.neutral700, lineHeight: 1.8 },
  navigation: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${C.neutral200}`,
  },
  navButton: {
    padding: '12px 24px', backgroundColor: C.neutral100, color: C.neutral700,
    textDecoration: 'none', borderRadius: '6px', fontSize: '14px',
  },
  completeButton: {
    padding: '12px 32px', backgroundColor: C.accentGreen, color: C.white,
    border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
  },
  // Quiz
  quizDescCard: {
    backgroundColor: C.white, border: `1px solid ${C.neutral200}`,
    borderRadius: '12px', padding: '28px', marginBottom: '16px',
  },
  quizResultCard: { borderRadius: '12px', padding: '28px', marginBottom: '24px' },
  questionCard: {
    backgroundColor: C.white, border: `1px solid ${C.neutral200}`,
    borderRadius: '12px', padding: '28px', marginBottom: '16px',
  },
  optionButton: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
    backgroundColor: C.neutral50, border: `1px solid ${C.neutral200}`,
    borderRadius: '8px', cursor: 'pointer', textAlign: 'left' as const,
    fontSize: '14px', color: C.neutral700, transition: 'all 0.15s',
  },
  optionButtonSelected: {
    backgroundColor: '#fdf2f8', borderColor: C.primary, color: C.primary,
  },
  optionLabel: {
    width: '28px', height: '28px', borderRadius: '50%',
    backgroundColor: C.neutral200, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0,
  },
  submitButton: {
    padding: '14px 48px', backgroundColor: C.primary, color: C.white,
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
  },
  retryButton: {
    padding: '10px 24px', backgroundColor: C.neutral100,
    color: C.neutral700, border: `1px solid ${C.neutral300}`,
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
  },
  // WO-O4O-LMS-AI-MINIMAL-V1
  aiButton: {
    padding: '10px 20px', backgroundColor: '#ede9fe',
    color: '#5b21b6', border: '1px solid #ddd6fe',
    borderRadius: '6px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer',
  },
  // 수료 모달
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    backgroundColor: C.white, borderRadius: '16px', padding: '48px 40px',
    maxWidth: '440px', width: '90%', textAlign: 'center' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalIcon: { fontSize: '56px', marginBottom: '16px' },
  modalTitle: { fontSize: '24px', fontWeight: 700, color: C.neutral900, marginBottom: '12px' },
  modalBody: { fontSize: '15px', color: C.neutral600, lineHeight: 1.7, marginBottom: '32px' },
  modalActions: { display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  modalCertBtn: {
    display: 'block', padding: '14px', backgroundColor: C.primary, color: C.white,
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600,
    textAlign: 'center' as const, cursor: 'pointer',
  },
  modalCloseBtn: {
    padding: '12px', backgroundColor: C.neutral100, color: C.neutral700,
    border: `1px solid ${C.neutral200}`, borderRadius: '8px',
    fontSize: '14px', cursor: 'pointer',
  },
};
