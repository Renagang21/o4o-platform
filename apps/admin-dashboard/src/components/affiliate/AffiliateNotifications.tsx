import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'commission';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

interface AffiliateNotificationsProps {
  referralCode: string;
  onNotificationClick?: (notification: Notification) => void;
}

export const AffiliateNotifications = ({ 
  onNotificationClick 
}: AffiliateNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRead, setShowRead] = useState(false);

  // Generate mock notifications
  useEffect(() => {
    if (!isEnabled) return;

    const notificationTypes = [
      {
        type: 'success' as const,
        titles: ['새로운 가입!', '구매 완료!', '목표 달성!'],
        messages: [
          '추천 링크를 통해 새 회원이 가입했습니다',
          '추천 고객이 구매를 완료했습니다',
          '이번 달 추천 목표를 달성했습니다'
        ]
      },
      {
        type: 'commission' as const,
        titles: ['수수료 발생', '수수료 지급', '보너스 적립'],
        messages: [
          '새로운 수수료가 발생했습니다',
          '수수료가 지급되었습니다',
          '보너스 수수료가 적립되었습니다'
        ]
      },
      {
        type: 'info' as const,
        titles: ['링크 클릭', '프로모션 시작', '업데이트'],
        messages: [
          '추천 링크가 클릭되었습니다',
          '새로운 프로모션이 시작되었습니다',
          '제휴 프로그램이 업데이트되었습니다'
        ]
      },
      {
        type: 'warning' as const,
        titles: ['주의 필요', '기간 만료 임박', '확인 필요'],
        messages: [
          '추천 링크 유효성을 확인해주세요',
          '프로모션 기간이 곧 만료됩니다',
          '계정 정보 업데이트가 필요합니다'
        ]
      }
    ];

    const interval = setInterval(() => {
      const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const titleIndex = Math.floor(Math.random() * randomType.titles.length);
      
      const newNotification: Notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: randomType.type,
        title: randomType.titles[titleIndex],
        message: randomType.messages[titleIndex],
        timestamp: new Date(),
        read: false,
        data: randomType.type === 'commission' ? {
          amount: Math.floor(Math.random() * 50000) + 5000,
          orderId: `order_${Math.random().toString(36).substr(2, 6)}`
        } : randomType.type === 'success' && randomType.titles[titleIndex].includes('구매') ? {
          amount: Math.floor(Math.random() * 200000) + 30000,
          commission: Math.floor(Math.random() * 10000) + 1500
        } : undefined
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]); // Keep last 20

      // Show toast notification
      if (soundEnabled) {
        // In a real app, you would play a sound here
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/favicon.ico'
        });
      }

    }, Math.random() * 20000 + 10000); // Random interval 10-30 seconds

    return () => clearInterval(interval);
  }, [isEnabled, soundEnabled]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'commission':
        return <DollarSign className="w-5 h-5 text-purple-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'commission':
        return 'bg-purple-50 border-purple-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    toast.success('모든 알림을 읽음으로 표시했습니다');
  };

  const clearNotifications = () => {
    setNotifications([]);
    toast.success('알림이 모두 삭제되었습니다');
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onNotificationClick?.(notification);
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return timestamp.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = showRead 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-modern-primary" />
            알림센터
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              모두 읽음
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              모두 삭제
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="notifications-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
              <Label htmlFor="notifications-enabled">실시간 알림</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="sound-enabled"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
              <Label htmlFor="sound-enabled">소리 알림</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="show-read"
                checked={showRead}
                onCheckedChange={setShowRead}
              />
              <Label htmlFor="show-read">읽은 알림 표시</Label>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{showRead ? '알림이 없습니다' : '읽지 않은 알림이 없습니다'}</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  getNotificationBgColor(notification.type)
                } ${notification.read ? 'opacity-60' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      {notification.data && (
                        <div className="text-xs text-gray-500 space-y-1">
                          {notification.data.amount && (
                            <p>금액: ₩{notification.data.amount.toLocaleString()}</p>
                          )}
                          {notification.data.commission && (
                            <p>수수료: ₩{notification.data.commission.toLocaleString()}</p>
                          )}
                          {notification.data.orderId && (
                            <p>주문번호: {notification.data.orderId}</p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};