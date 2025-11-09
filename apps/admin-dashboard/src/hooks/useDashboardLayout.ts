/**
 * P1 Phase C: Dashboard Layout Hook
 *
 * Manages dashboard layout persistence (local storage first, server later).
 */

import { useState, useEffect, useCallback } from 'react';
import type { DashboardLayout } from '@o4o/types';

const LAYOUT_STORAGE_KEY = 'o4o_dashboard_layout';

export interface UseDashboardLayoutOptions {
  /** Role for this dashboard */
  role: 'supplier' | 'seller' | 'partner' | 'admin';

  /** Default layout */
  defaultLayout: DashboardLayout;
}

/**
 * Hook for managing dashboard layout
 */
export function useDashboardLayout(options: UseDashboardLayoutOptions) {
  const { role, defaultLayout } = options;
  const storageKey = `${LAYOUT_STORAGE_KEY}_${role}`;

  const [layout, setLayout] = useState<DashboardLayout>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultLayout, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load dashboard layout:', error);
    }
    return defaultLayout;
  });

  /**
   * Save layout to localStorage
   */
  const saveLayout = useCallback(
    (newLayout: Partial<DashboardLayout>) => {
      const updated = { ...layout, ...newLayout, updatedAt: new Date() };
      setLayout(updated);

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save dashboard layout:', error);
      }
    },
    [layout, storageKey]
  );

  /**
   * Reset layout to default
   */
  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
    }
  }, [defaultLayout, storageKey]);

  /**
   * Hide a widget
   */
  const hideWidget = useCallback(
    (widgetId: string) => {
      const hiddenWidgetIds = [...(layout.hiddenWidgetIds || []), widgetId];
      saveLayout({ hiddenWidgetIds });
    },
    [layout, saveLayout]
  );

  /**
   * Show a widget
   */
  const showWidget = useCallback(
    (widgetId: string) => {
      const hiddenWidgetIds = (layout.hiddenWidgetIds || []).filter((id) => id !== widgetId);
      saveLayout({ hiddenWidgetIds });
    },
    [layout, saveLayout]
  );

  /**
   * Check if widget is hidden
   */
  const isWidgetHidden = useCallback(
    (widgetId: string) => {
      return layout.hiddenWidgetIds?.includes(widgetId) || false;
    },
    [layout]
  );

  /**
   * Reorder widgets
   */
  const reorderWidgets = useCallback(
    (widgetIds: string[]) => {
      saveLayout({ widgetIds });
    },
    [saveLayout]
  );

  return {
    layout,
    saveLayout,
    resetLayout,
    hideWidget,
    showWidget,
    isWidgetHidden,
    reorderWidgets,
  };
}
