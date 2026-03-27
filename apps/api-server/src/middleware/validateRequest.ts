/**
 * @deprecated WO-O4O-MIDDLEWARE-CONSOLIDATION-V1
 * 표준: common/middleware/validation.middleware.ts (class-validator/DTO)
 * 이 파일은 0 importers — Phase 5 제거 대상.
 *
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  
  next();
}