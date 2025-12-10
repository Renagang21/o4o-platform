/**
 * AssignmentStatusTag Component
 *
 * Displays course assignment status with color coding
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Ban,
} from 'lucide-react';

type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

interface AssignmentStatusTagProps {
  status: AssignmentStatus;
  isOverdue?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<AssignmentStatus, {
  label: string;
  labelKo: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: 'Pending',
    labelKo: '대기',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 hover:bg-gray-200',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    labelKo: '진행중',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
    icon: PlayCircle,
  },
  completed: {
    label: 'Completed',
    labelKo: '완료',
    color: 'text-green-700',
    bgColor: 'bg-green-100 hover:bg-green-200',
    icon: CheckCircle,
  },
  expired: {
    label: 'Expired',
    labelKo: '만료',
    color: 'text-red-700',
    bgColor: 'bg-red-100 hover:bg-red-200',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    labelKo: '취소',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    icon: Ban,
  },
};

export function AssignmentStatusTag({
  status,
  isOverdue = false,
  showIcon = true,
  size = 'md',
  className,
}: AssignmentStatusTagProps) {
  const config = statusConfig[status];
  const Icon = isOverdue && status !== 'completed' ? AlertTriangle : config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-medium border-0',
        sizeClasses[size],
        isOverdue && status !== 'completed'
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : cn(config.bgColor, config.color),
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{isOverdue && status !== 'completed' ? '기한 초과' : config.labelKo}</span>
    </Badge>
  );
}

export default AssignmentStatusTag;
