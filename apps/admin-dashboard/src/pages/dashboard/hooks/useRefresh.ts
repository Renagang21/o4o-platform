/**
 * Refresh Management Hook
 * 새로고침 관리 훅 - 서버 부하 최소화를 위한 수동 제어
 */

import { useState, useCallback } from 'react';

interface UseRefreshReturn {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  refreshWithDelay: (refreshFn: () => Promise<void>) => Promise<void>;
  canRefresh: boolean;
}

export const useRefresh = (
  minInterval: number = 10000 // 최소 10초 간격
): UseRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // 새로고침 가능 여부 확인
  const canRefresh = !isRefreshing && (
    !lastRefreshTime || 
    Date.now() - lastRefreshTime.getTime() > minInterval
  );

  // 딜레이가 있는 새로고침 함수
  const refreshWithDelay = useCallback(async (refreshFn: () => Promise<void>) => {
    if (!canRefresh) {
      const timeLeft = lastRefreshTime 
        ? Math.ceil((minInterval - (Date.now() - lastRefreshTime.getTime())) / 1000)
        : 0;
      
      if (timeLeft > 0) {
    // Removed console.warn
        return;
      }
    }

    setIsRefreshing(true);
    
    try {
      // 최소 1초 딜레이 (사용자 경험 향상)
      const [, ] = await Promise.all([
        refreshFn(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      setLastRefreshTime(new Date());
    } catch (error: any) {
    // Error logging - use proper error handler
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [canRefresh, lastRefreshTime, minInterval]);

  return {
    isRefreshing,
    lastRefreshTime,
    refreshWithDelay,
    canRefresh
  };
};