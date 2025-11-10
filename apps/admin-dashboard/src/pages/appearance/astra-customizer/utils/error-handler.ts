/**
 * Error Handler Utility for Customizer
 * Centralized error handling and logging
 */

import toast from 'react-hot-toast';

export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface CustomizerError {
  level: ErrorLevel;
  message: string;
  context?: string;
  originalError?: Error | unknown;
  timestamp: string;
}

class CustomizerErrorHandler {
  private errors: CustomizerError[] = [];
  private maxErrors = 50; // Keep last 50 errors

  /**
   * Log an error
   */
  log(
    message: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    context?: string,
    originalError?: Error | unknown
  ): void {
    const error: CustomizerError = {
      level,
      message,
      context,
      originalError,
      timestamp: new Date().toISOString(),
    };

    this.errors.push(error);

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Console logging
    const logMessage = `[Customizer${context ? ` - ${context}` : ''}] ${message}`;

    switch (level) {
      case ErrorLevel.INFO:
        console.info(logMessage, originalError);
        break;
      case ErrorLevel.WARNING:
        console.warn(logMessage, originalError);
        break;
      case ErrorLevel.ERROR:
        console.error(logMessage, originalError);
        break;
      case ErrorLevel.CRITICAL:
        console.error('[CRITICAL]', logMessage, originalError);
        break;
    }

    // Show toast for user-facing errors
    if (level === ErrorLevel.ERROR || level === ErrorLevel.CRITICAL) {
      toast.error(message);
    } else if (level === ErrorLevel.WARNING) {
      toast(message, { icon: '⚠️' });
    }
  }

  /**
   * Get all logged errors
   */
  getErrors(): CustomizerError[] {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Handle API errors
   */
  handleApiError(error: any, context: string): void {
    const statusCode = error?.response?.status;
    const errorCode = error?.response?.data?.code;
    const errorMessage = error?.response?.data?.message;
    const errorDetails = error?.response?.data?.details;

    let message = '오류가 발생했습니다.';
    let level = ErrorLevel.ERROR;

    if (statusCode === 401) {
      message = '인증이 필요합니다. 다시 로그인해주세요.';
      level = ErrorLevel.WARNING;
    } else if (statusCode === 403) {
      message = '권한이 없습니다.';
      level = ErrorLevel.WARNING;
    } else if (statusCode === 404) {
      message = '요청한 리소스를 찾을 수 없습니다.';
      level = ErrorLevel.WARNING;
    } else if (statusCode >= 500) {
      message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      level = ErrorLevel.CRITICAL;
    } else if (errorMessage) {
      message = errorMessage;
      // Add error details to message if available
      if (errorDetails) {
        message += ` (${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)})`;
      }
    } else if (error?.message) {
      // If no API error message, use generic error message
      message = `오류가 발생했습니다: ${error.message}`;
    }

    // Enhanced logging with full error object
    console.error(`[Customizer - ${context}] Full error details:`, {
      statusCode,
      errorCode,
      errorMessage,
      errorDetails,
      fullError: error
    });

    this.log(message, level, context, error);
  }

  /**
   * Handle preview errors
   */
  handlePreviewError(error: any, operation: string): void {
    let message = `Preview ${operation} 중 오류가 발생했습니다.`;

    if (error instanceof Error) {
      message += ` (${error.message})`;
    }

    this.log(message, ErrorLevel.WARNING, 'Preview', error);
  }

  /**
   * Handle settings errors
   */
  handleSettingsError(error: any, operation: 'load' | 'save'): void {
    const message =
      operation === 'load'
        ? '설정을 불러오는 중 오류가 발생했습니다.'
        : '설정을 저장하는 중 오류가 발생했습니다.';

    this.log(message, ErrorLevel.ERROR, 'Settings', error);
  }
}

// Export singleton instance
export const errorHandler = new CustomizerErrorHandler();

/**
 * Wrapper for async functions with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  onError?: (error: any) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    errorHandler.log('작업 실행 중 오류 발생', ErrorLevel.ERROR, context, error);

    if (onError) {
      onError(error);
    }

    return null;
  }
}

/**
 * Wrapper for sync functions with error handling
 */
export function withSyncErrorHandling<T>(
  fn: () => T,
  context: string,
  defaultValue: T,
  onError?: (error: any) => void
): T {
  try {
    return fn();
  } catch (error) {
    errorHandler.log('작업 실행 중 오류 발생', ErrorLevel.ERROR, context, error);

    if (onError) {
      onError(error);
    }

    return defaultValue;
  }
}
