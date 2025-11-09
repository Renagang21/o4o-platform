/**
 * P1 Phase C: Widget Base Component
 *
 * Base wrapper for all widgets with consistent styling and behavior.
 */

import { FC, ReactNode } from 'react';
import { RefreshCw, X, MoreVertical } from 'lucide-react';
import type { DashboardWidgetConfig } from '@o4o/types';

export interface WidgetBaseProps {
  /** Widget configuration */
  config: DashboardWidgetConfig;

  /** Widget content */
  children: ReactNode;

  /** Is refreshing */
  isRefreshing?: boolean;

  /** Refresh callback */
  onRefresh?: () => void;

  /** Hide callback */
  onHide?: () => void;

  /** Custom header actions */
  headerActions?: ReactNode;

  /** Show menu button */
  showMenu?: boolean;
}

/**
 * Widget Base Component
 *
 * Provides consistent header, styling, and actions for all widgets
 */
export const WidgetBase: FC<WidgetBaseProps> = ({
  config,
  children,
  isRefreshing = false,
  onRefresh,
  onHide,
  headerActions,
  showMenu = true,
}) => {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-full',
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${sizeClasses[config.size || 'medium']}`}>
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900">{config.title}</h3>
          {config.description && (
            <span className="text-xs text-gray-500">· {config.description}</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* Custom header actions */}
          {headerActions}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Menu button */}
          {showMenu && (
            <div className="relative">
              <button
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 transition-colors"
                title="메뉴"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hide button */}
          {config.userConfigurable && onHide && (
            <button
              onClick={onHide}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50 transition-colors"
              title="숨기기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4">{children}</div>
    </div>
  );
};
