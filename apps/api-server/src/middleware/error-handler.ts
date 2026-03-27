/**
 * Error Handler Middleware — Legacy Shim
 *
 * WO-O4O-MIDDLEWARE-CONSOLIDATION-V1
 * 표준 구현: errorHandler.middleware.ts
 * 이 파일은 29+ importers 호환을 위한 re-export 레이어.
 *
 * asyncHandler → 표준 re-export
 * errorHandler, notFoundHandler → 레거시 (사용처 0, Phase 5 제거 대상)
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { env } from '../utils/env-validator.js';
import logger from '../utils/logger.js';

// WO-O4O-MIDDLEWARE-CONSOLIDATION-V1: 표준 구현 re-export (29 importers)
export { asyncHandler } from './errorHandler.middleware.js';

/** @deprecated WO-O4O-MIDDLEWARE-CONSOLIDATION-V1 — use errorHandler from errorHandler.middleware.ts */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip,
  });

  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  }
  else if ((error as any).array && typeof (error as any).array === 'function') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = (error as any).array();
  }
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  else if (error.name === 'EntityNotFoundError') {
    statusCode = 404;
    message = 'Entity not found';
    code = 'ENTITY_NOT_FOUND';
  } else if (error.name === 'QueryFailedError') {
    statusCode = 500;
    message = 'Database query failed';
    code = 'QUERY_FAILED';
    if (env.isDevelopment()) {
      details = error.message;
    }
  }

  const response: any = {
    success: false,
    error: message,
    code,
  };

  if (env.isDevelopment() && details) {
    response.details = details;
  }

  if (env.isDevelopment() && error.stack) {
    response.stack = error.stack.split('\n');
  }

  res.status(statusCode).json(response);
}

/** @deprecated WO-O4O-MIDDLEWARE-CONSOLIDATION-V1 — use notFoundHandler from errorHandler.middleware.ts */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
  });
}