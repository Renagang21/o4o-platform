import type { RequestHandler, Response } from 'express';

const retiredKeys = new Set(['pharmacy-hub', 'pharmacy-hub-event-offer']);
const scopeFields = ['serviceKey', 'service_key', 'serviceCode', 'service_code', 'sourceService',
  'membershipServiceKey', 'membershipRole', 'targetServiceKey', 'sourceServiceKey', 'serviceKeys', 'service_keys', 'role', 'roles'] as const;
export function isRetiredServiceValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isRetiredServiceValue);
  if (typeof value !== 'string') return false;
  const key = value.trim();
  return retiredKeys.has(key) || key.startsWith('pharmacy-hub:');
}

export class RetiredServiceError extends Error {
  readonly code = 'SERVICE_RETIRED';
  readonly httpStatus = 410;
  constructor() { super('Service has been retired'); }
}
export function sendRetiredServiceError(res: Response, error: unknown): boolean {
  if (!(error instanceof RetiredServiceError)) return false;
  res.status(error.httpStatus).json({success:false,code:error.code,error:error.message});
  return true;
}

/** Fail closed before removed keys can become a service-neutral API request. */
export const rejectRetiredService: RequestHandler = (req, res, next) => {
  const pathHasRetiredKey = req.path.split('/').some(part => {
    try { return isRetiredServiceValue(decodeURIComponent(part)); } catch { return false; }
  });
  if (pathHasRetiredKey || scopeFields.some(key => isRetiredServiceValue(req.query[key]) || isRetiredServiceValue(req.body?.[key]))) {
    res.status(410).json({ success: false, code: 'SERVICE_RETIRED' });
    return;
  }
  next();
};
