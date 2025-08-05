import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@o4o/ui';
import { apiClient } from '@/utils/api';

interface DeviceInfo {
  userAgent: string;
  platform?: string;
  browser?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

interface Session {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  loginAt: Date;
  lastActivity?: Date;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  isCurrent: boolean;
}

interface SessionsResponse {
  success: boolean;
  data: {
    sessions: Session[];
    count: number;
  };
}

export const SessionManager = () => {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState<string | null>(null);

  // Fetch sessions
  const { data, isLoading, error } = useQuery<SessionsResponse>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/sessions/my-sessions');
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Logout from specific session
  const logoutSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post(`/v1/sessions/logout/${sessionId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowConfirmDialog(false);
      setSessionToRemove(null);
    }
  });

  // Logout from all devices
  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/v1/sessions/logout-all');
      return response.data;
    },
    onSuccess: () => {
      // Redirect to login after logging out from all devices
      window.location.href = '/auth/login';
    }
  });

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">세션 정보를 불러오는데 실패했습니다.</p>
        </div>
      </div>
    );
  }

  const sessions = data?.data?.sessions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">활성 세션</h3>
          <p className="mt-1 text-sm text-gray-500">
            현재 로그인되어 있는 모든 기기를 확인하고 관리할 수 있습니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          className="text-red-600 hover:text-red-700 hover:border-red-300"
        >
          모든 기기에서 로그아웃
        </Button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className={`p-4 border rounded-lg ${
              session.isCurrent 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getDeviceIcon(session.deviceInfo?.deviceType)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {session.deviceInfo?.browser || 'Unknown Browser'}
                      {session.deviceInfo?.platform && 
                        ` on ${session.deviceInfo.platform}`}
                    </span>
                    {session.isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        현재 세션
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      {session.ipAddress || 'Unknown IP'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    로그인: {formatDate(session.loginAt)}
                    {session.lastActivity && (
                      <span className="ml-2">
                        (마지막 활동: {getRelativeTime(session.lastActivity)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSessionToRemove(session.sessionId);
                    setShowConfirmDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            활성 세션이 없습니다.
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {sessionToRemove ? '세션 종료' : '모든 기기에서 로그아웃'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {sessionToRemove 
                ? '선택한 세션을 종료하시겠습니까? 해당 기기에서 다시 로그인해야 합니다.'
                : '모든 기기에서 로그아웃하시겠습니까? 현재 세션도 종료되며 다시 로그인해야 합니다.'}
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSessionToRemove(null);
                }}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (sessionToRemove) {
                    logoutSessionMutation.mutate(sessionToRemove);
                  } else {
                    logoutAllMutation.mutate();
                  }
                }}
                disabled={logoutSessionMutation.isPending || logoutAllMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {(logoutSessionMutation.isPending || logoutAllMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {sessionToRemove ? '세션 종료' : '모두 로그아웃'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};