/**
 * CourseDetailPage — GlycoPharm
 * WO-GLYCOPHARM-COURSE-DETAIL-ENROLL-V1
 *
 * /education/:id
 * 강의 상세 조회 + 수강신청
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, BarChart2, Calendar, CheckCircle } from 'lucide-react';
import { lmsApi, type LmsCourse } from '@/api/lms';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

const LEVEL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await lmsApi.getCourseById(id);
        if (!cancelled) setCourse(data);
      } catch {
        if (!cancelled) setError('강의 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourse();
    return () => { cancelled = true; };
  }, [id]);

  // 로그인된 경우 수강 상태 조회
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let cancelled = false;

    lmsApi.getMyEnrollment(id).then((enrollment) => {
      if (!cancelled && enrollment) setEnrolled(true);
    });

    return () => { cancelled = true; };
  }, [id, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      openLoginModal(`/education/${id}`);
      return;
    }
    if (!id) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await lmsApi.enrollCourse(id);
      setEnrolled(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (msg?.includes('already enrolled')) {
        setEnrolled(true);
      } else {
        setEnrollError(msg ?? '수강신청 중 오류가 발생했습니다.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-pulse">
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
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          onClick={() => navigate('/education')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          강의 목록으로
        </button>
        <div className="text-center py-16 bg-white rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">{error ?? '강의를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back */}
      <button
        onClick={() => navigate('/education')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        강의 목록으로
      </button>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Thumbnail */}
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-20 h-20 text-slate-300" />
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Level badge */}
          <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full mb-3">
            {LEVEL_LABEL[course.level] ?? course.level}
          </span>

          <h1 className="text-2xl font-bold text-slate-800 mb-4">{course.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
            {course.duration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {course.duration}분
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" />
              {LEVEL_LABEL[course.level] ?? course.level}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(course.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-slate-600 leading-relaxed mb-8 whitespace-pre-line">
              {course.description}
            </p>
          )}

          <hr className="border-slate-100 mb-8" />

          {/* Enroll section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {enrolled ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl font-medium">
                <CheckCircle className="w-5 h-5" />
                수강중
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-8 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {enrolling ? '신청 중...' : '수강신청'}
              </button>
            )}
            {enrollError && (
              <p className="text-sm text-red-500">{enrollError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
