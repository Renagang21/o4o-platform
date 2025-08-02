import { FC, MouseEvent } from 'react';
import { ServiceStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface ServiceStatusCardProps {
  service: ServiceStatus;
  onRefresh?: (serviceName: string) => void;
}

export const ServiceStatusCard: FC<ServiceStatusCardProps> = ({ 
  service, 
  onRefresh 
}) => {
  const handleVisit = () => {
    if (service.url) {
      window.open(service.url, '_blank');
    }
  };

  const handleRefresh = (e: MouseEvent) => {
    e.stopPropagation();
    if (onRefresh) {
      onRefresh(service.name);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-medium">{service.displayName}</h3>
          <p className="text-gray-400 text-sm font-mono">{service.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={service.status} size="sm" />
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-white p-1 rounded"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">응답 시간:</span>
          <span className="text-white font-mono">
            {service.responseTime ? `${service.responseTime}ms` : '-'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-400">마지막 확인:</span>
          <span className="text-white">{service.lastChecked}</span>
        </div>

        {service.description && (
          <div className="pt-2 border-t border-gray-700">
            <p className="text-gray-300 text-xs">{service.description}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleVisit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          disabled={!service.url}
        >
          방문하기
        </button>
        {service.url && service.url.includes('localhost') && (
          <span className="flex items-center text-xs text-yellow-400 px-2">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            로컬
          </span>
        )}
      </div>
    </div>
  );
};