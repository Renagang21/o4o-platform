import { useState, useEffect, useRef } from 'react';
import { Activity, Clock, Users, ShoppingCart, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trackReferralClick, trackReferralConversion } from '@/api/partner';
import toast from 'react-hot-toast';

interface ActivityEvent {
  id: string;
  type: 'click' | 'signup' | 'purchase' | 'conversion';
  timestamp: Date;
  source?: string;
  amount?: number;
  commission?: number;
  userId?: string;
  productId?: string;
  landingPage?: string;
  userAgent?: string;
  referer?: string;
}

interface RealTimeActivityProps {
  referralCode: string;
  maxEvents?: number;
}

export const RealTimeActivity = ({ 
  referralCode, 
  maxEvents = 10 
}: RealTimeActivityProps) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Mock real-time events for demonstration
  useEffect(() => {
    if (!isTracking) return;

    // Simulate real-time events
    const interval = setInterval(() => {
      const eventTypes = ['click', 'signup', 'purchase'] as const;
      const sources = ['카카오톡', '페이스북', '인스타그램', '블로그', '직접링크'];
      const products = ['프리미엄 플랜', '베이직 플랜', '엔터프라이즈 플랜'];
      
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      const newEvent: ActivityEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: new Date(),
        source,
        ...(type === 'purchase' && {
          amount: Math.floor(Math.random() * 200000) + 50000,
          commission: Math.floor(Math.random() * 10000) + 2500,
          productId: products[Math.floor(Math.random() * products.length)]
        }),
        ...(type === 'signup' && {
          userId: `user_${Math.random().toString(36).substr(2, 6)}`
        }),
        landingPage: '/products',
        userAgent: navigator.userAgent,
        referer: window.location.origin
      };

      setEvents(prev => [newEvent, ...prev.slice(0, maxEvents - 1)]);

      // Track the event via API if it's a real interaction
      if (Math.random() > 0.7) { // 30% chance to actually call API for demo
        trackEvent(newEvent);
      }
    }, Math.random() * 10000 + 5000); // Random interval between 5-15 seconds

    return () => clearInterval(interval);
  }, [isTracking, maxEvents, referralCode]);

  const trackEvent = async (event: ActivityEvent) => {
    try {
      if (event.type === 'click') {
        await trackReferralClick({
          referralCode,
          source: event.source,
          productId: event.productId,
          landingPage: event.landingPage,
          userAgent: event.userAgent,
          referer: event.referer
        });
      } else if (event.type === 'signup' || event.type === 'purchase') {
        if (event.userId) {
          await trackReferralConversion({
            userId: event.userId,
            referralCode,
            conversionType: event.type === 'signup' ? 'signup' : 'purchase'
          });
        }
      }
    } catch (error) {
      // Silently fail tracking - could be logged to monitoring service in production
      // TODO: Implement proper error logging service
    }
  };

  const connectWebSocket = () => {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // const ws = new WebSocket(`ws://localhost:3001/partner/realtime/${referralCode}`);
      
      // Mock WebSocket connection for demo
      const mockWs = {
        onopen: () => setIsConnected(true),
        onclose: () => setIsConnected(false),
        onerror: () => setIsConnected(false),
        close: () => setIsConnected(false)
      };
      
      wsRef.current = mockWs as any;
      setIsConnected(true);

      // Simulate connection handling
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen();
      }, 1000);

    } catch (error) {
      // WebSocket connection failed - silently retry
      // TODO: Implement proper error logging service
      setIsConnected(false);
      
      // Retry connection after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  };

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      disconnectWebSocket();
      toast.success('실시간 추적이 비활성화되었습니다');
    } else {
      setIsTracking(true);
      connectWebSocket();
      toast.success('실시간 추적이 활성화되었습니다');
    }
  };

  const clearEvents = () => {
    setEvents([]);
    toast.success('활동 기록이 클리어되었습니다');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'click':
        return <ExternalLink className="w-4 h-4 text-blue-500" />;
      case 'signup':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'click':
        return 'border-l-blue-500';
      case 'signup':
        return 'border-l-green-500';
      case 'purchase':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getEventText = (event: ActivityEvent) => {
    switch (event.type) {
      case 'click':
        return `추천 링크 클릭 ${event.source ? `(${event.source})` : ''}`;
      case 'signup':
        return `새 회원 가입 ${event.source ? `via ${event.source}` : ''}`;
      case 'purchase':
        return `구매 완료 ${event.productId ? `- ${event.productId}` : ''}`;
      default:
        return '알 수 없는 활동';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}초 전`;
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return timestamp.toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (isTracking) {
      connectWebSocket();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-modern-primary" />
            실시간 추천 활동
            <Badge 
              variant={isConnected ? "default" : "secondary"} 
              className={`ml-2 ${isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  연결됨
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  연결 안됨
                </>
              )}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTracking}
              className={isTracking ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
            >
              {isTracking ? '추적 중지' : '추적 시작'}
            </Button>
            {events.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearEvents}
                className="text-gray-600 hover:text-gray-700"
              >
                클리어
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>실시간 활동을 기다리는 중...</p>
            <p className="text-sm">추천 링크를 공유하고 활동을 확인하세요</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-4 bg-gray-50/50 ${getEventColor(event.type)}`}
              >
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getEventText(event)}
                  </p>
                  {event.amount && (
                    <p className="text-sm text-gray-600 mt-1">
                      구매액: ₩{event.amount.toLocaleString()}
                      {event.commission && (
                        <span className="text-purple-600 font-medium ml-2">
                          • 수수료: ₩{event.commission.toLocaleString()}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};