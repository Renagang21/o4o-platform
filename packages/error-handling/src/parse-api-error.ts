/**
 * API Error Parser
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Normalizes BOTH AxiosError (4 services via @o4o/auth-client)
 * and fetch-based errors (kpa-society ApiClient) into ParsedApiError.
 */

import type { ParsedApiError } from './types.js';
import { getErrorMessage } from './error-messages.js';

// ─── Error Type Detection (duck-typing, no axios import) ────────────────────

function isAxiosError(error: unknown): error is {
  isAxiosError: true;
  response?: { status: number; data?: { error?: string; code?: string; message?: string } };
  code?: string;
  message: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/** KPA ApiClient: new Error(message) with .status and .code attached */
function isFetchApiError(error: unknown): error is Error & { status?: number; code?: string } {
  return error instanceof Error && ('status' in error || 'code' in error);
}

const NETWORK_ERROR_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED']);

// ─── Status-based Fallback Messages ─────────────────────────────────────────

function getStatusFallback(status: number): string | undefined {
  if (status >= 500) return getErrorMessage('INTERNAL_ERROR');
  if (status === 429) return getErrorMessage('RATE_LIMITED');
  if (status === 404) return getErrorMessage('NOT_FOUND');
  if (status === 403) return getErrorMessage('FORBIDDEN');
  if (status === 401) return getErrorMessage('AUTH_REQUIRED');
  if (status === 400) return getErrorMessage('BAD_REQUEST');
  return undefined;
}

// ─── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse any API error into a normalized ParsedApiError.
 *
 * Supports:
 * - AxiosError (from @o4o/auth-client)
 * - Fetch Error with .status/.code (from kpa-society ApiClient)
 * - Generic Error objects
 * - Unknown throw values
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Case 1: AxiosError
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const code = data?.code ?? null;
    const message = data?.error || data?.message || error.message;
    const isNetwork = !error.response || NETWORK_ERROR_CODES.has(error.code || '');

    return {
      status,
      code,
      message,
      userMessage: isNetwork
        ? getErrorMessage('NETWORK_ERROR')
        : getErrorMessage(code, getStatusFallback(status) || message),
      isAuthError: status === 401,
      isForbidden: status === 403,
      isNetworkError: isNetwork,
      original: error,
    };
  }

  // Case 2: Fetch API error (kpa-society style)
  if (isFetchApiError(error)) {
    const status = (error as any).status ?? 0;
    const code = (error as any).code ?? null;
    const message = error.message;

    return {
      status,
      code,
      message,
      userMessage: getErrorMessage(code, getStatusFallback(status) || message),
      isAuthError: status === 401,
      isForbidden: status === 403,
      isNetworkError: status === 0,
      original: error,
    };
  }

  // Case 3: Generic Error
  if (error instanceof Error) {
    return {
      status: 0,
      code: null,
      message: error.message,
      userMessage: getErrorMessage(null, error.message),
      isAuthError: false,
      isForbidden: false,
      isNetworkError: false,
      original: error,
    };
  }

  // Case 4: Unknown
  return {
    status: 0,
    code: null,
    message: String(error),
    userMessage: getErrorMessage('UNKNOWN'),
    isAuthError: false,
    isForbidden: false,
    isNetworkError: false,
    original: error,
  };
}
