/**
 * ActionsPage
 *
 * Action 목록 및 실행 페이지
 * Phase 2 핵심 UI
 *
 * @package @o4o/diabetes-pharmacy
 */

import React, { useState, useEffect } from 'react';
import type {
  ActionDto,
  ActionType,
  ActionListResponseDto,
} from '../../backend/dto/index.js';
import { ACTION_ICONS, ACTION_LABELS, ACTION_TARGET_MAP } from '../../backend/dto/index.js';

/**
 * Action Card Component
 */
interface ActionCardProps {
  action: ActionDto;
  onExecute: (actionId: string) => void;
  executing: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onExecute, executing }) => {
  const icons: Record<ActionType, string> = {
    'COACHING': '💬',
    'DISPLAY': '📊',
    'SURVEY': '📝',
    'COMMERCE': '🛒',
    'NONE': '⏸️',
  };

  const statusColors = {
    'available': 'border-green-200 bg-green-50',
    'pending': 'border-yellow-200 bg-yellow-50',
    'executed': 'border-gray-200 bg-gray-50',
    'unavailable': 'border-gray-200 bg-gray-100 opacity-60',
  };

  const isAvailable = action.status === 'available';
  const target = ACTION_TARGET_MAP[action.type];

  return (
    <div className={`rounded-lg border-2 p-4 ${statusColors[action.status]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icons[action.type]}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{action.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            {action.patternType && (
              <p className="text-xs text-gray-500 mt-2">
                패턴: {action.patternType}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isAvailable
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {action.status === 'available' ? '실행 가능' : '준비 중'}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-4 flex justify-end">
        {isAvailable && target ? (
          <button
            onClick={() => onExecute(action.id)}
            disabled={executing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {executing ? (
              <>
                <span className="animate-spin">⏳</span>
                처리 중...
              </>
            ) : (
              <>
                <span>▶️</span>
                {ACTION_LABELS[action.type]}
              </>
            )}
          </button>
        ) : (
          <span className="text-sm text-gray-500 italic">
            {action.type === 'NONE' ? '추가 조치 없음' : '준비 중인 기능입니다'}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Filter Chip Component
 */
interface FilterChipProps {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  icon,
  count,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <span>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
    <span
      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {count}
    </span>
  </button>
);

/**
 * ActionsPage Component
 */
export const ActionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ActionListResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActionType | 'ALL'>('ALL');
  const [executing, setExecuting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      // Phase 2: Mock 데이터 (실제 구현 시 API 호출)
      const mockActions: ActionListResponseDto = {
        items: [
          {
            id: 'action-pattern-1',
            type: 'COACHING',
            status: 'available',
            title: '코칭 세션 시작',
            description: '오후 3-5시 반복 저혈당 패턴이 감지되었습니다. 코칭 세션을 통해 개선 방안을 상담하세요.',
            patternId: 'pattern-1',
            patternType: 'recurring_hypo',
            targetApp: 'diabetes-core',
            targetPath: '/coaching/new',
            metadata: { userId: 'user-1', confidence: 'high', confidenceScore: 85 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'action-pattern-2',
            type: 'DISPLAY',
            status: 'available',
            title: '패턴 분석 결과 보기',
            description: '점심 후 혈당 스파이크 패턴에 대한 상세 분석 결과를 확인하세요.',
            patternId: 'pattern-2',
            patternType: 'post_meal_spike',
            targetApp: 'diabetes-pharmacy',
            targetPath: '/reports',
            metadata: { userId: 'user-1', confidence: 'medium', confidenceScore: 72 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'action-pattern-3',
            type: 'COACHING',
            status: 'available',
            title: '코칭 세션 시작',
            description: '새벽 현상이 감지되었습니다. 코칭 세션을 통해 개선 방안을 상담하세요.',
            patternId: 'pattern-3',
            patternType: 'dawn_phenomenon',
            targetApp: 'diabetes-core',
            targetPath: '/coaching/new',
            metadata: { userId: 'user-2', confidence: 'high', confidenceScore: 90 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'action-pattern-4',
            type: 'SURVEY',
            status: 'available',
            title: '생활 습관 설문',
            description: '생활 습관 설문을 통해 더 정확한 분석을 받아보세요.',
            patternId: 'pattern-4',
            patternType: 'weekend_pattern',
            targetApp: 'diabetes-pharmacy',
            targetPath: '/survey',
            metadata: { userId: 'user-3', confidence: 'medium', confidenceScore: 65 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 4,
        available: 4,
        byType: {
          'COACHING': 2,
          'DISPLAY': 1,
          'SURVEY': 1,
          'COMMERCE': 0,
          'NONE': 0,
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 500));
      setActions(mockActions);
    } catch (err) {
      setError('Action 목록 로딩 중 오류가 발생했습니다.');
      console.error('[ActionsPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (actionId: string) => {
    try {
      setExecuting(actionId);
      const action = actions?.items.find((a) => a.id === actionId);

      if (!action) {
        throw new Error('Action을 찾을 수 없습니다.');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const target = ACTION_TARGET_MAP[action.type];
      if (target) {
        setNotification({
          type: 'success',
          message: `${ACTION_LABELS[action.type]}(으)로 이동합니다.`,
        });

        // Phase 2: 실제 이동은 target 앱에서 처리
        // 여기서는 알림만 표시
        console.log(`[ActionsPage] Navigate to: ${target.app}${target.path}`);
      } else {
        setNotification({
          type: 'info',
          message: '준비 중인 기능입니다.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action 실행 중 오류가 발생했습니다.',
      });
    } finally {
      setExecuting(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const filteredActions =
    filter === 'ALL'
      ? actions?.items || []
      : actions?.items.filter((a) => a.type === filter) || [];

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">실행(Action)</h1>
          <p className="text-sm text-gray-500 mt-1">
            감지된 패턴에 대한 실행 가능한 Action 목록입니다.
          </p>
        </div>
        <button
          onClick={fetchActions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="전체"
          icon="📋"
          count={actions?.total || 0}
          active={filter === 'ALL'}
          onClick={() => setFilter('ALL')}
        />
        <FilterChip
          label="코칭"
          icon="💬"
          count={actions?.byType?.COACHING || 0}
          active={filter === 'COACHING'}
          onClick={() => setFilter('COACHING')}
        />
        <FilterChip
          label="정보"
          icon="📊"
          count={actions?.byType?.DISPLAY || 0}
          active={filter === 'DISPLAY'}
          onClick={() => setFilter('DISPLAY')}
        />
        <FilterChip
          label="설문"
          icon="📝"
          count={actions?.byType?.SURVEY || 0}
          active={filter === 'SURVEY'}
          onClick={() => setFilter('SURVEY')}
        />
        <FilterChip
          label="상품"
          icon="🛒"
          count={actions?.byType?.COMMERCE || 0}
          active={filter === 'COMMERCE'}
          onClick={() => setFilter('COMMERCE')}
        />
      </div>

      {/* Action Cards */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-gray-500">
              {filter === 'ALL'
                ? '현재 실행 가능한 Action이 없습니다.'
                : `${ACTION_LABELS[filter as ActionType]} 유형의 Action이 없습니다.`}
            </p>
          </div>
        ) : (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onExecute={handleExecute}
              executing={executing === action.id}
            />
          ))
        )}
      </div>

      {/* Summary */}
      {actions && actions.total > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          총 {actions.total}개의 Action 중 {actions.available}개 실행 가능
        </div>
      )}
    </div>
  );
};

export default ActionsPage;
