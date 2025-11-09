/**
 * P1 Phase C: Widget Data Hook
 *
 * Manages widget data loading, refresh, and state.
 */

import { useState, useEffect, useCallback } from 'react';
import type { DashboardWidgetDataState, DashboardWidgetConfig } from '@o4o/types';

export interface UseWidgetOptions<T> {
  /** Widget configuration */
  config: DashboardWidgetConfig;

  /** Data loader function */
  dataLoader: () => Promise<T>;

  /** Auto-refresh interval (in seconds, 0 = disabled) */
  refreshInterval?: number;

  /** Enable auto-refresh */
  enableAutoRefresh?: boolean;

  /** Data validator */
  validator?: (data: T) => boolean;

  /** On error callback */
  onError?: (error: Error) => void;
}

/**
 * Hook for managing widget data
 */
export function useWidget<T = any>(options: UseWidgetOptions<T>) {
  const {
    config,
    dataLoader,
    refreshInterval = config.refreshInterval || 0,
    enableAutoRefresh = false,
    validator,
    onError,
  } = options;

  const [dataState, setDataState] = useState<DashboardWidgetDataState<T>>({
    state: 'loading',
  });

  /**
   * Load widget data
   */
  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setDataState((prev) => ({ ...prev, isRefreshing: true }));
        } else {
          setDataState({ state: 'loading' });
        }

        const data = await dataLoader();

        // Validate data
        if (validator && !validator(data)) {
          throw new Error('Invalid data received');
        }

        // Check if empty
        const isEmpty = checkIfEmpty(data);

        setDataState({
          state: isEmpty ? 'empty' : 'ready',
          data,
          lastUpdated: new Date(),
          isRefreshing: false,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setDataState({
          state: 'error',
          error: {
            message: errorMessage,
            code: 'LOAD_ERROR',
          },
          isRefreshing: false,
        });

        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [dataLoader, validator, onError]
  );

  /**
   * Refresh widget data
   */
  const refresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (!enableAutoRefresh || refreshInterval === 0) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refreshInterval, refresh]);

  return {
    dataState,
    refresh,
    isLoading: dataState.state === 'loading',
    isRefreshing: dataState.isRefreshing || false,
    isError: dataState.state === 'error',
    isEmpty: dataState.state === 'empty',
    isReady: dataState.state === 'ready',
    data: dataState.data,
    error: dataState.error,
  };
}

/**
 * Check if data is empty
 */
function checkIfEmpty(data: any): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    if ('rows' in data && Array.isArray(data.rows)) {
      return data.rows.length === 0;
    }
    if ('items' in data && Array.isArray(data.items)) {
      return data.items.length === 0;
    }
    if ('value' in data) {
      return data.value === 0 || data.value === null || data.value === undefined;
    }
    return Object.keys(data).length === 0;
  }
  return false;
}
