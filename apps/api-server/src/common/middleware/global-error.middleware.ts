/**
 * Global Error Handler Middleware
 *
 * WO-O4O-GLOBAL-ERROR-HANDLER-ENABLEMENT-V1
 * WO-O4O-ERROR-CODE-STANDARDIZATION-V1 — resolveErrorCode 매핑 추가
 *
 * Express 4-param error middleware — 모든 라우트 이후, listen 이전에 등록.
 * asyncHandler로 감싸지 않은 라우트의 최종 안전망.
 * 기존 코드 변경 없음 — 추가만.
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { AppError } from '../errors/app-error.js';

/**
 * HTTP status → error code 자동 매핑.
 * err.errorCode가 이미 있으면 그대로 사용 (기존 AppError 호환).
 */
function resolveErrorCode(err: any): string {
  if (err?.errorCode) return err.errorCode;

  switch (err?.statusCode || err?.status) {
    case 400: return ERROR_CODES.BAD_REQUEST;
    case 401: return ERROR_CODES.UNAUTHORIZED;
    case 403: return ERROR_CODES.FORBIDDEN;
    case 404: return ERROR_CODES.NOT_FOUND;
    case 409: return ERROR_CODES.CONFLICT;
    default:  return ERROR_CODES.INTERNAL_ERROR;
  }
}

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // 이미 응답이 나간 경우 → Express 기본 처리로 위임
    if (res.headersSent) {
      return next(err);
    }

    logger.error('[GlobalErrorHandler]', {
      path: req.originalUrl,
      method: req.method,
      message: err?.message,
      stack: err?.stack,
    });

    const isAppError = err instanceof AppError;
    const statusCode = isAppError
      ? err.statusCode
      : (err?.statusCode || err?.status || 500);
    const message = err?.message || 'Internal Server Error';

    return res.status(statusCode).json({
      success: false,
      error: {
        code: resolveErrorCode(err),
        message,
        ...(isAppError && err.details ? { details: err.details } : {}),
      },
    });
  } catch (handlerError) {
    // 이 블록은 절대 죽으면 안 됨
    logger.error('[GlobalErrorHandler-FATAL]', handlerError);

    return res.status(500).json({
      success: false,
      error: {
        code: 'FATAL_ERROR',
        message: 'Unexpected error occurred',
      },
    });
  }
}
