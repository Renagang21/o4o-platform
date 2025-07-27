import { FC } from 'react';
/**
 * Notification Item Component
 * 개별 알림 아이템
 */


import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Info, 
  ExternalLink, 
  X,
  Eye
} from 'lucide-react';

interface NotificationData {
  id: string;
  type: 'urgent' | 'approval' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAction?: (url: string) => void;
}

const NotificationItem: FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDismiss,
  onAction
}) => {
  const { id, type, title, message, time, read, actionUrl } = notification;

  // 타입별 스타일 설정
  const typeConfig = {
    urgent: {
      icon: <AlertTriangle className="w-4 h-4" />,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-900',
      badge: '긴급'
    },
    approval: {
      icon: <Clock className="w-4 h-4" />,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      titleColor: 'text-orange-900',
      badge: '승인'
    },
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      titleColor: 'text-green-900',
      badge: '성과'
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      titleColor: 'text-blue-900',
      badge: '정보'
    }
  };

  const config = typeConfig[type];

  const handleMarkRead = () => {
    if (!read && onMarkRead) {
      onMarkRead(id);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(id);
    }
  };

  const handleAction = () => {
    if (actionUrl && onAction) {
      onAction(actionUrl);
    }
    handleMarkRead();
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border transition-all duration-200 cursor-pointer
        ${read 
          ? 'bg-gray-50 border-gray-200 opacity-75' 
          : `${config.bgColor} ${config.borderColor} shadow-sm hover:shadow-md`
        }
      `}
      onClick={handleMarkRead}
    >
      {/* Unread Indicator */}
      {!read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}

      <div className="flex items-start">
        {/* Icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0
          ${read ? 'bg-gray-200' : config.bgColor}
        `}>
          <div className={read ? 'text-gray-500' : config.iconColor}>
            {config.icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <h4 className={`text-sm font-medium truncate ${
                read ? 'text-gray-600' : config.titleColor
              }`}>
                {title}
              </h4>
              <span className={`
                ml-2 px-2 py-1 text-xs rounded-full
                ${read 
                  ? 'bg-gray-200 text-gray-600' 
                  : `${config.bgColor} ${config.iconColor}`
                }
              `}>
                {config.badge}
              </span>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {/* Time */}
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {time}
              </span>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!read && (
                  <button
                    onClick={(e: any) => {
                      e.stopPropagation();
                      handleMarkRead();
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="읽음 처리"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                )}
                
                <button
                  onClick={(e: any) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="삭제"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Message */}
          <p className={`text-sm leading-relaxed ${
            read ? 'text-gray-500' : 'text-gray-700'
          }`}>
            {message}
          </p>

          {/* Action Button */}
          {actionUrl && (
            <button
              onClick={(e: any) => {
                e.stopPropagation();
                handleAction();
              }}
              className={`
                mt-2 inline-flex items-center text-xs font-medium transition-colors
                ${read 
                  ? 'text-gray-400 hover:text-gray-600' 
                  : `${config.iconColor} hover:underline`
                }
              `}
            >
              <span>바로 가기</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>
      </div>

      {/* Priority Border for Urgent */}
      {type === 'urgent' && !read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg"></div>
      )}
    </div>
  );
};

export default NotificationItem;