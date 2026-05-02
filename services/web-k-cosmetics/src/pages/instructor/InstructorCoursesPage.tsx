/**
 * Instructor Courses Page — K-Cosmetics LMS
 *
 * WO-KCOS-LMS-INSTRUCTOR-BOOTSTRAP-V1
 *
 * 강사 본인 강의 목록 (최소 리스트 뷰).
 * 향후 Phase 1-B 에서 행 액션 / 신규 작성 / 편집 진입을 추가한다.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { lmsApi, type LmsCourse } from '@/api/lms';

export default function InstructorCoursesPage() {
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

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/instructor" className="flex items-center gap-1 hover:text-slate-700">
          <ChevronLeft className="w-4 h-4" />
          강사 대시보드
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">내 강의 목록</h1>
        <p className="text-slate-500 mt-1">총 {courses.length}개 강의</p>
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
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {courses.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">등록된 강의가 없습니다.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">제목</th>
                  <th className="px-6 py-3 text-left font-medium">카테고리</th>
                  <th className="px-6 py-3 text-left font-medium">상태</th>
                  <th className="px-6 py-3 text-left font-medium">레슨</th>
                  <th className="px-6 py-3 text-left font-medium">수강</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{course.title}</td>
                    <td className="px-6 py-4 text-slate-600">{course.category ?? '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        course.status === 'published'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {course.status === 'published' ? '공개' : '비공개'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{course.lessonCount ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600">{course.enrollmentCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
