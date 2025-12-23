/**
 * Insight Card Component
 *
 * CGM 인사이트 카드
 */

import React from 'react';
import type { CGMInsight } from '../../backend/dto/index.js';

interface InsightCardProps {
  insight: CGMInsight;
}

const categoryConfig = {
  pattern: { label: '패턴', icon: '📊', color: 'bg-blue-100 text-blue-700' },
  risk: { label: '위험', icon: '⚠️', color: 'bg-red-100 text-red-700' },
  improvement: { label: '개선', icon: '✅', color: 'bg-green-100 text-green-700' },
  lifestyle: { label: '생활', icon: '🏃', color: 'bg-purple-100 text-purple-700' },
  general: { label: '일반', icon: '💡', color: 'bg-gray-100 text-gray-700' },
};

const priorityConfig = {
  high: { border: 'border-l-red-500', bg: 'bg-red-50' },
  medium: { border: 'border-l-yellow-500', bg: 'bg-yellow-50' },
  low: { border: 'border-l-blue-500', bg: 'bg-blue-50' },
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const category = categoryConfig[insight.category];
  const priority = priorityConfig[insight.priority];

  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${priority.border} ${priority.bg} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${category.color}`}>
            {category.icon} {category.label}
          </span>
        </div>
      </div>

      <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>

      {insight.actionSuggestion && (
        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">권장 조치</div>
          <p className="text-sm text-gray-800">{insight.actionSuggestion}</p>
        </div>
      )}

      {insight.relatedTimeRange && (
        <div className="mt-2 text-xs text-gray-500">
          관련 시간대: {insight.relatedTimeRange.from} ~ {insight.relatedTimeRange.to}
        </div>
      )}
    </div>
  );
};

export default InsightCard;
