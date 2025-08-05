import { FC, useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { Bell, AlertCircle, MessageSquare, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'new_feedback' | 'feedback_update' | 'new_message' | 'urgent_feedback' | 'new_registration';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  feedbackId?: string;
  conversationId?: string;
  read?: boolean;
}

interface RealtimeNotificationsProps {
  className?: string;
}

export const RealtimeNotifications: FC<RealtimeNotificationsProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { token, user } = useAuthStore();

  // Socket.io 연결
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // 연결 이벤트
    socket.on('connect', () => {
      // Realtime notifications connected
      
      // 관리자 채널 구독
      socket.emit('subscribe', {
        channel: 'admin-notifications',
        userId: user.id
      });
    });

    // 알림 수신
    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20)); // 최대 20개 유지
      setUnreadCount(prev => prev + 1);
      
      // 토스트 알림
      showToastNotification(notification);
      
      // 브라우저 알림 (권한이 있는 경우)
      if (Notification.permission === 'granted') {
        showBrowserNotification(notification);
      }
    });

    // 연결 오류
    socket.on('error', () => {
      // Socket error occurred
    });

    // 재연결
    socket.on('reconnect', () => {
      // Reconnected after attempts
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 토스트 알림 표시
  const showToastNotification = (notification: Notification) => {
    const { type, title, message } = notification;
    
    switch (type) {
      case 'urgent_feedback':
        toast.error(`긴급: ${title}\\n${message}`, { duration: 10000 });
        break;
      case 'new_feedback':
        toast.success(`새 피드백: ${title}`, { duration: 5000 });
        break;
      case 'new_registration':
        toast.success(`새 사용자: ${title}`, { duration: 5000 });
        break;
      default:
        toast(title, { duration: 5000 });
    }
  };

  // 브라우저 알림 표시
  const showBrowserNotification = (notification: Notification) => {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id
    });
  };

  // 알림 읽음 처리
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // 알림 아이콘 가져오기
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_feedback':
        return <MessageSquare className="w-4 h-4" />;
      case 'urgent_feedback':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'new_registration':
        return <Users className="w-4 h-4" />;
      case 'feedback_update':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 알림 벨 아이콘 */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">알림</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  모두 읽음
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                새로운 알림이 없습니다
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    // TODO: Navigate to relevant page based on notification type
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button className="w-full text-sm text-center text-blue-600 hover:text-blue-800">
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};