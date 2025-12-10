/**
 * CourseStatusTag Component
 *
 * Displays course assignment status with color coding
 */

type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

interface CourseStatusTagProps {
  status: AssignmentStatus;
  isOverdue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<
  AssignmentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: '대기',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: '진행중',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  completed: {
    label: '완료',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  expired: {
    label: '만료',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  cancelled: {
    label: '취소',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

export function CourseStatusTag({
  status,
  isOverdue = false,
  size = 'md',
  className = '',
}: CourseStatusTagProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  };

  const displayLabel = isOverdue && status !== 'completed' ? '기한 초과' : config.label;
  const displayColors =
    isOverdue && status !== 'completed'
      ? 'bg-orange-100 text-orange-700'
      : `${config.bgColor} ${config.color}`;

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${sizeClasses[size]} ${displayColors} ${className}`}
    >
      {displayLabel}
    </span>
  );
}

export default CourseStatusTag;
