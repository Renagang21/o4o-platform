/**
 * Alert Item Component
 *
 * 위험 알림 항목
 */

import React from 'react';
import type { RiskFlag } from '../../backend/dto/index.js';

interface AlertItemProps {
  alert: RiskFlag;
  onAcknowledge?: () => void;
}

const typeConfig = {
  hypoglycemia: { label: '저혈당', icon: '⬇️', color: 'text-red-600' },
  hyperglycemia: { label: '고혈당', icon: '⬆️', color: 'text-orange-600' },
  high_variability: { label: '높은 변동성', icon: '↕️', color: 'text-yellow-600' },
  low_tir: { label: '낮은 TIR', icon: '📉', color: 'text-blue-600' },
  data_gap: { label: '데이터 끊김', icon: '⚡', color: 'text-gray-600' },
  coaching_overdue: { label: '상담 지연', icon: '📅', color: 'text-purple-600' },
};

const severityConfig = {
  high: { bg: 'bg-red-50', border: 'border-red-200' },
  medium: { bg: 'bg-yellow-50', border: 'border-yellow-200' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200' },
  normal: { bg: 'bg-gray-50', border: 'border-gray-200' },
};

export const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge }) => {
  const type = typeConfig[alert.type];
  const severity = severityConfig[alert.severity];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`rounded-lg border ${severity.border} ${severity.bg} p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${type.color}`}>
              {type.icon} {type.label}
            </span>
            {!alert.isAcknowledged && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">
                미확인
              </span>
            )}
          </div>
          <h4 className="font-medium text-gray-900">{alert.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
          <div className="text-xs text-gray-500 mt-2">
            감지: {formatTime(alert.detectedAt)}
            {alert.acknowledgedAt && (
              <span className="ml-2">· 확인: {formatTime(alert.acknowledgedAt)}</span>
            )}
          </div>
        </div>

        {!alert.isAcknowledged && onAcknowledge && (
          <button
            onClick={onAcknowledge}
            className="ml-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertItem;
