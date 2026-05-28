/**
 * MyEnrollmentsPage — 내 수강 목록
 *
 * WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1
 * KPA Canonical 기준 정렬. API: GET /lms/enrollments/me
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageLayout, MyPageLoadingState, MyPageEmptyState } from '@o4o/account-ui';
import { KCOS_MYPAGE_NAV_ITEMS } from './navItems';
import { lmsApi } from '@/api/lms';
import { useAuth } from '@/contexts/AuthContext';

type EnrollmentStatus =
  | 'pending' | 'approved' | 'rejected'
  | 'in_progress' | 'completed' | 'cancelled' | 'expired';

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: '승인 대기',
  approved: '수강 중',
  rejected: '신청 거절',
  in_progress: '수강 중',
  completed: '수강 완료',
  cancelled: '취소됨',
  expired: '만료됨',
};

const STATUS_COLOR: Record<EnrollmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
};

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'in_progress', label: '수강 중' },
  { value: 'pending', label: '대기 중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
];

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await lmsApi.getMyEnrollments();
      const raw = res?.data ?? res;
      setEnrollments(Array.isArray(raw) ? raw : []);
    } catch {
      setError('수강 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const matchFilter = (e: any) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return e.status === 'in_progress' || e.status === 'approved';
    if (filter === 'cancelled') return ['cancelled', 'rejected', 'expired'].includes(e.status);
    return e.status === filter;
  };

  const filtered = enrollments.filter(matchFilter);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm w-full">
          <p className="text-gray-700 mb-4">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <MyPageLayout
      title="내 수강 목록"
      subtitle="신청하거나 진행 중인 강의를 확인하세요"
      navItems={KCOS_MYPAGE_NAV_ITEMS}
    >
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const count = f.value === 'all'
            ? enrollments.length
            : enrollments.filter((e) => {
                if (f.value === 'in_progress') return e.status === 'in_progress' || e.status === 'approved';
                if (f.value === 'cancelled') return ['cancelled', 'rejected', 'expired'].includes(e.status);
                return e.status === f.value;
              }).length;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label} {f.value !== 'all' && `(${count})`}
            </button>
          );
        })}
      </div>

      {loading && <MyPageLoadingState />}

      {!loading && error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <MyPageEmptyState
          description={filter === 'all' ? '수강 중인 강의가 없습니다.' : '해당 상태의 강의가 없습니다.'}
          actionLabel={filter === 'all' ? '강의 둘러보기' : undefined}
          onAction={filter === 'all' ? () => navigate('/lms') : undefined}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((enrollment: any) => {
            const course = enrollment.course ?? {};
            const status: EnrollmentStatus = enrollment.status ?? 'in_progress';
            const isCompleted = status === 'completed';
            const isActive = status === 'in_progress' || status === 'approved';
            const progress = enrollment.progressPercentage ?? 0;

            return (
              <div
                key={enrollment.id}
                className="bg-white rounded-2xl shadow-sm p-5 flex flex-wrap gap-4 items-center"
              >
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {course.thumbnail
                    ? <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    : <span className="text-2xl">📚</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {course.title ?? '(제목 없음)'}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  {(isActive || isCompleted) && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{enrollment.completedLessons ?? 0}/{enrollment.totalLessons ?? 0} 레슨</span>
                        <span className="font-medium text-gray-600">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-indigo-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {isActive && (
                    <button
                      onClick={() => navigate(`/lms/course/${enrollment.courseId}`)}
                      className="px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
                    >
                      이어서 학습
                    </button>
                  )}
                  {isCompleted && (
                    <>
                      <button
                        onClick={() => navigate('/mypage/certificates')}
                        className="px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
                      >
                        수료증 보기
                      </button>
                      <button
                        onClick={() => navigate(`/lms/course/${enrollment.courseId}`)}
                        className="px-4 py-2 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        다시 보기
                      </button>
                    </>
                  )}
                  {!isActive && !isCompleted && (
                    <button
                      onClick={() => navigate(`/lms/course/${enrollment.courseId}`)}
                      className="px-4 py-2 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      강의 보기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && enrollments.length > 0 && (
        <p className="mt-4 text-xs text-right text-gray-400">
          전체 {enrollments.length}개 · 표시 {filtered.length}개
        </p>
      )}
    </MyPageLayout>
  );
}
