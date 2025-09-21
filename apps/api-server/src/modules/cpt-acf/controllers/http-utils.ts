import type { Response } from 'express';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../errors';

export function sendError(res: Response, err: any) {
  if (err instanceof ValidationError) {
    return res.status(400).json({ success: false, message: err.message, details: err.details });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ success: false, message: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ success: false, message: err.message });
  }
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ success: false, message: err.message });
  }
  const msg = typeof err?.message === 'string' ? err.message : 'Internal Server Error';
  return res.status(500).json({ success: false, message: msg });
}

