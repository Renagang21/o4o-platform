import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthProvider';

interface SecurityMetrics {
  activeSessions: number;
  failedLogins: number;
  permissionDenied: number;
  suspiciousActivity: number;
  lastActivity: string;
  sessionTrend: 'up' | 'down' | 'stable';
  deniedDetails: Array<{
    timestamp: string;
    action: string;
    user: string;
  }>;
}

interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

/**
 * 보안 모니터링 훅
 * 관리자 대시보드에서 보안 현황 모니터링
 */
export const useSecurityMonitor = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    activeSessions: 0,
    failedLogins: 0,
    permissionDenied: 0,
    suspiciousActivity: 0,
    lastActivity: new Date().toISOString(),
    sessionTrend: 'stable',
    deniedDetails: []
  });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 보안 메트릭 조회
  const fetchSecurityMetrics = useCallback(async () => {
    if (!isAuthenticated || !isAdmin()) {
      return;
    }

    setIsLoading(true);
    try {
      // 실제 환경에서는 API 호출
      // const response = await api.get('/admin/security/metrics');
      
      // 모의 데이터
      const mockMetrics: SecurityMetrics = {
        activeSessions: Math.floor(Math.random() * 10) + 1,
        failedLogins: Math.floor(Math.random() * 5),
        permissionDenied: Math.floor(Math.random() * 3),
        suspiciousActivity: Math.floor(Math.random() * 2),
        lastActivity: new Date().toISOString(),
        sessionTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
        deniedDetails: [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'admin_access_denied',
            user: 'user@example.com'
          }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  // 보안 알림 조회
  const fetchSecurityAlerts = useCallback(async () => {
    if (!isAuthenticated || !isAdmin()) {
      return;
    }

    try {
      // 실제 환경에서는 API 호출
      // const response = await api.get('/admin/security/alerts');
      
      // 모의 데이터
      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: '의심스러운 로그인 시도',
          message: '비정상적인 IP에서 관리자 계정 로그인 시도가 감지되었습니다.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          resolved: false
        },
        {
          id: '2',
          type: 'info',
          title: '세션 만료 임박',
          message: '3개의 관리자 세션이 5분 내에 만료됩니다.',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          resolved: false
        }
      ];

      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
    }
  }, [isAuthenticated, isAdmin]);

  // 알림 해결 처리
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      // 실제 환경에서는 API 호출
      // await api.patch(`/admin/security/alerts/${alertId}/resolve`);
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }, []);

  // 보안 조치 실행
  const executeSecurityAction = useCallback(async (action: string, params: any = {}) => {
    if (!isAdmin()) {
      throw new Error('관리자 권한이 필요합니다.');
    }

    try {
      switch (action) {
        case 'lock_user':
          // await api.post(`/admin/users/${params.userId}/lock`);
          console.log('User locked:', params.userId);
          break;
          
        case 'terminate_sessions':
          // await api.post(`/admin/security/terminate-sessions`, params);
          console.log('Sessions terminated for user:', params.userId);
          break;
          
        case 'ban_ip':
          // await api.post('/admin/security/ban-ip', { ip: params.ip });
          console.log('IP banned:', params.ip);
          break;
          
        default:
          throw new Error(`Unknown security action: ${action}`);
      }
      
      // 메트릭 새로고침
      await fetchSecurityMetrics();
    } catch (error) {
      console.error('Failed to execute security action:', error);
      throw error;
    }
  }, [isAdmin, fetchSecurityMetrics]);

  // 자동 새로고침 설정
  useEffect(() => {
    if (!isAuthenticated || !isAdmin()) {
      return;
    }

    fetchSecurityMetrics();
    fetchSecurityAlerts();

    // 1분마다 메트릭 새로고침
    const metricsInterval = setInterval(fetchSecurityMetrics, 60000);
    
    // 30초마다 알림 확인
    const alertsInterval = setInterval(fetchSecurityAlerts, 30000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(alertsInterval);
    };
  }, [isAuthenticated, isAdmin, fetchSecurityMetrics, fetchSecurityAlerts]);

  return {
    metrics,
    alerts,
    isLoading,
    refreshMetrics: fetchSecurityMetrics,
    refreshAlerts: fetchSecurityAlerts,
    resolveAlert,
    executeSecurityAction
  };
};

export default useSecurityMonitor;