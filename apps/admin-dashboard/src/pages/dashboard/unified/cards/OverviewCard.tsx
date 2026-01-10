/**
 * Overview Card with AI Summary
 * PoC: 오늘의 요약 + AI 요약
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import type { UnifiedCardProps } from '../types';

interface OverviewData {
  todayOrders: number;
  pendingTasks: number;
  notifications: number;
}

export const OverviewCard: React.FC<UnifiedCardProps> = ({ config, userContexts }) => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setIsLoading(true);
    try {
      // Mock data for PoC
      await new Promise((r) => setTimeout(r, 500));
      setData({
        todayOrders: Math.floor(Math.random() * 50) + 10,
        pendingTasks: Math.floor(Math.random() * 10) + 1,
        notifications: Math.floor(Math.random() * 5),
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
        },
      });

      if (response.data.success) {
        setAiSummary(response.data.answer);
      }
    } catch (err) {
      console.error('AI summary error:', err);
      // Fallback summary for PoC
      setAiSummary(
        `오늘 ${data?.todayOrders || 0}건의 주문이 있습니다. ${data?.pendingTasks || 0}건의 처리 대기 작업이 있으며, ${data?.notifications || 0}개의 새 알림이 있습니다.`
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{data?.notifications || 0}</p>
          <p className="text-sm text-gray-600">새 알림</p>
        </div>
      </div>

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
