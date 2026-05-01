/**
 * Instructor Dashboard Page — GlycoPharm LMS
 * WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1
 *
 * GET /lms/instructor/courses — requireAuth + requireInstructor
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import type { LmsCourse } from '@/api/lms';

interface InstructorCourseStats {
  enrolledCount?: number;
  completionRate?: number;
}

type InstructorCourse = LmsCourse & InstructorCourseStats;

export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{ success: boolean; data: InstructorCourse[] }>(
          '/lms/instructor/courses',
        );
        if (!cancelled) {
          setCourses(data.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('강의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrolledCount ?? 0), 0);
  const publishedCount = courses.filter(c => c.isPublished).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-primary-600" />
          강사 대시보드
        </h1>
        <p className="text-slate-500 mt-1">내 강의를 관리하고 현황을 확인합니다.</p>
      </div>

      {/* KPI Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-slate-500 font-medium">총 강의</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{courses.length}</p>
            <p className="text-xs text-slate-400 mt-1">공개 {publishedCount}개</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-slate-500 font-medium">총 수강생</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{totalEnrolled}</p>
            <p className="text-xs text-slate-400 mt-1">누적 수강신청</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart2 className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-slate-500 font-medium">공개율</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {courses.length > 0 ? Math.round((publishedCount / courses.length) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">{publishedCount}/{courses.length} 공개</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600">{error}</p>
        </div>
      )}

      {/* Course List */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">내 강의 목록</h2>
          </div>

          {courses.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">등록된 강의가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/education/${course.id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        course.isPublished
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {course.isPublished ? '공개' : '비공개'}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-800 truncate">{course.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {course.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.duration}분
                        </span>
                      )}
                      {course.enrolledCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course.enrolledCount}명 수강
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
