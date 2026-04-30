/**
 * LmsLessonPage - 단계 보기 페이지
 *
 * WO-O4O-QUIZ-SYSTEM-V1: 퀴즈 타입 레슨 지원 추가
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { LoadingSpinner, EmptyState, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Course, Lesson, Enrollment, Quiz, QuizResult } from '../../types';
import { ContentRenderer } from '@o4o/content-editor';

export function LmsLessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quiz state (WO-O4O-QUIZ-SYSTEM-V1)
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1
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

      // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: extract from nested response shapes
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
          if (quizRes.data?.quiz) {
            setQuiz(quizRes.data.quiz);
          }
        } catch {
          // No quiz available
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '단계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!courseId || !lessonId) return;

    try {
      const res = await lmsApi.updateProgress(courseId, lessonId, true);
      // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: extract enrollment from nested response
      const updatedEnrollment = (res as any).data?.enrollment ?? (res as any).data ?? null;
      setEnrollment(updatedEnrollment);

      // 다음 레슨으로 이동
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        navigate(`/lms/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        // WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1: 마지막 레슨 완료 → 수료 모달
        const isCourseDone = (updatedEnrollment as any)?.status === 'completed'
          || (updatedEnrollment as any)?.progressPercentage >= 100
          || (updatedEnrollment as any)?.progress >= 100;
        if (isCourseDone) {
          setShowCompletionModal(true);
        } else {
          toast.success('모든 단계를 완료했습니다!');
        }
      }
    } catch (err) {
      toast.error('진도 업데이트에 실패했습니다.');
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizSubmit = async () => {
    if (!quiz) return;

    // Check all questions answered
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
      setQuizResult(res.data);

      if (res.data.passed) {
        const credits = res.data.creditsEarned;
        toast.success(credits > 0
          ? `퀴즈를 통과했습니다! (+${credits} 크레딧)`
          : '퀴즈를 통과했습니다!');
        // Reload enrollment to reflect progress
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

  if (loading) {
    return <LoadingSpinner message="단계를 불러오는 중..." />;
  }

  if (error || !course || !currentLesson) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="단계를 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 단계입니다.'}
          action={{ label: '안내 흐름으로', onClick: () => navigate(`/lms/course/${courseId}`) }}
        />
      </div>
    );
  }

  const currentIndex = lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1: completedLessons is a count (number), not array
  // Use metadata.completedLessonIds for per-lesson completion tracking
  const completedLessonIds: string[] = (enrollment as any)?.metadata?.completedLessonIds || [];
  const isCompleted = completedLessonIds.includes(currentLesson.id);
  const isQuizLesson = currentLesson.type === 'quiz' && quiz;

  return (
    <div style={styles.wrapper}>
      {/* 사이드바 */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Link to={`/lms/course/${courseId}`} style={styles.backLink}>
            ← 안내 흐름으로
          </Link>
          <h2 style={styles.courseTitle}>{course.title}</h2>
        </div>

        <div style={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const isActive = lesson.id === lessonId;
            const isLessonCompleted = completedLessonIds.includes(lesson.id);

            return (
              <Link
                key={lesson.id}
                to={`/lms/course/${courseId}/lesson/${lesson.id}`}
                style={{
                  ...styles.lessonItem,
                  ...(isActive ? styles.lessonItemActive : {}),
                }}
              >
                <span style={styles.lessonNumber}>
                  {isLessonCompleted ? '✓' : index + 1}
                </span>
                <span style={styles.lessonTitle}>{lesson.title}</span>
                <span style={styles.lessonDuration}>
                  {lesson.type === 'quiz' ? '퀴즈' : `${lesson.duration}분`}
                </span>
              </Link>
            );
          })}
        </div>

        {enrollment && (
          <div style={styles.progressInfo}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${enrollment.progress}%`,
                }}
              />
            </div>
            <span style={styles.progressText}>진도율: {enrollment.progress}%</span>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={styles.main}>
        <div style={styles.lessonHeader}>
          <span style={styles.lessonOrder}>
            {currentIndex + 1} / {lessons.length}
          </span>
          <h1 style={styles.title}>{currentLesson.title}</h1>
        </div>

        {/* 퀴즈 영역 (WO-O4O-QUIZ-SYSTEM-V1) */}
        {isQuizLesson ? (
          <div>
            {quiz.description && (
              <Card padding="large" style={{ marginBottom: '16px' }}>
                <p style={{ ...typography.bodyM, color: colors.neutral600 }}>{quiz.description}</p>
                <p style={{ ...typography.bodyS, color: colors.neutral500, marginTop: '8px' }}>
                  합격 기준: {quiz.passingScore}점 이상
                </p>
              </Card>
            )}

            {/* 결과 표시 */}
            {quizResult && (
              <Card padding="large" style={{
                marginBottom: '24px',
                backgroundColor: quizResult.passed ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${quizResult.passed ? '#86efac' : '#fca5a5'}`,
              }}>
                <h3 style={{
                  ...typography.headingS,
                  color: quizResult.passed ? '#166534' : '#991b1b',
                  marginBottom: '12px',
                }}>
                  {quizResult.passed ? '합격' : '불합격'}
                </h3>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ ...typography.bodyS, color: colors.neutral500 }}>점수</span>
                    <p style={{ ...typography.headingM, color: colors.neutral900 }}>
                      {Math.round(quizResult.score)}점
                    </p>
                  </div>
                  <div>
                    <span style={{ ...typography.bodyS, color: colors.neutral500 }}>정답</span>
                    <p style={{ ...typography.headingM, color: colors.neutral900 }}>
                      {quizResult.correctCount} / {quizResult.total}
                    </p>
                  </div>
                  {quizResult.creditsEarned > 0 && (
                    <div>
                      <span style={{ ...typography.bodyS, color: colors.neutral500 }}>크레딧</span>
                      <p style={{ ...typography.headingM, color: '#166534' }}>
                        +{quizResult.creditsEarned} C
                      </p>
                    </div>
                  )}
                </div>
                {!quizResult.passed && (
                  <button style={styles.retryButton} onClick={handleRetry}>
                    다시 시도
                  </button>
                )}
              </Card>
            )}

            {/* 문제 목록 */}
            {!quizResult && quiz.questions.map((question, qIndex) => (
              <Card key={question.id} padding="large" style={{ marginBottom: '16px' }}>
                <h4 style={{ ...typography.bodyL, fontWeight: 600, color: colors.neutral900, marginBottom: '16px' }}>
                  {qIndex + 1}. {question.question}
                  {question.points && question.points > 1 && (
                    <span style={{ ...typography.bodyS, color: colors.neutral400, marginLeft: '8px' }}>
                      ({question.points}점)
                    </span>
                  )}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {question.options?.map((option, oIndex) => {
                    const isSelected = selectedAnswers[question.id] === option;
                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleAnswerSelect(question.id, option)}
                        style={{
                          ...styles.optionButton,
                          ...(isSelected ? styles.optionButtonSelected : {}),
                        }}
                      >
                        <span style={styles.optionLabel}>
                          {String.fromCharCode(65 + oIndex)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}

            {/* 제출 버튼 */}
            {!quizResult && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  style={{
                    ...styles.submitButton,
                    opacity: submitting ? 0.6 : 1,
                  }}
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
            <div style={styles.videoContainer}>
              {currentLesson.videoUrl ? (
                <video
                  style={styles.video}
                  src={currentLesson.videoUrl}
                  controls
                  autoPlay
                />
              ) : (
                <div style={styles.videoPlaceholder}>
                  <span>🎬</span>
                  <p>동영상이 준비 중입니다</p>
                </div>
              )}
            </div>

            {/* 내용 */}
            {currentLesson.content && (() => {
              const raw = currentLesson.content as any;
              const html = typeof raw === 'string'
                ? raw
                : raw?.html || (raw?.text ? `<p>${raw.text}</p>` : '');
              return html ? (
                <Card padding="large" style={{ marginTop: '24px' }}>
                  <ContentRenderer html={html} style={styles.content} />
                </Card>
              ) : null;
            })()}
          </>
        )}

        {/* 네비게이션 */}
        <div style={styles.navigation}>
          {prevLesson ? (
            <Link
              to={`/lms/course/${courseId}/lesson/${prevLesson.id}`}
              style={styles.navButton}
            >
              ← 이전 단계
            </Link>
          ) : (
            <div />
          )}

          {!isCompleted && enrollment && !isQuizLesson && (
            <button style={styles.completeButton} onClick={handleComplete}>
              ✓ 완료
            </button>
          )}

          {nextLesson ? (
            <Link
              to={`/lms/course/${courseId}/lesson/${nextLesson.id}`}
              style={styles.navButton}
            >
              다음 단계 →
            </Link>
          ) : (
            <Link to={`/lms/course/${courseId}`} style={styles.navButton}>
              안내 흐름으로 →
            </Link>
          )}
        </div>
      </main>

      {/* WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1: 수료 축하 모달 */}
      {showCompletionModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalIcon}>🎉</div>
            <h2 style={styles.modalTitle}>수료를 축하합니다!</h2>
            <p style={styles.modalBody}>
              <strong>{course?.title}</strong>의 모든 단계를 완료했습니다.<br />
              수료증이 발급되었습니다.
            </p>
            <div style={styles.modalActions}>
              <Link
                to="/mypage/certificates"
                style={styles.modalCertBtn}
              >
                수료증 보기
              </Link>
              <button
                style={styles.modalCloseBtn}
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

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
  },
  container: {},
  sidebar: {
    width: '320px',
    backgroundColor: colors.neutral900,
    color: colors.white,
    padding: '20px',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    overflowY: 'auto',
  },
  sidebarHeader: {
    marginBottom: '24px',
  },
  backLink: {
    color: colors.neutral400,
    textDecoration: 'none',
    fontSize: '14px',
  },
  courseTitle: {
    ...typography.headingS,
    color: colors.white,
    marginTop: '12px',
  },
  lessonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral400,
    fontSize: '14px',
  },
  lessonItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  lessonNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  lessonTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lessonDuration: {
    fontSize: '12px',
    opacity: 0.7,
  },
  progressInfo: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
  },
  progressText: {
    fontSize: '13px',
    color: colors.neutral400,
  },
  main: {
    flex: 1,
    marginLeft: '320px',
    padding: '32px',
    maxWidth: '900px',
  },
  lessonHeader: {
    marginBottom: '24px',
  },
  lessonOrder: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: '8px',
  },
  videoContainer: {
    aspectRatio: '16/9',
    backgroundColor: colors.neutral900,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
  },
  content: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  completeButton: {
    padding: '12px 32px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  // Quiz styles (WO-O4O-QUIZ-SYSTEM-V1)
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '14px',
    color: colors.neutral700,
    transition: 'all 0.15s',
  },
  optionButtonSelected: {
    backgroundColor: '#eff6ff',
    borderColor: colors.primary,
    color: colors.primary,
  },
  optionLabel: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: colors.neutral200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  submitButton: {
    padding: '14px 48px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  // WO-LMS-COMPLETION-AND-CERTIFICATE-UX-REFINEMENT-V1
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '48px 40px',
    maxWidth: '440px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalIcon: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    marginBottom: '12px',
  },
  modalBody: {
    fontSize: '15px',
    color: colors.neutral600,
    lineHeight: 1.7,
    marginBottom: '32px',
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  modalCertBtn: {
    display: 'block',
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center',
  },
  modalCloseBtn: {
    padding: '12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
