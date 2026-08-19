/**
 * @o4o/lms-ui — 레슨 플레이어 공통 View
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-DETAIL-AND-LESSON-PLAYER-COMMONIZATION-V1
 *
 * KPA / K-Cosmetics / GlycoPharm 의 레슨 플레이어를 한 벌로 수렴한다.
 * 기능 유무는 `LmsLearnerPort` 의 optional 메서드 존재 여부로 판정한다(serviceKey 분기 없음).
 *  - `getQuizForLesson`/`submitQuiz` 미주입 → 퀴즈 UI 렌더 안 함
 *  - `getAssignmentForLesson`/`submitAssignment` 미주입 → 과제 UI 렌더 안 함
 *  - `analyzeQuiz`/`feedbackAssignment` 미주입 → AI 패널 렌더 안 함
 *
 * 완료 메트릭(video 시청 비율 · article 스크롤/체류)은 백엔드 공통 정책
 * (`WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1`)에 맞춰 항상 수집해 전송한다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DEFAULT_ACCENT } from '../types';
import { LessonList } from '../components/LessonList';
import { CourseProgressBar } from '../components/CourseProgressBar';
import { LmsCard, LmsEmptyState, LmsLoading, NavLink, primaryButtonStyle } from './primitives';
import type {
  LmsAiResultData,
  LmsAssignmentData,
  LmsCompletionMetrics,
  LmsCourseDetailData,
  LmsEnrollmentData,
  LmsLearnerPort,
  LmsLessonData,
  LmsQuizData,
  LmsQuizResultData,
  LmsSubmissionData,
  LmsViewConfig,
} from './contracts';
import { extractErrorMessage, resolveCoursePath, resolveLessonPath } from './contracts';

/** 백엔드 완료 정책 임계값과 동일한 기준으로 클라이언트 메트릭을 수집한다. */
const ARTICLE_DWELL_TICK_MS = 1000;

export interface LessonPlayerViewProps {
  courseId: string;
  lessonId: string;
  port: LmsLearnerPort;
  config: LmsViewConfig;
  /**
   * 본문 HTML 렌더러. 서비스가 플랫폼 표준 `ContentRenderer` 를 주입한다.
   * 미주입 시 본문은 평문으로만 표시한다(HTML 직접 삽입은 하지 않는다).
   */
  renderHtml?: (html: string) => ReactNode;
  /** 본문 아래 서비스 고유 블록(예: 감사 포인트 패널). */
  renderBelowContent?: (ctx: { lesson: LmsLessonData; course: LmsCourseDetailData | null }) => ReactNode;
}

