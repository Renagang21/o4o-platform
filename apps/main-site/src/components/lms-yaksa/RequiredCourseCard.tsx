/**
 * RequiredCourseCard Component
 *
 * Displays a required course assignment with progress and actions
 */

import { Link } from 'react-router-dom';
import type { CourseAssignment } from '@/lib/api/lmsYaksaMember';

interface RequiredCourseCardProps {
  assignment: CourseAssignment;
  onStartCourse?: (courseId: string) => void;
}

export function RequiredCourseCard({ assignment, onStartCourse }: RequiredCourseCardProps) {
  const isOverdue =
    assignment.dueDate &&
    new Date(assignment.dueDate) < new Date() &&
    !assignment.isCompleted;

  const statusColors = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    pending: '대기',
    in_progress: '진행중',
    completed: '완료',
    expired: '만료',
    cancelled: '취소',
  };

  const getActionButton = () => {
    if (assignment.isCompleted) {
      return (
        <Link
          to={`/lms/course/${assignment.courseId}`}
          className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          복습하기
        </Link>
      );
    }

    if (assignment.status === 'in_progress') {
      return (
        <Link
          to={`/lms/course/${assignment.courseId}`}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          계속 학습하기
        </Link>
      );
    }

    return (
      <button
        onClick={() => onStartCourse?.(assignment.courseId)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        학습 시작
      </button>
    );
  };

  return (
    <div
      className={`p-4 bg-white border rounded-lg shadow-sm ${
        isOverdue ? 'border-red-300' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {assignment.isMandatory && (
              <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded">
                필수
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${
                isOverdue ? 'bg-orange-100 text-orange-700' : statusColors[assignment.status]
              }`}
            >
              {isOverdue ? '기한 초과' : statusLabels[assignment.status]}
            </span>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {assignment.course?.title || `강좌 ID: ${assignment.courseId.slice(0, 8)}...`}
          </h3>

          {assignment.course?.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {assignment.course.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {assignment.course?.credits && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {assignment.course.credits} 평점
              </span>
            )}
            {assignment.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue ? 'text-red-600' : ''
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                마감: {new Date(assignment.dueDate).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>

        <div className="ml-4">{getActionButton()}</div>
      </div>

      {/* Progress Bar */}
      {!assignment.isCompleted && assignment.progressPercent > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">진행률</span>
            <span className="font-medium">{assignment.progressPercent}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${assignment.progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RequiredCourseCard;
