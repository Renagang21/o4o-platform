/**
 * CourseDetailPage — GlycoPharm
 * WO-GLYCOPHARM-COURSE-DETAIL-ENROLL-V1 / WO-GLYCOPHARM-LESSON-QUIZ-LEARNING-V1
 *
 * /education/:id
 * 강의 상세 → 수강신청 → 레슨 선택 → 재생 → 퀴즈 → 진도 저장
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Calendar,
  CheckCircle,
  PlayCircle,
  FileText,
  Lock,
  ChevronRight,
  Award,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { lmsApi, type LmsCourse, type LmsLesson, type LmsQuiz, type QuizSubmitResult, type LmsCertificate } from '@/api/lms';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

// ── 레슨 콘텐츠 렌더러 ───────────────────────────────────────────────────────
function LessonContent({ lesson }: { lesson: LmsLesson }) {
  if (lesson.videoUrl) {
    const isYoutube = lesson.videoUrl.includes('youtube') || lesson.videoUrl.includes('youtu.be');
    const embedUrl = isYoutube
      ? lesson.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')
      : lesson.videoUrl;

    return (
      <div className="space-y-4">
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          {isYoutube ? (
            <iframe
              src={embedUrl}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={lesson.videoUrl} controls className="w-full h-full" />
          )}
        </div>
        {lesson.description && (
          <p className="text-slate-600 text-sm leading-relaxed">{lesson.description}</p>
        )}
      </div>
    );
  }

  // Article/text content
  const raw = lesson.content;
  if (raw) {
    // TipTap JSON → extract text from paragraph nodes
    if (typeof raw === 'object' && raw.type === 'doc' && Array.isArray(raw.content)) {
      const text = raw.content
        .flatMap((node: any) =>
          node.content?.map((c: any) => c.text ?? '') ?? ['\n']
        )
        .join('');
      return (
        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
          {text}
        </div>
      );
    }
    if (typeof raw === 'string') {
      return (
        <div
          className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      );
    }
  }

  return (
    <div className="text-center py-8 text-slate-400">
      <FileText className="w-10 h-10 mx-auto mb-2" />
      <p className="text-sm">콘텐츠를 불러올 수 없습니다.</p>
    </div>
  );
}

// ── 퀴즈 컴포넌트 ────────────────────────────────────────────────────────────
function QuizPanel({
  quiz,
  onComplete,
}: {
  quiz: LmsQuiz;
  onComplete: (result: QuizSubmitResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSingle = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleMulti = (qId: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[qId] as string[]) ?? [];
      return {
        ...prev,
        [qId]: checked ? [...current, value] : current.filter((v) => v !== value),
      };
    });
  };

  const handleText = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? '',
      }));
      const res = await lmsApi.submitQuiz(quiz.id, payload);
      setResult(res);
      onComplete(res);
    } catch {
      setError('퀴즈 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className={`rounded-xl p-5 ${result.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.passed ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <span className="text-red-500 font-medium">✗</span>
          )}
          <span className={`font-semibold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
            {result.passed ? '통과!' : '미통과'}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          점수: <strong>{Math.round(result.score)}점</strong> / 통과 기준: {quiz.passingScore}점
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl p-5 space-y-5 border border-slate-200">
      <h4 className="font-semibold text-slate-800">퀴즈: {quiz.title}</h4>

      {quiz.questions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              {idx + 1}. {q.question}
            </p>

            {q.type === 'single' && q.options && (
              <div className="space-y-1.5">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleSingle(q.id, opt)}
                      className="text-primary-600"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multi' && q.options && (
              <div className="space-y-1.5">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                    <input
                      type="checkbox"
                      value={opt}
                      checked={((answers[q.id] as string[]) ?? []).includes(opt)}
                      onChange={(e) => handleMulti(q.id, opt, e.target.checked)}
                      className="text-primary-600"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <input
                type="text"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => handleText(q.id, e.target.value)}
                placeholder="답변을 입력하세요"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>
        ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
      >
        {submitting ? '제출 중...' : '퀴즈 제출'}
      </button>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  // Course state
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrollment state
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Lesson state
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LmsLesson | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  // Quiz state
  const [quiz, setQuiz] = useState<LmsQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // Certificate state
  const [certificate, setCertificate] = useState<LmsCertificate | null>(null);
  const [loadingCertificate, setLoadingCertificate] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── 강의 조회 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    lmsApi.getCourseById(id)
      .then((data) => { if (!cancelled) setCourse(data); })
      .catch(() => { if (!cancelled) setError('강의 정보를 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // ── 수강 상태 조회 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    lmsApi.getMyEnrollment(id).then((e) => { if (e) setEnrolled(true); });
  }, [id, isAuthenticated]);

  // ── 레슨 목록 조회 (enrolled 후) ───────────────────────────────────────────
  useEffect(() => {
    if (!id || !enrolled) return;
    let cancelled = false;
    setLessonsLoading(true);
    lmsApi.getLessonsByCourse(id)
      .then((data) => {
        if (!cancelled) {
          const sorted = [...data].sort((a, b) => a.order - b.order);
          setLessons(sorted);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLessonsLoading(false); });
    return () => { cancelled = true; };
  }, [id, enrolled]);

  // ── 인증서 조회 (완료 시 자동) ─────────────────────────────────────────────
  const progress = lessons.length > 0
    ? Math.round((completedLessonIds.size / lessons.length) * 100)
    : 0;
  const completed = enrolled && lessons.length > 0 && completedLessonIds.size >= lessons.length;

  useEffect(() => {
    if (!id || !completed || certificate !== null) return;
    let cancelled = false;
    setLoadingCertificate(true);
    lmsApi.getMyCertificate(id)
      .then((cert) => { if (!cancelled) setCertificate(cert); })
      .finally(() => { if (!cancelled) setLoadingCertificate(false); });
    return () => { cancelled = true; };
  }, [id, completed, certificate]);

  // ── 인증서 다운로드 ────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!certificate || downloading) return;
    setDownloading(true);
    try {
      const blob = await lmsApi.downloadCertificate(certificate.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // PDF 다운로드 실패 시 조용히 무시
    } finally {
      setDownloading(false);
    }
  };

  // ── 레슨 선택 시 퀴즈 조회 ──────────────────────────────────────────────────
  const handleSelectLesson = useCallback(async (lesson: LmsLesson) => {
    setSelectedLesson(lesson);
    setQuiz(null);
    setLessonCompleted(completedLessonIds.has(lesson.id));
    setQuizLoading(true);
    try {
      const q = await lmsApi.getLessonQuiz(lesson.id);
      setQuiz(q);
    } finally {
      setQuizLoading(false);
    }
  }, [completedLessonIds]);

  // ── 레슨 완료 처리 ─────────────────────────────────────────────────────────
  const handleCompleteLesson = async () => {
    if (!id || !selectedLesson) return;
    setCompleting(true);
    try {
      await lmsApi.updateProgress(id, selectedLesson.id);
      setCompletedLessonIds((prev) => new Set([...prev, selectedLesson.id]));
      setLessonCompleted(true);
    } catch {
      // silent fail — progress is best-effort
    } finally {
      setCompleting(false);
    }
  };

  // ── 수강신청 ───────────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!isAuthenticated) { openLoginModal(`/education/${id}`); return; }
    if (!id) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await lmsApi.enrollCourse(id);
      setEnrolled(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (msg?.includes('already enrolled')) { setEnrolled(true); }
      else { setEnrollError(msg ?? '수강신청 중 오류가 발생했습니다.'); }
    } finally {
      setEnrolling(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-24 mb-6" />
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="aspect-video bg-slate-100" />
          <div className="p-8 space-y-4">
            <div className="h-6 bg-slate-100 rounded w-2/3" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !course) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> 강의 목록으로
        </button>
        <div className="text-center py-16 bg-white rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">{error ?? '강의를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Back */}
      <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 강의 목록으로
      </button>

      {/* Course Header */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {course.thumbnail && (
          <div className="aspect-video bg-slate-100">
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">{course.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
            {course.duration > 0 && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.duration}분</span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(course.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {course.description && (
            <p className="text-slate-600 leading-relaxed mb-5">{course.description}</p>
          )}

          {/* Progress / Completion */}
          {enrolled && lessons.length > 0 && (
            <div className="mb-5">
              {completed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 rounded-xl border border-green-200 w-fit">
                  <Award className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-green-700 font-semibold text-sm">수료 완료</span>
                  <span className="text-green-500 text-xs">· 전체 {lessons.length}개 레슨</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>진행률</span>
                    <span>{completedLessonIds.size} / {lessons.length} 레슨 완료 ({progress}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Enroll / Enrolled */}
          <div className="flex items-center gap-3">
            {enrolled ? (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-xl font-medium text-sm">
                <CheckCircle className="w-4 h-4" /> 수강중
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-7 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {enrolling ? '신청 중...' : '수강신청'}
              </button>
            )}
            {enrollError && <p className="text-sm text-red-500">{enrollError}</p>}
          </div>

          {/* Certificate section */}
          {completed && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              {loadingCertificate ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>수료증 확인 중...</span>
                </div>
              ) : certificate ? (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800">수료증 발급 완료</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        발급일: {new Date(certificate.issuedAt).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => window.open(`/api/v1/lms/certificates/${certificate.id}/download`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        인증서 보기
                      </button>
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60"
                      >
                        {downloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        PDF 다운로드
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Award className="w-4 h-4" />
                  <span>수료증이 아직 발급 처리 중입니다.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lesson section */}
      {enrolled && (
        <div className={`flex gap-5 ${selectedLesson ? 'flex-col lg:flex-row' : ''}`}>
          {/* Lesson list */}
          <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${selectedLesson ? 'lg:w-72 flex-shrink-0' : 'w-full'}`}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">레슨 목록</h2>
              {lessons.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">{lessons.length}개 레슨</p>
              )}
            </div>

            {lessonsLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : lessons.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">등록된 레슨이 없습니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {lessons.map((lesson, idx) => {
                  const isSelected = selectedLesson?.id === lesson.id;
                  const isDone = completedLessonIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                          isDone
                            ? 'bg-green-100 text-green-600'
                            : isSelected
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`text-sm font-medium block truncate ${
                            isSelected ? 'text-primary-700' : 'text-slate-700'
                          }`}>
                            {lesson.title}
                          </span>
                          {lesson.duration > 0 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />{lesson.duration}분
                            </span>
                          )}
                        </span>
                        <span className="flex-shrink-0 text-slate-300">
                          {lesson.videoUrl
                            ? <PlayCircle className="w-4 h-4" />
                            : <FileText className="w-4 h-4" />}
                        </span>
                        {isSelected && <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Lesson content area */}
          {selectedLesson && (
            <div className="flex-1 min-w-0 space-y-5">
              {/* Lesson player */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{selectedLesson.title}</h3>
                    {selectedLesson.description && (
                      <p className="text-sm text-slate-500 mt-1">{selectedLesson.description}</p>
                    )}
                  </div>
                  {lessonCompleted && (
                    <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium flex-shrink-0">
                      <CheckCircle className="w-4 h-4" /> 완료
                    </span>
                  )}
                </div>

                <LessonContent lesson={selectedLesson} />

                {/* Complete button */}
                {!lessonCompleted && (
                  <button
                    onClick={handleCompleteLesson}
                    disabled={completing}
                    className="mt-5 w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {completing ? '저장 중...' : '레슨 완료'}
                  </button>
                )}
              </div>

              {/* Quiz */}
              {quizLoading && (
                <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              )}
              {!quizLoading && quiz && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">이 레슨의 퀴즈</h4>
                  <QuizPanel
                    quiz={quiz}
                    onComplete={(result) => {
                      if (result.passed && !lessonCompleted) {
                        handleCompleteLesson();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Not enrolled prompt (fallback — should not appear) */}
        </div>
      )}

      {/* Not enrolled — show locked lesson preview */}
      {!enrolled && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">레슨 목록</h2>
            <p className="text-xs text-slate-400 mt-0.5">수강신청 후 이용 가능합니다</p>
          </div>
          <div className="p-8 text-center text-slate-400">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">수강신청 후 레슨을 학습할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
