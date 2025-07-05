/**
 * Activity Item Component
 * 개별 활동 아이템
 */


import { Clock } from 'lucide-react';

interface ActivityData {
  id: string;
  type: 'user' | 'order' | 'product' | 'content';
  message: string;
  time: string;
  user?: string;
  icon: string;
}

interface ActivityItemProps {
  activity: ActivityData;
  typeColor: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, typeColor }) => {
  const { type, message, time, user, icon } = activity;

  // 타입별 배경색
  const getTypeBgColor = (type: string) => {
    const colors = {
      user: 'bg-blue-50',
      order: 'bg-green-50',
      product: 'bg-purple-50',
      content: 'bg-orange-50'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-50';
  };

  const formatTime = (timeString: string) => {
    // 실제 구현에서는 moment.js나 date-fns 사용
    return timeString;
  };

  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150">
      {/* Icon */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
        ${getTypeBgColor(type)}
      `}>
        <span role="img" aria-label={type}>
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Message */}
            <p className="text-sm text-gray-900 leading-relaxed">
              {message}
            </p>
            
            {/* User and Time */}
            <div className="flex items-center mt-1 text-xs text-gray-500">
              {user && (
                <>
                  <span className="font-medium text-gray-600">{user}</span>
                  <span className="mx-1">•</span>
                </>
              )}
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <time dateTime={time}>
                  {formatTime(time)}
                </time>
              </div>
            </div>
          </div>

          {/* Type Badge */}
          <span className={`
            ml-2 px-2 py-1 text-xs rounded-full font-medium flex-shrink-0
            ${typeColor} ${getTypeBgColor(type)}
          `}>
            {type === 'user' && '사용자'}
            {type === 'order' && '주문'}
            {type === 'product' && '상품'}
            {type === 'content' && '콘텐츠'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;