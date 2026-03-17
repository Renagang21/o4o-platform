/**
 * Normalized API Error Type
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Output of parseApiError(). Works regardless of whether the original error
 * came from Axios (@o4o/auth-client) or fetch (kpa-society ApiClient).
 */

export interface ParsedApiError {
  /** HTTP status code (0 if network error) */
  status: number;
  /** Machine-readable error code from backend */
  code: string | null;
  /** Raw error message from backend */
  message: string;
  /** User-friendly Korean message */
  userMessage: string;
  /** Whether this is an auth error requiring login redirect */
  isAuthError: boolean;
  /** Whether this is a permission error */
  isForbidden: boolean;
  /** Whether this is a network/connectivity error */
  isNetworkError: boolean;
  /** Original error object for logging */
  original: unknown;
}
