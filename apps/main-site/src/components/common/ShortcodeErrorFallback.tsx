/**
 * Shortcode Error Fallback Component
 * HP-2: Shortcode Error Boundary
 *
 * Displays a user-friendly error message when a shortcode fails to render.
 * Shows detailed debug information in development mode.
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ShortcodeErrorFallbackProps {
  /**
   * Name of the shortcode that failed
   */
  shortcodeName: string;

  /**
   * Error object (optional)
   */
  error?: Error;

  /**
   * Additional context information (optional)
   */
  context?: string;
}

/**
 * ShortcodeErrorFallback Component
 *
 * Renders a visual error indicator when a shortcode fails.
 * - Production: Minimal user-friendly message
 * - Development: Includes error details and stack trace
 */
export const ShortcodeErrorFallback: React.FC<ShortcodeErrorFallbackProps> = ({
  shortcodeName,
  error,
  context,
}) => {
  const isDev = import.meta.env.DEV;

  return (
    <div
      className="border-2 border-red-300 bg-red-50 text-red-800 rounded-lg p-4 my-3"
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
        <div className="flex-1">
          <div className="font-semibold text-sm">
            이 블록을 표시하는 중 오류가 발생했습니다.
          </div>
          <div className="text-xs text-red-700 mt-1">
            문제 영역: <code className="bg-red-100 px-1.5 py-0.5 rounded">[{shortcodeName}]</code>
          </div>
        </div>
      </div>

      {/* Context (if provided) */}
      {context && (
        <div className="text-xs text-red-700 mt-2 pl-7">
          {context}
        </div>
      )}

      {/* Development-only error details */}
      {isDev && error && (
        <details className="mt-3 pl-7">
          <summary className="cursor-pointer text-xs text-red-700 hover:text-red-900 underline font-medium">
            🔧 개발자용 상세 오류 정보
          </summary>
          <div className="mt-2 p-3 bg-red-100 rounded border border-red-200 text-xs">
            <div className="font-mono text-red-900 mb-2">
              <strong>Error Message:</strong>
              <br />
              {error.message}
            </div>
            {error.stack && (
              <div className="font-mono text-red-800 text-[10px] whitespace-pre-wrap overflow-auto max-h-40">
                <strong>Stack Trace:</strong>
                <br />
                {error.stack}
              </div>
            )}
          </div>
        </details>
      )}

      {/* Production-only user guidance */}
      {!isDev && (
        <div className="text-xs text-red-700 mt-2 pl-7">
          페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </div>
      )}
    </div>
  );
};
