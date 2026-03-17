/**
 * Request Context — AsyncLocalStorage-based requestId propagation
 *
 * WO-O4O-STRUCTURED-LOGGING-IMPLEMENTATION-V1
 *
 * Provides request-scoped context (requestId, timing, etc.)
 * accessible anywhere in the call stack without passing req around.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  startTime: number;
  method?: string;
  path?: string;
  userId?: string;
  serviceKey?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage.
 * Returns undefined if called outside a request scope.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the current requestId, or 'no-request-context' if outside request scope.
 */
export function getRequestId(): string {
  return requestContextStorage.getStore()?.requestId ?? 'no-request-context';
}

/**
 * Generate a new requestId. Prefers incoming x-request-id header for tracing.
 */
export function generateRequestId(incomingId?: string): string {
  return incomingId || uuidv4();
}
