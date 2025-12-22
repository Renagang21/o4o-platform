/**
 * Alerts Page
 *
 * 전체 알림 관리 화면
 */

import React, { useState } from 'react';
import { useAlerts } from '../hooks/useCGMData.js';
import { AlertItem } from '../components/AlertItem.js';
import type { RiskLevel } from '../../backend/dto/index.js';

interface AlertsPageProps {
  onPatientSelect?: (patientId: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onPatientSelect }) => {
  const { alerts, total, unacknowledgedCount, isLoading, acknowledgeAlert } = useAlerts();
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('unacknowledged');
  const [severityFilter, setSeverityFilter] = useState<RiskLevel | 'all'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unacknowledged' && alert.isAcknowledged) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">알림 관리</h1>
        <p className="text-gray-500 mt-1">환자 위험 알림을 확인하고 관리하세요.</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">전체 알림</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">미확인</div>
          <div className="text-2xl font-bold text-red-700">{unacknowledgedCount}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600">확인 완료</div>
          <div className="text-2xl font-bold text-green-700">{total - unacknowledgedCount}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unacknowledged')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'unacknowledged'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            미확인만
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              severityFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            모든 심각도
          </button>
          <button
            onClick={() => setSeverityFilter('high')}
            className={`px-3 py-1 rounded-full text-sm ${
              severityFilter === 'high'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            고위험
          </button>
          <button
            onClick={() => setSeverityFilter('medium')}
            className={`px-3 py-1 rounded-full text-sm ${
              severityFilter === 'medium'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            주의
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {filter === 'unacknowledged'
              ? '미확인 알림이 없습니다.'
              : '알림이 없습니다.'}
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={
                !alert.isAcknowledged
                  ? () => acknowledgeAlert(alert.id)
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
