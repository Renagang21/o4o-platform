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
import type { LmsCourse, LmsLesson, LmsEnrollment, LmsQuiz, LmsQuizResult } from '../../api/lms';

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
  }, [lessonId]);

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

      // Load quiz if lesson type is quiz
      if (lessonData?.type === 'quiz') {
        try {
          const quizRes = await lmsApi.getQuizForLesson(lessonId!);
          if ((quizRes as any).data?.quiz) {
            setQuiz((quizRes as any).data.quiz);
          }
        } catch {
          // No quiz available
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
  const isQuizLesson = currentLesson.type === 'quiz' && quiz;

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
                <span style={S.lessonTitle}>{lesson.title}</span>
                <span style={S.lessonDuration}>
                  {lesson.type === 'quiz' ? '퀴즈' : `${lesson.duration}분`}
                </span>
              </Link>
            );
          })}
        </div>

        {enrollment && (
          <div style={S.progressInfo}>
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${enrollment.progress}%` }} />
            </div>
            <span style={S.progressText}>진도율: {enrollment.progress}%</span>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={S.main}>
        <div style={S.lessonHeader}>
          <span style={S.lessonOrder}>{currentIndex + 1} / {lessons.length}</span>
          <h1 style={S.title}>{currentLesson.title}</h1>
        </div>

        {/* 퀴즈 영역 */}
        {isQuizLesson ? (
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
                {!quizResult.passed && (
                  <button style={S.retryButton} onClick={handleRetry}>다시 시도</button>
                )}
              </div>
            )}

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

          {!isCompleted && enrollment && !isQuizLesson && (
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
  lessonItemActive: { backgroundColor: C.primary, color: C.white },
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
  lessonOrder: { fontSize: '13px', color: C.neutral500 },
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
    marginTop: '16px', padding: '10px 24px', backgroundColor: C.neutral100,
    color: C.neutral700, border: `1px solid ${C.neutral300}`,
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
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