export function LessonPlayerView({
  courseId,
  lessonId,
  port,
  config,
  renderHtml,
  renderBelowContent,
}: LessonPlayerViewProps) {
  const { labels, notify } = config;
  const accent = config.accent ?? DEFAULT_ACCENT;
  // WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §8
  const enrollmentEnabled = config.enrollmentEnabled !== false;

  const [course, setCourse] = useState<LmsCourseDetailData | null>(null);
  const [lessons, setLessons] = useState<LmsLessonData[]>([]);
  const [lesson, setLesson] = useState<LmsLessonData | null>(null);
  const [enrollment, setEnrollment] = useState<LmsEnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // 퀴즈
  const [quiz, setQuiz] = useState<LmsQuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [quizResult, setQuizResult] = useState<LmsQuizResultData | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // 과제
  const [assignment, setAssignment] = useState<LmsAssignmentData | null>(null);
  const [submission, setSubmission] = useState<LmsSubmissionData | null>(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(false);

  // AI
  const [aiResult, setAiResult] = useState<LmsAiResultData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // 완료 메트릭
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const watchedSecondsRef = useRef(0);
  const progressRatioRef = useRef(0);
  const scrolledRatioRef = useRef(0);
  const dwellSecondsRef = useRef(0);

  const hasQuizSupport = Boolean(port.getQuizForLesson && port.submitQuiz);
  const hasAssignmentSupport = Boolean(port.getAssignmentForLesson && port.submitAssignment);

  const completedIds = enrollment?.completedLessonIds ?? [];
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const isCompleted = completedIds.includes(lessonId);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setQuiz(null);
      setQuizResult(null);
      setAnswers({});
      setAssignment(null);
      setSubmission(null);
      setAssignmentText('');
      setEditingSubmission(false);
      setAiResult(null);
      watchedSecondsRef.current = 0;
      progressRatioRef.current = 0;
      scrolledRatioRef.current = 0;
      dwellSecondsRef.current = 0;

      const [courseData, lessonList] = await Promise.all([
        port.getCourse(courseId).catch(() => null),
        port.getLessons(courseId),
      ]);
      setCourse(courseData);
      setLessons(lessonList);

      // 단건 조회를 제공하는 서비스는 본문 포함 상세를, 아니면 목록 항목을 사용한다.
      const detail = port.getLesson
        ? await port.getLesson(courseId, lessonId)
        : lessonList.find((l) => l.id === lessonId) ?? null;
      if (!detail) {
        setError(labels.lessonNotFoundDesc);
        return;
      }
      setLesson(detail);

      if (config.enrollmentEnabled !== false) {
        try {
          setEnrollment(await port.getEnrollment(courseId));
        } catch {
          setEnrollment(null);
        }
      } else {
        setEnrollment(null);
      }

      if (detail.type === 'quiz' && hasQuizSupport) {
        try {
          setQuiz(await port.getQuizForLesson!(lessonId));
        } catch {
          setQuiz(null);
        }
      }

      if (detail.type === 'assignment' && hasAssignmentSupport) {
        try {
          const a = await port.getAssignmentForLesson!(lessonId);
          setAssignment(a);
          if (a && port.getMyAssignmentSubmission) {
            const mine = await port.getMyAssignmentSubmission(a.id).catch(() => null);
            setSubmission(mine);
            setAssignmentText(mine?.content ?? '');
          }
        } catch {
          setAssignment(null);
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err, labels.lessonNotFoundDesc));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId, port, hasQuizSupport, hasAssignmentSupport]);

  useEffect(() => {
    if (courseId && lessonId) void loadAll();
  }, [courseId, lessonId, loadAll]);

  // article 체류 시간 — 백엔드 dwellTimeSeconds 기준.
  useEffect(() => {
    if (!lesson || lesson.type === 'video') return;
    const timer = setInterval(() => {
      dwellSecondsRef.current += ARTICLE_DWELL_TICK_MS / 1000;
    }, ARTICLE_DWELL_TICK_MS);
    return () => clearInterval(timer);
  }, [lesson]);

  // article 스크롤 비율 — 본문 컨테이너 기준(문서 전체가 아니라 콘텐츠 영역).
  const handleContentScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const ratio = scrollable > 0 ? Math.min(1, el.scrollTop / scrollable) : 1;
    if (ratio > scrolledRatioRef.current) scrolledRatioRef.current = ratio;
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    watchedSecondsRef.current = Math.max(watchedSecondsRef.current, v.currentTime);
    if (v.duration > 0) {
      progressRatioRef.current = Math.max(progressRatioRef.current, v.currentTime / v.duration);
    }
  };

  const buildMetrics = (): LmsCompletionMetrics => {
    if (lesson?.type === 'video') {
      return {
        watchedSeconds: Math.floor(watchedSecondsRef.current),
        progressRatio: Number(progressRatioRef.current.toFixed(3)),
      };
    }
    return {
      scrolledRatio: Number(scrolledRatioRef.current.toFixed(3)),
      dwellTimeSeconds: Math.floor(dwellSecondsRef.current),
    };
  };

  const goToLesson = (targetId: string) => {
    config.navigate(resolveLessonPath(config, courseId, targetId));
  };

  const afterCompletion = () => {
    if (nextLesson) goToLesson(nextLesson.id);
    else setShowCompletionModal(true);
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      const updated = await port.updateProgress(courseId, lessonId, true, buildMetrics());
      if (updated) setEnrollment(updated);
      else
        setEnrollment((prev) =>
          prev
            ? { ...prev, completedLessonIds: [...new Set([...prev.completedLessonIds, lessonId])] }
            : prev,
        );
      afterCompletion();
    } catch (err) {
      notify.error(extractErrorMessage(err, labels.progressFailedMessage));
    } finally {
      setCompleting(false);
    }
  };

  // ─── 퀴즈 ─────────────────────────────────────────────────────────────────
  const setSingleAnswer = (questionId: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  const toggleMultiAnswer = (questionId: string, value: string) =>
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      return {
        ...prev,
        [questionId]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });

  const quizAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => {
      const a = answers[q.id];
      return Array.isArray(a) ? a.length > 0 : Boolean(a);
    });
  }, [quiz, answers]);

  const handleSubmitQuiz = async () => {
    if (!quiz || !port.submitQuiz) return;
    try {
      setSubmittingQuiz(true);
      const result = await port.submitQuiz(
        quiz.id,
        quiz.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })),
      );
      setQuizResult(result);
      if (result?.passed) {
        notify.success('퀴즈를 통과했습니다.');
        // 퀴즈 통과는 백엔드에서 레슨 완료로 처리된다 — 로컬 상태만 동기화한다.
        setEnrollment((prev) =>
          prev
            ? { ...prev, completedLessonIds: [...new Set([...prev.completedLessonIds, lessonId])] }
            : prev,
        );
      }
    } catch (err) {
      notify.error(extractErrorMessage(err, '퀴즈 제출에 실패했습니다.'));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetryQuiz = () => {
    setQuizResult(null);
    setAnswers({});
    setAiResult(null);
  };

  const handleAnalyzeQuiz = async () => {
    if (!quiz || !quizResult || !port.analyzeQuiz) return;
    try {
      setAiLoading(true);
      const correctMap = new Map((quizResult.answers ?? []).map((a) => [a.questionId, a.isCorrect]));
      setAiResult(
        await port.analyzeQuiz({
          lessonId,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options,
          })),
          userAnswers: quiz.questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id] ?? '',
            isCorrect: correctMap.get(q.id) ?? false,
          })),
          score: quizResult.score,
          passingScore: quiz.passingScore,
        }),
      );
    } catch (err) {
      notify.error(extractErrorMessage(err, 'AI 분석에 실패했습니다.'));
    } finally {
      setAiLoading(false);
    }
  };

  // ─── 과제 ─────────────────────────────────────────────────────────────────
  const handleSubmitAssignment = async () => {
    if (!assignment || !port.submitAssignment) return;
    if (!assignmentText.trim()) {
      notify.error('제출 내용을 입력해 주세요.');
      return;
    }
    try {
      setSubmittingAssignment(true);
      const { submission: saved, lessonCompleted } = await port.submitAssignment(
        assignment.id,
        assignmentText.trim(),
      );
      setSubmission(saved);
      setEditingSubmission(false);
      notify.success('과제를 제출했습니다.');
      if (lessonCompleted) {
        setEnrollment((prev) =>
          prev
            ? { ...prev, completedLessonIds: [...new Set([...prev.completedLessonIds, lessonId])] }
            : prev,
        );
      }
    } catch (err) {
      notify.error(extractErrorMessage(err, '과제 제출에 실패했습니다.'));
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleFeedbackAssignment = async () => {
    if (!port.feedbackAssignment || !submission?.content) return;
    try {
      setAiLoading(true);
      setAiResult(
        await port.feedbackAssignment({
          lessonId,
          instructions: assignment?.instructions ?? undefined,
          submissionContent: submission.content,
        }),
      );
    } catch (err) {
      notify.error(extractErrorMessage(err, 'AI 피드백 생성에 실패했습니다.'));
    } finally {
      setAiLoading(false);
    }
  };

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  if (loading) return <LmsLoading message={labels.lessonLoading} />;

  if (error || !lesson) {
    return (
      <LmsEmptyState
        icon="⚠️"
        title={labels.lessonNotFoundTitle}
        description={error || labels.lessonNotFoundDesc}
        actionLabel={labels.backToCourseLabel}
        onAction={() => config.navigate(resolveCoursePath(config, courseId))}
        accent={accent}
      />
    );
  }

  return (
    <div style={playerLayoutStyle}>
      {/* 사이드바 — 커리큘럼 + 진도 */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e293b' }}>
          <NavLink
            to={resolveCoursePath(config, courseId)}
            navigate={config.navigate}
            style={{ fontSize: '13px', color: '#94a3b8' }}
          >
            ← {labels.backToCourseLabel}
          </NavLink>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '12px 0 0' }}>
            {course?.title ?? ''}
          </h2>
          {enrollment && (
            <CourseProgressBar
              percent={enrollment.progress}
              completedCount={enrollment.completedLessons ?? completedIds.length}
              totalCount={lessons.length}
              accent={accent}
              compact
              style={{ marginTop: '12px' }}
            />
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <LessonList
            variant="dark"
            rowClickMode="row"
            accent={accent}
            hrefFor={(l) => resolveLessonPath(config, courseId, l.id)}
            onLessonClick={(l) => goToLesson(l.id)}
            lessons={lessons.map((l, i) => ({
              id: l.id,
              title: l.title,
              order: l.order ?? i + 1,
              kind: toLessonKind(l.type),
              durationMinutes: l.durationMinutes,
              completed: completedIds.includes(l.id),
              isPreview: l.isPreview,
              current: l.id === lessonId,
            }))}
          />
        </div>
      </aside>

      {/* 본문 */}
      <main style={mainStyle} ref={contentRef} onScroll={handleContentScroll}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 64px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>
            {lesson.title}
          </h1>

          {lesson.type === 'video' && lesson.videoUrl && (
            <video
              ref={videoRef}
              src={lesson.videoUrl}
              controls
              onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', borderRadius: '12px', background: '#000', marginBottom: '24px' }}
            />
          )}

          {lesson.content && (
            <div style={{ marginBottom: '24px' }}>
              {renderHtml ? (
                renderHtml(lesson.content)
              ) : (
                <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {lesson.content}
                </p>
              )}
            </div>
          )}

          {lesson.type === 'quiz' && hasQuizSupport && quiz && (
            <LmsCard style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                {quiz.title || '퀴즈'}
              </h2>
              {quiz.description && (
                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>{quiz.description}</p>
              )}

              {quizResult ? (
                <div style={quizResultCardStyle(quizResult.passed)}>
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                    {quizResult.passed ? '✅ 통과' : '❌ 미통과'} · {quizResult.score}점
                  </div>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8 }}>
                    <div>총 문항: {quizResult.total}</div>
                    <div>정답: {quizResult.correctCount}</div>
                    <div>오답: {quizResult.total - quizResult.correctCount}</div>
                    <div>합격 기준: {quiz.passingScore}점</div>
                    {quizResult.creditsEarned > 0 && <div>획득 크레딧: {quizResult.creditsEarned}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {!quizResult.passed && (
                      <button type="button" onClick={handleRetryQuiz} style={smallButtonStyle(accent)}>
                        다시 시도
                      </button>
                    )}
                    {port.analyzeQuiz && (
                      <button
                        type="button"
                        onClick={handleAnalyzeQuiz}
                        disabled={aiLoading}
                        style={smallButtonStyle('#7c3aed', aiLoading)}
                      >
                        {aiLoading ? 'AI 분석 중...' : 'AI 분석 보기'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {quiz.questions.map((q, idx) => (
                    <div key={q.id} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                        {idx + 1}. {q.question}
                        {q.type === 'multi' && (
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>(복수 선택)</span>
                        )}
                      </div>
                      {q.type === 'text' ? (
                        <textarea
                          value={(answers[q.id] as string) ?? ''}
                          onChange={(e) => setSingleAnswer(q.id, e.target.value)}
                          rows={3}
                          style={textareaStyle}
                          placeholder="답변을 입력하세요"
                        />
                      ) : (
                        (q.options ?? []).map((opt) => {
                          const checked =
                            q.type === 'multi'
                              ? Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt)
                              : answers[q.id] === opt;
                          return (
                            <label key={opt} style={optionStyle(checked, accent)}>
                              <input
                                type={q.type === 'multi' ? 'checkbox' : 'radio'}
                                name={q.id}
                                checked={checked}
                                onChange={() =>
                                  q.type === 'multi' ? toggleMultiAnswer(q.id, opt) : setSingleAnswer(q.id, opt)
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={!quizAnswered || submittingQuiz}
                    style={primaryButtonStyle(accent, !quizAnswered || submittingQuiz)}
                  >
                    {submittingQuiz ? '제출 중...' : '퀴즈 제출'}
                  </button>
                </div>
              )}
            </LmsCard>
          )}

          {lesson.type === 'assignment' && hasAssignmentSupport && assignment && (
            <LmsCard style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>과제</h2>
              {assignment.instructions && (
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {assignment.instructions}
                </p>
              )}
              {assignment.dueDate && (
                <p style={{ fontSize: '13px', color: '#b45309', margin: '8px 0 0' }}>
                  마감: {new Date(assignment.dueDate).toLocaleString('ko-KR')}
                </p>
              )}

              {submission && !editingSubmission ? (
                <div style={{ marginTop: '16px' }}>
                  <div style={submittedBoxStyle}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                      제출 완료
                      {submission.submittedAt &&
                        ` · ${new Date(submission.submittedAt).toLocaleString('ko-KR')}`}
                    </div>
                    <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                      {submission.content}
                    </div>
                  </div>

                  {(submission.gradingStatus === 'graded' || submission.gradingStatus === 'returned') && (
                    <div style={gradedCardStyle(submission.gradingStatus)}>
                      <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                        {submission.gradingStatus === 'graded' ? '채점 완료' : '반려됨'}
                        {typeof submission.score === 'number' && ` · ${submission.score}점`}
                      </div>
                      {submission.feedback && (
                        <div style={{ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {submission.feedback}
                        </div>
                      )}
                      {submission.gradedAt && (
                        <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '8px' }}>
                          {new Date(submission.gradedAt).toLocaleString('ko-KR')}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentText(submission.content ?? '');
                        setEditingSubmission(true);
                      }}
                      style={smallButtonStyle(accent)}
                    >
                      다시 제출
                    </button>
                    {port.feedbackAssignment && (
                      <button
                        type="button"
                        onClick={handleFeedbackAssignment}
                        disabled={aiLoading}
                        style={smallButtonStyle('#7c3aed', aiLoading)}
                      >
                        {aiLoading ? 'AI 피드백 생성 중...' : 'AI 피드백 받기'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <textarea
                    value={assignmentText}
                    onChange={(e) => setAssignmentText(e.target.value)}
                    rows={8}
                    style={textareaStyle}
                    placeholder="과제 내용을 작성하세요"
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleSubmitAssignment}
                      disabled={submittingAssignment}
                      style={smallButtonStyle(accent, submittingAssignment)}
                    >
                      {submittingAssignment ? '제출 중...' : '제출하기'}
                    </button>
                    {editingSubmission && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubmission(false);
                          setAssignmentText(submission?.content ?? '');
                        }}
                        style={smallButtonStyle('#94a3b8')}
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              )}
            </LmsCard>
          )}

          {aiResult && (
            <LmsCard style={{ marginBottom: '24px', borderColor: '#ddd6fe', background: '#faf5ff' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#6d28d9', margin: '0 0 12px' }}>
                AI 학습 도우미
              </h3>
              {aiResult.summary && (
                <p style={{ fontSize: '14px', color: '#4c1d95', lineHeight: 1.8, margin: '0 0 12px' }}>
                  {aiResult.summary}
                </p>
              )}
              {aiResult.insights.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={aiSubTitleStyle}>분석</div>
                  <ul style={aiListStyle}>
                    {aiResult.insights.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.recommendations.length > 0 && (
                <div>
                  <div style={aiSubTitleStyle}>추천 학습</div>
                  <ul style={aiListStyle}>
                    {aiResult.recommendations.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </LmsCard>
          )}

          {renderBelowContent && <div style={{ marginBottom: '24px' }}>{renderBelowContent({ lesson, course })}</div>}

          {/* 하단 네비게이션 */}
          <div style={navBarStyle}>
            {prevLesson ? (
              <button type="button" onClick={() => goToLesson(prevLesson.id)} style={navButtonStyle}>
                {labels.prevLessonLabel}
              </button>
            ) : (
              <span />
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!enrollmentEnabled ? null : isCompleted ? (
                <span style={completedChipStyle}>완료됨</span>
              ) : (
                lesson.type !== 'quiz' &&
                lesson.type !== 'assignment' && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completing}
                    style={{ ...smallButtonStyle(accent, completing), padding: '10px 20px' }}
                  >
                    {completing ? '처리 중...' : labels.completeLabel}
                  </button>
                )
              )}
              {nextLesson ? (
                <button type="button" onClick={() => goToLesson(nextLesson.id)} style={navButtonStyle}>
                  {labels.nextLessonLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => config.navigate(resolveCoursePath(config, courseId))}
                  style={navButtonStyle}
                >
                  {labels.backToCourseLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showCompletionModal && (
        <div style={modalBackdropStyle} role="dialog" aria-modal="true">
          <div style={modalStyle}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
              {labels.allDoneMessage}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
              {course?.title ?? ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {config.certificatesPath ? (
                <NavLink
                  to={config.certificatesPath}
                  navigate={config.navigate}
                  style={primaryButtonStyle(accent)}
                >
                  {labels.certificateLabel}
                </NavLink>
              ) : config.onCertificateUnavailable ? (
                <button
                  type="button"
                  onClick={config.onCertificateUnavailable}
                  style={primaryButtonStyle(accent)}
                >
                  {labels.certificateLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  config.navigate(resolveCoursePath(config, courseId));
                }}
                style={{ ...navButtonStyle, width: '100%' }}
              >
                {labels.backToCourseLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toLessonKind(type?: string): 'video' | 'article' | 'quiz' | 'assignment' | undefined {
  if (type === 'video' || type === 'article' || type === 'quiz' || type === 'assignment') return type;
  return undefined;
}

const playerLayoutStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f8fafc',
};

const sidebarStyle: CSSProperties = {
  width: '300px',
  flexShrink: 0,
  background: '#0f172a',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',
};

const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '100vh',
  overflowY: 'auto',
};

const navBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  paddingTop: '24px',
  borderTop: '1px solid #e2e8f0',
  flexWrap: 'wrap',
};

const navButtonStyle: CSSProperties = {
  padding: '10px 18px',
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#334155',
  cursor: 'pointer',
};

const completedChipStyle: CSSProperties = {
  padding: '8px 14px',
  background: '#ecfdf5',
  color: '#059669',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
};

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'inherit',
  lineHeight: 1.6,
  boxSizing: 'border-box',
  resize: 'vertical',
};

const submittedBoxStyle: CSSProperties = {
  padding: '14px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
};

const aiSubTitleStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#6d28d9',
  marginBottom: '6px',
};

const aiListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '18px',
  fontSize: '14px',
  color: '#4c1d95',
  lineHeight: 1.8,
};

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalStyle: CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '400px',
  width: '100%',
  textAlign: 'center',
};

function smallButtonStyle(accent: string, disabled?: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    background: accent,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function quizResultCardStyle(passed: boolean): CSSProperties {
  return {
    padding: '20px',
    borderRadius: '12px',
    background: passed ? '#ecfdf5' : '#fef2f2',
    border: `1px solid ${passed ? '#a7f3d0' : '#fecaca'}`,
  };
}

function gradedCardStyle(status: string): CSSProperties {
  const graded = status === 'graded';
  return {
    marginTop: '12px',
    padding: '16px',
    borderRadius: '10px',
    background: graded ? '#eff6ff' : '#fff7ed',
    border: `1px solid ${graded ? '#bfdbfe' : '#fed7aa'}`,
    color: graded ? '#1e40af' : '#9a3412',
  };
}

function optionStyle(checked: boolean, accent: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    marginBottom: '8px',
    border: `1px solid ${checked ? accent : '#e2e8f0'}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: '#334155',
    cursor: 'pointer',
    background: checked ? '#f8fafc' : '#fff',
  };
}
