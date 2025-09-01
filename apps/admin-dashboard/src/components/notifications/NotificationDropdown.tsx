import { FC, useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  RefreshCw, 
  MessageSquare, 
  Shield, 
  AlertCircle,
  Check,
  CheckCheck,
  X,
  Clock,
  ExternalLink,
  Settings,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Notification, NotificationType } from '@/types/notifications';
import { notificationApi } from '@/api/notifications';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface NotificationDropdownProps {
  type: 'all' | 'update' | 'comment';
  count: number;
  onCountChange?: (count: number) => void;
  trigger: React.ReactNode;
}

export const NotificationDropdown: FC<NotificationDropdownProps> = ({
  type,
  count: initialCount,
  onCountChange,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(initialCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const filters = type !== 'all' ? { types: [type as NotificationType] } : undefined;
      const response = await notificationApi.getNotifications(filters, undefined, 10);
      setNotifications(response.notifications);
      
      // Update count
      const newCount = type === 'all' 
        ? response.unread 
        : response.notifications.filter(n => n.status === 'unread').length;
      
      setCount(newCount);
      onCountChange?.(newCount);
    } catch (error) {
      // Error log removed
      toast.error('알림을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await notificationApi.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
        );
        setCount(prev => Math.max(0, prev - 1));
        onCountChange?.(Math.max(0, count - 1));
      }
    } catch (error) {
      // Error log removed
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationApi.markAllAsRead(
        type !== 'all' ? type : undefined
      );
      
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'read' }))
        );
        setCount(0);
        onCountChange?.(0);
        toast.success(response.message || '모든 알림을 읽음 처리했습니다.');
      }
    } catch (error) {
      // Error log removed
      toast.error('알림 처리에 실패했습니다.');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    try {
      const response = await notificationApi.deleteNotification(notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update count if it was unread
        const notification = notifications.find(n => n.id === notificationId);
        if (notification?.status === 'unread') {
          setCount(prev => Math.max(0, prev - 1));
          onCountChange?.(Math.max(0, count - 1));
        }
        
        toast.success('알림이 삭제되었습니다.');
      }
    } catch (error) {
      // Error log removed
      toast.error('알림 삭제에 실패했습니다.');
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'update':
        return <RefreshCw className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'system':
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, type]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = notificationApi.subscribeToNotifications((notification) => {
      if (type === 'all' || notification.type === type) {
        setNotifications(prev => [notification, ...prev].slice(0, 10));
        setCount(prev => prev + 1);
        onCountChange?.(count + 1);
        
        // Show toast for new notification
        toast(
          <div className="flex items-center gap-2">
            {getNotificationIcon(notification)}
            <div>
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm text-gray-600">{notification.message}</div>
            </div>
          </div>,
          {
            duration: 5000,
            position: 'top-right'
          }
        );
      }
    });

    return () => unsubscribe();
  }, [type, count, onCountChange]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        {trigger}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[100001] 
                      max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {type === 'update' && '업데이트 알림'}
              {type === 'comment' && '댓글 알림'}
              {type === 'all' && '모든 알림'}
            </h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="모두 읽음 처리"
                >
                  <CheckCheck className="w-3 h-3" />
                  모두 읽음
                </button>
              )}
              <Link
                to="/notifications/settings"
                className="text-gray-400 hover:text-gray-600"
                title="알림 설정"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                알림을 불러오는 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>새로운 알림이 없습니다</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors
                      ${notification.status === 'unread' ? 'bg-blue-50 hover:bg-blue-100' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {notification.message}
                            </p>
                            
                            {/* Additional info for specific types */}
                            {notification.type === 'update' && 'version' in notification && (
                              <div className="text-xs text-gray-500 mt-1">
                                버전: {notification.version}
                              </div>
                            )}
                            
                            {notification.type === 'comment' && 'authorName' in notification && (
                              <div className="text-xs text-gray-500 mt-1">
                                작성자: {notification.authorName}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(notification.timestamp), {
                                  addSuffix: true,
                                  locale: ko
                                })}
                              </span>
                              
                              {notification.link && (
                                <Link
                                  to={notification.link}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  onClick={() => {
                                    handleMarkAsRead(notification.id);
                                    setIsOpen(false);
                                  }}
                                >
                                  자세히 보기
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {notification.status === 'unread' && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="읽음 처리"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200">
              <Link
                to={`/notifications${type !== 'all' ? `?type=${type}` : ''}`}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
              >
                모든 알림 보기
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};