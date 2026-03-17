/**
 * API Error Handler Hook
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Usage:
 *   const { handleError } = useApiErrorHandler();
 *   try { await api.post(...); toast.success('저장되었습니다.'); }
 *   catch (e) { handleError(e); }
 *
 * With custom auth handling:
 *   const { handleError } = useApiErrorHandler({
 *     onAuthError: () => navigate('/login'),
 *   });
 */

import { toast } from './useToast.js';
import { parseApiError } from '../parse-api-error.js';
import type { ParsedApiError } from '../types.js';

export interface UseApiErrorHandlerOptions {
  /** Called when 401 is detected (after toast) */
  onAuthError?: (parsed: ParsedApiError) => void;
  /** Called when 403 is detected */
  onForbidden?: (parsed: ParsedApiError) => void;
  /** Suppress toast (for custom UI error display) */
  silent?: boolean;
}

export function useApiErrorHandler(options?: UseApiErrorHandlerOptions) {
  const handleError = (error: unknown, context?: string): ParsedApiError => {
    const parsed = parseApiError(error);

    if (import.meta.env?.DEV) {
      console.error(`[API Error]${context ? ` ${context}` : ''}:`, parsed);
    }

    if (parsed.isAuthError) {
      if (!options?.silent) toast.error(parsed.userMessage);
      options?.onAuthError?.(parsed);
      return parsed;
    }

    if (parsed.isForbidden) {
      if (!options?.silent) toast.error(parsed.userMessage);
      options?.onForbidden?.(parsed);
      return parsed;
    }

    if (!options?.silent) {
      toast.error(parsed.userMessage);
    }

    return parsed;
  };

  return { handleError, parseApiError };
}
