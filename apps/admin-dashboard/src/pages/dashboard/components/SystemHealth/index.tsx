/**
 * System Health Component
 * 시스템 상태 모니터링
 */

import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  HardDrive, 
  HardDrive as MemoryIcon, 
  Wifi, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

interface SystemHealthData {
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    lastCheck: string;
  };
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    lastCheck: string;
  };
  storage: {
    status: 'healthy' | 'warning' | 'error';
    usage: number;
    total: number;
  };
  memory: {
    status: 'healthy' | 'warning' | 'error';
    usage: number;
    total: number;
  };
}

interface SystemHealthProps {
  health?: SystemHealthData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const SystemHealth: React.FC<SystemHealthProps> = ({ 
  health, 
  isLoading = false,
  onRefresh
}) => {
  const [expandedDetails, setExpandedDetails] = useState(false);

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
    if (!health) return 'error';
    
    const statuses = [health.api.status, health.database.status, health.storage.status, health.memory.status];
    
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  };

  if (isLoading) {
    return (
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="h-6 bg-gray-200 rounded w-28 animate-pulse"></div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const overallConfig = getStatusConfig(overallStatus);

  const systemComponents = [
    {
      key: 'api',
      name: 'API 서버',
      icon: <Server className="w-4 h-4" />,
      data: health?.api,
      details: health?.api ? `응답시간: ${health.api.responseTime}ms` : ''
    },
    {
      key: 'database',
      name: '데이터베이스',
      icon: <Database className="w-4 h-4" />,
      data: health?.database,
      details: health?.database ? `연결수: ${health.database.connections}개` : ''
    },
    {
      key: 'storage',
      name: '스토리지',
      icon: <HardDrive className="w-4 h-4" />,
      data: health?.storage,
      details: health?.storage ? 
        `${formatBytes(health.storage.usage)} / ${formatBytes(health.storage.total)} (${formatPercentage(health.storage.usage, health.storage.total)}%)` : ''
    },
    {
      key: 'memory',
      name: '메모리',
      icon: <MemoryIcon className="w-4 h-4" />,
      data: health?.memory,
      details: health?.memory ? 
        `${formatBytes(health.memory.usage)} / ${formatBytes(health.memory.total)} (${formatPercentage(health.memory.usage, health.memory.total)}%)` : ''
    }
  ];

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wifi className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="wp-card-title">시스템 상태</h3>
            
            {/* Overall Status Indicator */}
            <div className={`
              ml-3 px-2 py-1 rounded-full text-xs font-medium
              ${overallConfig.bgColor} ${overallConfig.color}
            `}>
              <div className="flex items-center">
                {overallConfig.icon}
                <span className="ml-1">{overallConfig.label}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpandedDetails(!expandedDetails)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {expandedDetails ? '간단히' : '자세히'}
            </button>
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="상태 새로고침"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="wp-card-body">
        <div className="space-y-3">
          {systemComponents.map(component => {
            const data = component.data;
            const config = data ? getStatusConfig(data.status) : getStatusConfig('error');
            
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
                {expandedDetails && (component.key === 'storage' || component.key === 'memory') && data && 'usage' in data && 'total' in data && (
                  <div className="ml-11 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>사용량</span>
                        <span>{formatPercentage(data.usage, data.total)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            data.usage / data.total > 0.8 ? 'bg-red-500' :
                            data.usage / data.total > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((data.usage / data.total) * 100, 100)}%` }}
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
                  health.api.responseTime < 200 ? 'text-green-600' :
                  health.api.responseTime < 500 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {health.api.responseTime}ms
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Database className="w-4 h-4 text-purple-600 mr-1" />
                  <p className="text-xs text-gray-500">DB 연결</p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {health.database.connections}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Check Time */}
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          <span>
            마지막 확인: {health?.api.lastCheck ? 
              new Date(health.api.lastCheck).toLocaleTimeString('ko-KR') : 
              '확인 중...'
            }
          </span>
        </div>

        {/* Health Alerts */}
        {overallStatus !== 'healthy' && (
          <div className={`
            mt-4 p-3 rounded-lg border
            ${overallConfig.bgColor} ${overallConfig.borderColor}
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
    </div>
  );
};

export default SystemHealth;