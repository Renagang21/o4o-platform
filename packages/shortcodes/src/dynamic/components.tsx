/**
 * Shared UI Components for Dynamic Shortcodes
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'small', 
  className = '',
  text = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return (
    <div className={`shortcode-loading inline-flex items-center gap-2 ${className}`}>
      <svg 
        className={`animate-spin ${sizeClasses[size]}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
};

interface ErrorMessageProps {
  error: string | Error;
  fallback?: React.ReactNode;
  showDetails?: boolean;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error, 
  fallback,
  showDetails = false,
  className = ''
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={`shortcode-error inline-flex items-center gap-2 text-red-600 ${className}`}>
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      {showDetails ? (
        <span className="text-sm">{errorMessage}</span>
      ) : (
        <span className="text-sm">Failed to load content</span>
      )}
    </div>
  );
};

interface PlaceholderProps {
  type: 'text' | 'image' | 'list' | 'card';
  lines?: number;
  className?: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ 
  type, 
  lines = 3,
  className = ''
}) => {
  switch (type) {
    case 'text':
      return (
        <div className={`shortcode-placeholder animate-pulse ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <div 
              key={i} 
              className="h-4 bg-gray-200 rounded mb-2"
              style={{ width: i === lines - 1 ? '60%' : '100%' }}
            />
          ))}
        </div>
      );

    case 'image':
      return (
        <div className={`shortcode-placeholder animate-pulse ${className}`}>
          <div className="w-full h-48 bg-gray-200 rounded" />
        </div>
      );

    case 'list':
      return (
        <div className={`shortcode-placeholder animate-pulse ${className}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={`shortcode-placeholder animate-pulse ${className}`}>
          <div className="border rounded-lg p-4">
            <div className="h-32 bg-gray-200 rounded mb-3" />
            <div className="h-5 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      );

    default:
      return null;
  }
};

/**
 * Wrapper component with error boundary
 */
interface ShortcodeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export class ShortcodeErrorBoundary extends React.Component<
  ShortcodeWrapperProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ShortcodeWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Shortcode Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorMessage 
            error={this.state.error || 'Unknown error'} 
            showDetails={false}
          />
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for managing loading states with timeout
 */
export function useLoadingState(
  initialLoading = true,
  timeout = 10000
): {
  loading: boolean;
  timedOut: boolean;
  setLoading: (loading: boolean) => void;
} {
  const [loading, setLoading] = React.useState(initialLoading);
  const [timedOut, setTimedOut] = React.useState(false);
  const timeoutRef = React.useRef<any>(undefined);

  React.useEffect(() => {
    if (loading) {
      timeoutRef.current = window.setTimeout(() => {
        setTimedOut(true);
        setLoading(false);
      }, timeout);
    } else {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setTimedOut(false);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, timeout]);

  return { loading, timedOut, setLoading };
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return then.toLocaleDateString('ko-KR');
  } else if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return '방금 전';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}