/**
 * Global Error Handler Middleware
 *
 * WO-O4O-GLOBAL-ERROR-HANDLER-ENABLEMENT-V1
 *
 * Express 4-param error middleware — 모든 라우트 이후, listen 이전에 등록.
 * asyncHandler로 감싸지 않은 라우트의 최종 안전망.
 * 기존 코드 변경 없음 — 추가만.
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';

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

    const statusCode = err?.statusCode || err?.status || 500;
    const message = err?.message || 'Internal Server Error';

    return res.status(statusCode).json({
      success: false,
      error: {
        code: err?.errorCode || 'INTERNAL_ERROR',
        message,
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
