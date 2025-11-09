/**
 * P1 Phase C: Standard Widget States
 *
 * Provides consistent loading, error, and empty states for all widgets.
 */

import { FC } from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

/**
 * Widget Loading State
 */
export const WidgetLoading: FC<{ message?: string }> = ({ message = '로딩 중...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

/**
 * Widget Error State
 */
export interface WidgetErrorProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
}

export const WidgetError: FC<WidgetErrorProps> = ({
  message = '데이터를 불러올 수 없습니다',
  details,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-red-50 p-3 mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{message}</h3>
      {details && <p className="text-xs text-gray-500 mb-4">{details}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          다시 시도
        </button>
      )}
    </div>
  );
};

/**
 * Widget Empty State
 */
export interface WidgetEmptyProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const WidgetEmpty: FC<WidgetEmptyProps> = ({
  message = '데이터가 없습니다',
  description,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-gray-50 p-3 mb-4">
        {icon || <Inbox className="w-8 h-8 text-gray-400" />}
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">{message}</h3>
      {description && <p className="text-xs text-gray-500 mb-4 text-center max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

/**
 * Widget Container with State Handling
 */
export interface WidgetContainerProps {
  state: 'loading' | 'error' | 'empty' | 'ready';
  error?: { message: string; details?: string };
  emptyMessage?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const WidgetContainer: FC<WidgetContainerProps> = ({
  state,
  error,
  emptyMessage,
  emptyDescription,
  onRetry,
  children,
}) => {
  if (state === 'loading') {
    return <WidgetLoading />;
  }

  if (state === 'error') {
    return (
      <WidgetError
        message={error?.message}
        details={error?.details}
        onRetry={onRetry}
      />
    );
  }

  if (state === 'empty') {
    return (
      <WidgetEmpty
        message={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
};
