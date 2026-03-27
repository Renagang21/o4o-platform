/**
 * Middleware barrel file
 * WO-O4O-MIDDLEWARE-CONSOLIDATION-V1: 표준 middleware만 re-export
 *
 * 표준:
 *   Error Handler  → errorHandler.middleware.ts
 *   Validation     → common/middleware/validation.middleware.ts
 *   Deprecation    → deprecation.middleware.ts
 *   Cache          → infrastructure/cache.service.ts, cache/read-cache.ts (서비스 레이어)
 */

// 표준 error handler (global handler + asyncHandler + AppError)
export * from './errorHandler.middleware.js';

// Active middleware (non-deprecated)
export * from './performanceMonitor.js';
export * from './rateLimiter.js';
export * from './securityMiddleware.js';

// Role-based access control
export * from './signage-role.middleware.js';