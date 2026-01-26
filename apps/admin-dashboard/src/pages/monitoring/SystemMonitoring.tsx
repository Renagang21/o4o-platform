import { useState, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Server,
  Zap,
  AlertCircle
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  count: number;
  errorRate: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connected: boolean;
    responseTime: number;
    activeConnections: number;
  };
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn';
  message: string;
  code?: string;
  endpoint?: string;
  statusCode?: number;
}

const SystemMonitoring: FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 시스템 상태 조회
  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await authClient.api.get('/monitoring/health');
      return response.data;
    },
    refetchInterval: autoRefresh ? 10000 : false // 10초마다 갱신
  });

  // 성능 메트릭 조회
  const { data: performanceMetrics } = useQuery<PerformanceMetric[]>({
    queryKey: ['performance-metrics', timeRange],
    queryFn: async () => {
      const response = await authClient.api.get(`/monitoring/performance?range=${timeRange}`);
      return response.data;
    },
    refetchInterval: autoRefresh ? 30000 : false // 30초마다 갱신
  });

  // 에러 로그 조회
  const { data: errorLogs } = useQuery<ErrorLog[]>({
    queryKey: ['error-logs'],
    queryFn: async () => {
      const response = await authClient.api.get('/monitoring/errors?limit=50');
      return response.data;
    },
    refetchInterval: autoRefresh ? 60000 : false // 1분마다 갱신
  });


  // 시스템 상태 색상 결정
  const getHealthColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">시스템 모니터링</h1>
          <p className="text-sm text-gray-500 mt-1">실시간 시스템 성능 및 상태 모니터링</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 자동 새로고침 토글 */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoRefresh(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoRefresh ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="ml-2 text-sm text-gray-600">자동 새로고침</span>
          </label>

          {/* 시간 범위 선택 */}
          <select
            value={timeRange}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">1시간</option>
            <option value="24h">24시간</option>
            <option value="7d">7일</option>
          </select>
        </div>
      </div>

      {/* 시스템 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 전체 상태 */}
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">시스템 상태</p>
                <p className={`text-2xl font-bold mt-1 ${getHealthColor(systemHealth?.status)}`}>
                  {systemHealth?.status === 'healthy' ? '정상' : 
                   systemHealth?.status === 'warning' ? '주의' : '위험'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                systemHealth?.status === 'healthy' ? 'bg-green-100' :
                systemHealth?.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {systemHealth?.status === 'healthy' ? 
                  <CheckCircle className="h-6 w-6 text-green-600" /> :
                  systemHealth?.status === 'warning' ? 
                  <AlertCircle className="h-6 w-6 text-yellow-600" /> :
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                }
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              가동 시간: {Math.floor((systemHealth?.uptime || 0) / 3600)}시간
            </div>
          </div>
        </div>

        {/* CPU 사용률 */}
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU 사용률</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">
                  {systemHealth?.cpu.usage || 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (systemHealth?.cpu.usage || 0) < 70 ? 'bg-green-500' :
                    (systemHealth?.cpu.usage || 0) < 85 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${systemHealth?.cpu.usage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 메모리 사용률 */}
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">메모리 사용률</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">
                  {systemHealth?.memoryUsage.percentage || 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <Server className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {systemHealth?.memoryUsage.used || 0}MB / {systemHealth?.memoryUsage.total || 0}MB
            </div>
          </div>
        </div>

        {/* 데이터베이스 상태 */}
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">데이터베이스</p>
                <p className={`text-2xl font-bold mt-1 ${
                  systemHealth?.database.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {systemHealth?.database.connected ? '연결됨' : '연결 끊김'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                systemHealth?.database.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Database className={`h-6 w-6 ${
                  systemHealth?.database.connected ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              응답시간: {systemHealth?.database.responseTime || 0}ms
            </div>
          </div>
        </div>
      </div>

      {/* 성능 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API 응답 시간 테이블 */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h3 className="text-lg font-medium text-gray-900">API 응답 시간</h3>
          </div>
          <div className="o4o-card-body">
            {performanceMetrics && performanceMetrics.length > 0 ? (
              <div className="space-y-4">
                {performanceMetrics?.slice(0, 10).map((metric: PerformanceMetric) => (
                  <div key={metric.endpoint} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {metric.endpoint.replace('/api/v1/', '')}
                      </p>
                      <p className="text-xs text-gray-500">{metric.count} 요청</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {metric.avgResponseTime.toFixed(0)}ms
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 에러율 통계 */}
        <div className="o4o-card">
          <div className="o4o-card-header">
            <h3 className="text-lg font-medium text-gray-900">API 에러율</h3>
          </div>
          <div className="o4o-card-body">
            <div className="space-y-4">
              {performanceMetrics?.slice(0, 5).map((metric: PerformanceMetric) => (
                <div key={metric.endpoint} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{metric.endpoint}</p>
                    <p className="text-xs text-gray-500">{metric.count} 요청</p>
                  </div>
                  <div className={`text-sm font-medium ${
                    metric.errorRate < 1 ? 'text-green-600' :
                    metric.errorRate < 5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metric.errorRate.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 최근 에러 로그 */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <h3 className="text-lg font-medium text-gray-900">최근 에러 로그</h3>
        </div>
        <div className="o4o-card-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    레벨
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    메시지
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    엔드포인트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태 코드
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {errorLogs?.map((log: ErrorLog) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.level === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.endpoint || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.statusCode || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;