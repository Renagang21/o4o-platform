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

    // WO-O4O-POST-LEGACY-RESIDUE-AND-ENVIRONMENT-CLEANUP-V1:
    //   `import.meta.env` 는 Vite 전용 확장이라 vite/client 타입이 없는 소비 패키지
    //   (@o4o/operator-core-ui 등)에서 TS2339 로 깨진다. 공용 패키지는 번들러 환경을
    //   전제하지 않아야 하므로 ambient shim 대신 지역 캐스팅으로 좁힌다.
    const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;

    if (isDev) {
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
