import React, { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle, Heart, AtSign, UserPlus, AlertCircle, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'comment' | 'like' | 'mention' | 'follow' | 'report_resolved';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    postId?: string;
    postTitle?: string;
    commentId?: string;
  };
}

interface NotificationBellProps {
  userId: string;
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Set up polling for new notifications
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        bellRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/forum/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Mock data for development
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'comment',
          title: 'New comment on your post',
          message: 'John Doe commented on "Best practices for React development"',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          actor: { id: '1', name: 'John Doe' },
          metadata: { postId: 'post-1', postTitle: 'Best practices for React development' }
        },
        {
          id: '2',
          type: 'like',
          title: 'Your post was liked',
          message: 'Jane Smith liked your post "Introduction to TypeScript"',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          actor: { id: '2', name: 'Jane Smith' },
          metadata: { postId: 'post-2', postTitle: 'Introduction to TypeScript' }
        },
        {
          id: '3',
          type: 'mention',
          title: 'You were mentioned',
          message: 'Bob mentioned you in a comment',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          actor: { id: '3', name: 'Bob' },
          metadata: { commentId: 'comment-1' }
        }
      ];

      setNotifications(data.notifications || mockNotifications);
      setUnreadCount(data.unreadCount || mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      // Use mock data on error
      setUnreadCount(2);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/forum/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Update local state anyway
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/forum/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      // Update local state anyway
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/forum/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      // Update local state anyway
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageCircle className="w-4 h-4" />;
      case 'like': return <Heart className="w-4 h-4 fill-current" />;
      case 'mention': return <AtSign className="w-4 h-4" />;
      case 'follow': return <UserPlus className="w-4 h-4" />;
      case 'report_resolved': return <AlertCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'comment': return 'text-blue-600 bg-blue-100';
      case 'like': return 'text-red-600 bg-red-100';
      case 'mention': return 'text-purple-600 bg-purple-100';
      case 'follow': return 'text-green-600 bg-green-100';
      case 'report_resolved': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200
                      ${!notification.read ? 'bg-blue-50' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Delete notification"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <a
                href="/forum/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;