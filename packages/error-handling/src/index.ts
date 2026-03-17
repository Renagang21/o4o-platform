/**
 * @o4o/error-handling
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Shared error handling utilities for O4O Platform web services.
 * Provides: parseApiError, ErrorBoundary, ToastProvider, error messages.
 */

// Types
export type { ParsedApiError } from './types.js';

// Error messages
export { ERROR_MESSAGES, getErrorMessage } from './error-messages.js';

// Core utility
export { parseApiError } from './parse-api-error.js';

// Components
export { O4OToastProvider } from './components/ToastProvider.js';
export { O4OErrorBoundary } from './components/ErrorBoundary.js';

// Hooks
export { useApiErrorHandler } from './hooks/useApiErrorHandler.js';
export type { UseApiErrorHandlerOptions } from './hooks/useApiErrorHandler.js';
export { useToast, toast } from './hooks/useToast.js';
