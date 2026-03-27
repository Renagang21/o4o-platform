/**
 * @deprecated WO-O4O-MIDDLEWARE-CONSOLIDATION-V1
 * 표준: common/middleware/validation.middleware.ts (class-validator/DTO)
 * 이 파일은 0 importers — Phase 5 제거 대상.
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateDto = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  next();
};