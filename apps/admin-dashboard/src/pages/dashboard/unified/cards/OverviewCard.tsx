/**
 * Overview Card with AI Summary + Notification Integration
 * v1.1: 통합 알림 시스템 연계
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Bell, AlertTriangle, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import type { UnifiedCardProps } from '../types';
import { useNotifications } from '../useNotifications';

interface OverviewData {
  todayOrders: number;
  pendingTasks: number;
}

// 우선순위별 색상
const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const OverviewCard: React.FC<UnifiedCardProps> = ({ config, userContexts }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 알림 시스템 연계
  const { summary, aiContext, isLoading: isLoadingNotifications } = useNotifications({
    refreshInterval: 60000,
    maxNotifications: 20,
  });

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setIsLoading(true);
    try {
      // v1.2: WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1
      // TODO: 실제 API 구현 시 아래와 같이 호출
      // const response = await authClient.api.get('/api/v1/dashboard/overview');
      // setData(response.data);

      // 현재 기능 미구현 - 빈 데이터 반환
      setData({
        todayOrders: 0,
        pendingTasks: 0,
      });
    } catch (err) {
      console.error('Error loading overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAISummary = async () => {
    if (isLoadingAI || aiSummary) return;

    setIsLoadingAI(true);
    try {
      const response = await authClient.api.post('/api/ai/query', {
        question: '오늘의 대시보드 상태를 3줄로 요약해주세요.',
        contextType: 'service',
        contextData: {
          overview: data,
          userContexts,
          // AI 요약에 알림 컨텍스트 포함
          notifications: aiContext,
        },
      });

      if (response.data.success) {
        setAiSummary(response.data.answer);
      }
    } catch (err) {
      console.error('AI summary error:', err);
      // Fallback summary with notification context
      const criticalCount = summary?.byPriority?.critical || 0;
      const actionCount = aiContext?.actionRequired?.length || 0;

      setAiSummary(
        `오늘 ${data?.todayOrders || 0}건의 주문이 있습니다. ${data?.pendingTasks || 0}건의 처리 대기 작업이 있습니다.` +
        (criticalCount > 0 ? ` 중요 알림 ${criticalCount}건이 있습니다.` : '') +
        (actionCount > 0 ? ` ${actionCount}건의 처리가 필요한 알림이 있습니다.` : '')
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (isLoading || isLoadingNotifications) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const unreadCount = summary?.unreadCount || 0;
  const criticalCount = summary?.byPriority?.critical || 0;
  const highCount = summary?.byPriority?.high || 0;
  const actionRequiredCount = aiContext?.actionRequired?.length || 0;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{data?.todayOrders || 0}</p>
          <p className="text-sm text-gray-600">오늘 주문</p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-2xl font-bold text-orange-600">{data?.pendingTasks || 0}</p>
          <p className="text-sm text-gray-600">대기 작업</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg relative">
          <p className="text-2xl font-bold text-green-600">{unreadCount}</p>
          <p className="text-sm text-gray-600">새 알림</p>
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              !
            </span>
          )}
        </div>
      </div>

      {/* Critical/High Priority Alerts */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className="space-y-2">
          {aiContext?.recentHighPriority?.slice(0, 2).map((notification) => (
            <div
              key={notification.id}
              className={`p-2 rounded-lg border flex items-start gap-2 ${PRIORITY_COLORS[notification.priority]}`}
            >
              {notification.priority === 'critical' ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{notification.title}</p>
                <p className="text-xs opacity-75 truncate">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Required Summary */}
      {actionRequiredCount > 0 && (
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700">
              <strong>{actionRequiredCount}</strong>건의 처리가 필요합니다
            </p>
          </div>
        </div>
      )}

      {/* AI Summary Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI 요약
          </div>
          {!aiSummary && (
            <button
              onClick={loadAISummary}
              disabled={isLoadingAI}
              className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
              {isLoadingAI ? '생성 중...' : '요약 보기'}
            </button>
          )}
        </div>

        {aiSummary ? (
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSummary}</p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500">
              AI 요약 버튼을 클릭하면 오늘의 상태를 요약해드립니다.
            </p>
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}</span>
      </div>
    </div>
  );
};

export default OverviewCard;
