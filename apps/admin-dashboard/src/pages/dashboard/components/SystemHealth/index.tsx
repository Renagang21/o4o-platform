/**
 * System Status Widget (MVP)
 * 시스템 상태 위젯 - 시스템 전반적인 상태 모니터링
 */

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Server, 
  Database, 
  HardDrive, 
  Cpu as MemoryIcon, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  SystemHealthResponse, 
  DASHBOARD_API_ENDPOINTS,
  DashboardApiUtils
} from '../../../../types/dashboard-api';
import apiClient from '../../../../api/base';

interface SystemStatusProps {
  className?: string;
}

const SystemStatus = memo<SystemStatusProps>(({ className = '' }) => {
  const [expandedDetails, setExpandedDetails] = useState(false);

  // 시스템 상태 데이터 조회
  const { 
    data: healthData, 
    isLoading, 
    error,
    refetch
  } = useQuery<SystemHealthResponse>({
    queryKey: ['dashboard', 'system-health'],
    queryFn: async () => {
      const response = await apiClient.get(DASHBOARD_API_ENDPOINTS.SYSTEM_HEALTH);
      return response.data;
    },
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
  });

  const getStatusConfig = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: '정상'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: '주의'
        };
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: '오류'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: '확인 중'
        };
    }
  };

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)}GB`;
  };

  const formatPercentage = (used: number, total: number) => {
    return ((used / total) * 100).toFixed(1);
  };

  const getOverallStatus = () => {
    if (!healthData?.data) return 'error';
    
    const status = healthData.data.overallStatus;
    
    if (status === 'critical') return 'error';
    if (status === 'warning') return 'warning';
    if (status === 'maintenance') return 'warning';
    return 'healthy';
  };

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-600" />
            시스템 상태
          </h2>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">시스템 상태 로드 실패</h3>
              <p className="text-sm text-gray-600 mb-4">시스템 상태를 불러오는 중 오류가 발생했습니다.</p>
              <button 
                onClick={() => refetch()} 
                className="wp-button wp-button-primary wp-button-sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-28 animate-pulse"></div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i: any) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const overallConfig = getStatusConfig(overallStatus);

  const health = healthData?.data;
  const systemComponents = [
    {
      key: 'api',
      name: 'API 서버',
      icon: <Server className="w-4 h-4" />,
      data: health?.services.api,
      details: health?.services.api ? `응답시간: ${health.services.api.responseTime}ms` : ''
    },
    {
      key: 'database',
      name: '데이터베이스',
      icon: <Database className="w-4 h-4" />,
      data: health?.services.database,
      details: health?.services.database ? `업타임: ${health.services.database.uptime}%` : ''
    },
    {
      key: 'storage',
      name: '스토리지',
      icon: <HardDrive className="w-4 h-4" />,
      data: health?.services.storage,
      details: health?.metrics ? 
        `${formatBytes(health.metrics.disk.used)} / ${formatBytes(health.metrics.disk.total)} (${formatPercentage(health.metrics.disk.used, health.metrics.disk.total)}%)` : ''
    },
    {
      key: 'memory',
      name: '메모리',
      icon: <MemoryIcon className="w-4 h-4" />,
      data: health?.services.cache,
      details: health?.metrics ? 
        `${formatBytes(health.metrics.memory.used / 1024)} / ${formatBytes(health.metrics.memory.total / 1024)} (${health.metrics.memory.usage.toFixed(1)}%)` : ''
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          시스템 상태
        </h2>
        <div className="flex items-center space-x-3">
          {/* 전체 상태 표시 */}
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium flex items-center
            ${overallConfig.bgColor} ${overallConfig.color}
          `}>
            {overallConfig.icon}
            <span className="ml-1">{overallConfig.label}</span>
          </div>
          
          {/* 새로고침 버튼 */}
          <button
            onClick={() => refetch()}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="상태 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 시스템 컴포넌트 상태 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">시스템 컴포넌트</h3>
            <button
              onClick={() => setExpandedDetails(!expandedDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {expandedDetails ? '간단히' : '자세히'}
            </button>
          </div>
          
          <div className="space-y-3">
            {systemComponents.map((component: any) => {
              const data = component.data;
              // Handle different status types from ServiceHealth interface
              let status: 'healthy' | 'warning' | 'error' = 'error';
              if (data) {
                if (data.status === 'healthy') status = 'healthy';
                else if (data.status === 'warning' || data.status === 'maintenance') status = 'warning';
                else status = 'error';
              }
              const config = getStatusConfig(status);
              
              return (
                <div key={component.key} className="space-y-2">
                  {/* Main Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center mr-3
                        ${config.bgColor}
                      `}>
                        <div className={config.color}>
                          {component.icon}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {component.name}
                        </p>
                        {expandedDetails && component.details && (
                          <p className="text-xs text-gray-500">
                            {component.details}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className={`
                        px-2 py-1 text-xs rounded-full font-medium
                        ${config.bgColor} ${config.color}
                      `}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Progress Bars */}
                  {expandedDetails && component.key === 'storage' && health?.metrics && (
                    <div className="ml-11 space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>디스크 사용량</span>
                          <span>{health.metrics.disk.usage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              health.metrics.disk.usage > 80 ? 'bg-red-500' :
                              health.metrics.disk.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(health.metrics.disk.usage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {expandedDetails && component.key === 'memory' && health?.metrics && (
                    <div className="ml-11 space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>메모리 사용량</span>
                          <span>{health.metrics.memory.usage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              health.metrics.memory.usage > 80 ? 'bg-red-500' :
                              health.metrics.memory.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(health.metrics.memory.usage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* System Performance Summary */}
          {expandedDetails && health && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
                    <p className="text-xs text-gray-500">API 응답</p>
                  </div>
                  <p className={`text-lg font-bold ${
                    health.performance.averageResponseTime < 200 ? 'text-green-600' :
                    health.performance.averageResponseTime < 500 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {health.performance.averageResponseTime}ms
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Database className="w-4 h-4 text-purple-600 mr-1" />
                    <p className="text-xs text-gray-500">활성 연결</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {health.performance.activeConnections}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Check Time */}
          <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>
              마지막 확인: {health?.monitoring.lastHealthCheck ? 
                DashboardApiUtils.getRelativeTime(health.monitoring.lastHealthCheck) : 
                '확인 중...'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Health Alerts */}
      {overallStatus !== 'healthy' && (
        <div className={`
          p-4 rounded-lg border
          ${overallConfig.bgColor} ${overallConfig.borderColor || 'border-gray-200'}
        `}>
          <div className={`flex items-center ${overallConfig.color}`}>
            {overallConfig.icon}
            <span className="text-sm font-medium ml-2">
              {overallStatus === 'warning' ? 
                '시스템 성능에 주의가 필요합니다' : 
                '시스템에 문제가 발생했습니다'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

SystemStatus.displayName = 'SystemStatus';

export default SystemStatus;