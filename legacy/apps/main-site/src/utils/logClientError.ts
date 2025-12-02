/**
 * Client-Side Error Logging Utility
 * HP-2: Shortcode Error Boundary
 *
 * Provides a centralized error logging mechanism for client-side errors.
 * Currently logs to console, with hook point for backend integration.
 */

export interface ClientErrorPayload {
  /**
   * Error type classification
   */
  type: 'SHORTCODE_ERROR' | 'GENERAL_ERROR';

  /**
   * Shortcode name (if applicable)
   */
  shortcodeName?: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error stack trace
   */
  stack?: string;

  /**
   * Component props at time of error
   */
  props?: Record<string, any>;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Log client-side error
 *
 * @param payload Error information to log
 *
 * @example
 * ```ts
 * logClientError({
 *   type: 'SHORTCODE_ERROR',
 *   shortcodeName: 'cart',
 *   message: error.message,
 *   stack: error.stack,
 *   props: { productId: 123 }
 * });
 * ```
 */
export async function logClientError(payload: ClientErrorPayload): Promise<void> {
  // Development mode: Detailed console logging
  if (import.meta.env.DEV) {
    console.group(`🔴 [ClientError] ${payload.type}`);
    console.error('Message:', payload.message);
    if (payload.shortcodeName) {
      console.error('Shortcode:', payload.shortcodeName);
    }
    if (payload.props) {
      console.error('Props:', payload.props);
    }
    if (payload.stack) {
      console.error('Stack:', payload.stack);
    }
    if (payload.metadata) {
      console.error('Metadata:', payload.metadata);
    }
    console.groupEnd();
    return; // Skip backend call in development
  }

  // Production mode: Minimal console log + backend call
  console.error(
    `[ClientError] ${payload.type}${payload.shortcodeName ? ` in [${payload.shortcodeName}]` : ''}: ${payload.message}`
  );

  // TODO: Backend integration point
  // Uncomment when /api/client-errors endpoint is ready
  /*
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    });
  } catch (e) {
    // Silently fail - don't let logging errors break the app
    console.warn('[logClientError] Failed to send error to backend:', e);
  }
  */
}
