/**
 * DashboardPage
 *
 * 혈당관리 약국 대시보드
 * 숫자 요약만 표시 (그래프 없음)
 *
 * @package @o4o/diabetes-pharmacy
 */

import React, { useState, useEffect } from 'react';
import type { DashboardSummaryDto, ActionType } from '../../backend/dto/index.js';
import { ACTION_ICONS, ACTION_LABELS } from '../../backend/dto/index.js';

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-4xl opacity-50">{icon}</span>
      </div>
    </div>
  );
};

/**
 * Action Type Badge
 */
interface ActionTypeBadgeProps {
  type: ActionType;
  count: number;
}

const ActionTypeBadge: React.FC<ActionTypeBadgeProps> = ({ type, count }) => {
  if (count === 0) return null;

  const icons: Record<ActionType, string> = {
    'COACHING': '💬',
    'DISPLAY': '📊',
    'SURVEY': '📝',
    'COMMERCE': '🛒',
    'NONE': '⏸️',
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
      <span>{icons[type]}</span>
      <span className="text-sm font-medium">{ACTION_LABELS[type]}</span>
      <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
};

/**
 * DashboardPage Component
 */
export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // Phase 2: Mock 데이터 (실제 구현 시 API 호출)
      const mockSummary: DashboardSummaryDto = {
        pharmacyId: 'mock-pharmacy-id',
        pharmacyName: '테스트 약국',
        totalPatients: 3,
        totalPatterns: 4,
        availableActions: 4,
        actionsByType: {
          'COACHING': 2,
          'DISPLAY': 1,
          'SURVEY': 1,
          'COMMERCE': 0,
          'NONE': 0,
        },
        lastUpdated: new Date().toISOString(),
      };

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSummary(mockSummary);
    } catch (err) {
      setError('대시보드 로딩 중 오류가 발생했습니다.');
      console.error('[DashboardPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">혈당관리 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">
            {summary.pharmacyName && `${summary.pharmacyName} | `}
            마지막 업데이트: {new Date(summary.lastUpdated).toLocaleString('ko-KR')}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="관리 대상자 수"
          value={summary.totalPatients}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="패턴 감지 수"
          value={summary.totalPatterns}
          icon="🔍"
          color="green"
        />
        <StatCard
          title="실행 가능 Action"
          value={summary.availableActions}
          icon="▶️"
          color="purple"
        />
      </div>

      {/* Action Types Summary */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Action 유형별 현황</h2>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(summary.actionsByType) as ActionType[]).map((type) => (
            <ActionTypeBadge
              key={type}
              type={type}
              count={summary.actionsByType[type]}
            />
          ))}
        </div>
        {summary.availableActions === 0 && (
          <p className="text-gray-500 mt-4">현재 실행 가능한 Action이 없습니다.</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 이동</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/diabetes-pharmacy/actions"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <span>▶️</span>
            Action 목록 보기
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
