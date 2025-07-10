/**
 * Notification Badge Component
 * 알림 배지 컴포넌트
 */



interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'orange' | 'blue' | 'green';
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  className = '',
  size = 'md',
  color = 'red'
}) => {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: 'h-4 min-w-4 px-1 text-xs',
    md: 'h-5 min-w-5 px-1.5 text-xs',
    lg: 'h-6 min-w-6 px-2 text-sm'
  };

  const colorClasses = {
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white'
  };

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        ${colorClasses[color]}
        font-bold rounded-full
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;