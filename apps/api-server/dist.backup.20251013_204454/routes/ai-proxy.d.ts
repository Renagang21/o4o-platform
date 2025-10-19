/**
 * AI Proxy Routes
 * Sprint 2 - P1: Server-side LLM proxy
 *
 * Security:
 * - Authentication required (JWT)
 * - Rate limiting (per user)
 * - Request size limit (256KB)
 * - Model and parameter whitelist
 * - API keys never exposed to client
 *
 * Reliability:
 * - Timeout (15s default)
 * - Retry with exponential backoff
 * - Standardized error responses
 */
import { Router } from 'express';
declare const router: Router;
export default router;
//# sourceMappingURL=ai-proxy.d.ts.map