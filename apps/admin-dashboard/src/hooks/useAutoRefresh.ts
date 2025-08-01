import { useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onRefresh: () => void | Promise<void>;
}

/**
 * Hook for auto-refreshing data at specified intervals
 * Perfect for keeping Loop blocks in sync
 */
export function useAutoRefresh({
  enabled = true,
  interval = 30000, // 30 seconds default
  onRefresh
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoRefresh = useCallback(() => {
    if (!enabled) return;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set new interval
    intervalRef.current = setInterval(() => {
      onRefresh();
    }, interval);
  }, [enabled, interval, onRefresh]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const manualRefresh = useCallback(() => {
    onRefresh();
    // Reset interval after manual refresh
    startAutoRefresh();
  }, [onRefresh, startAutoRefresh]);

  useEffect(() => {
    startAutoRefresh();
    return stopAutoRefresh;
  }, [startAutoRefresh, stopAutoRefresh]);

  return {
    manualRefresh,
    stopAutoRefresh,
    startAutoRefresh
  };
}