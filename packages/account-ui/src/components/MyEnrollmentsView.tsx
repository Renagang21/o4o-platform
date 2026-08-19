/**
 * MyEnrollmentsView — 내 수강 목록 공통 View
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §8
 * K-Cosmetics / GlycoPharm 의 동일 View 중복(차이 = 주석 · navItems)을 공통화한다.
 * 데이터 로딩(서비스별 lmsApi)과 navigation 은 서비스 wrapper 가 주입한다.
 * KPA 는 hybrid list UX(WO-O4O-KPA-MY-ENROLLMENTS-HYBRID-LIST-ALIGN-V1)로 별도 유지.
 */

import { useState } from 'react';
import { MyPageLoadingState } from './MyPageLoadingState.js';
import { MyPageEmptyState } from './MyPageEmptyState.js';

export type MyEnrollmentStatus =
  | 'pending' | 'approved' | 'rejected'
  | 'in_progress' | 'completed' | 'cancelled' | 'expired';

const STATUS_LABEL: Record<MyEnrollmentStatus, string> = {
  pending: '승인 대기',
  approved: '수강 중',
  rejected: '신청 거절',
  in_progress: '수강 중',
  completed: '수강 완료',
  cancelled: '취소됨',
  expired: '만료됨',
};

const STATUS_COLOR: Record<MyEnrollmentStatus, string> = {
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

const matchStatus = (status: string | undefined, filter: string) => {
  if (filter === 'all') return true;
  if (filter === 'in_progress') return status === 'in_progress' || status === 'approved';
  if (filter === 'cancelled') return ['cancelled', 'rejected', 'expired'].includes(status ?? '');
  return status === filter;
};

export interface MyEnrollmentsViewProps {
  enrollments: any[];
  loading?: boolean;
  error?: string | null;
  /** 강의 목록(둘러보기) 이동 */
  onBrowseCourses: () => void;
  /** 강의 상세 이동 */
  onOpenCourse: (courseId: string) => void;
  /** 수료증 화면 이동 */
  onOpenCertificates: () => void;
}

export function MyEnrollmentsView({
  enrollments,
  loading = false,
  error = null,
  onBrowseCourses,
  onOpenCourse,
  onOpenCertificates,
}: MyEnrollmentsViewProps) {
  const [filter, setFilter] = useState('all');
  const filtered = enrollments.filter((e: any) => matchStatus(e.status, filter));

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const count = f.value === 'all'
            ? enrollments.length
            : enrollments.filter((e: any) => matchStatus(e.status, f.value)).length;
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
          onAction={filter === 'all' ? onBrowseCourses : undefined}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((enrollment: any) => {
            const course = enrollment.course ?? {};
            const status: MyEnrollmentStatus = enrollment.status ?? 'in_progress';
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
                      onClick={() => onOpenCourse(enrollment.courseId)}
                      className="px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
                    >
                      이어서 학습
                    </button>
                  )}
                  {isCompleted && (
                    <>
                      <button
                        onClick={onOpenCertificates}
                        className="px-4 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
                      >
                        수료증 보기
                      </button>
                      <button
                        onClick={() => onOpenCourse(enrollment.courseId)}
                        className="px-4 py-2 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        다시 보기
                      </button>
                    </>
                  )}
                  {!isActive && !isCompleted && (
                    <button
                      onClick={() => onOpenCourse(enrollment.courseId)}
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
    </>
  );
}
