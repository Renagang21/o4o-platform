/**
 * Instructor Dashboard Page — K-Cosmetics LMS
 *
 * WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1
 *
 * 최소 진입점. 향후 Phase 1-B에서 풀세트 구조로 확장한다 (CourseList/Edit/Participants 등).
 * 패턴은 KPA-Society InstructorDashboardPage 를 reference 로 한다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { lmsApi, type LmsCourse } from '@/api/lms';

export default function InstructorDashboardPage() {
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await lmsApi.getInstructorCourses();
        if (!cancelled) setCourses(res.data ?? []);
      } catch {
        if (!cancelled) setError('강의 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const publishedCount = courses.filter(c => c.status === 'published').length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-pink-600" />
          강사 대시보드
        </h1>
        <p className="text-slate-500 mt-1">내 강의를 관리하고 현황을 확인합니다.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-pink-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-pink-600" />
                </div>
                <span className="text-sm text-slate-500 font-medium">총 강의</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{courses.length}</p>
              <p className="text-xs text-slate-400 mt-1">공개 {publishedCount}개</p>
            </div>
            <Link
              to="/instructor/courses"
              className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-slate-500 font-medium">강의 목록 관리</p>
                <p className="text-base font-semibold text-slate-800 mt-1">전체 강의 보기</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">최근 강의</h2>
            </div>
            {courses.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">등록된 강의가 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {courses.slice(0, 5).map((course) => (
                  <div key={course.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{course.title}</h3>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        course.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {course.status === 'published' ? '공개' : '비공개'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
